/**
 * Stripe billing Cloud Functions.
 *
 *  - `createCheckoutSession` (callable): start a subscription Checkout for the
 *    signed-in user and return the hosted-page URL (the app redirects to it).
 *  - `createBillingPortalSession` (callable): open the Stripe customer portal so
 *    a subscriber can manage/cancel.
 *  - `stripeWebhook` (HTTP): the ONLY writer of `users/{uid}.entitlement` — on
 *    Stripe events it derives the entitlement (see ./billing-core) and persists it
 *    via the Admin SDK. Clients can never write entitlement (firestore.rules).
 *
 * Config: secrets STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET; params
 * STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_PRO_ANNUAL / APP_ORIGIN. See docs/BILLING.md.
 */
import { onCall, onRequest, HttpsError } from "firebase-functions/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { entitlementFromSubscription, type PriceEnv } from "./billing-core.js";

if (getApps().length === 0) initializeApp();

const REGION = "me-central2";

const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const priceMonthly = defineString("STRIPE_PRICE_PRO_MONTHLY");
const priceAnnual = defineString("STRIPE_PRICE_PRO_ANNUAL");
const appOrigin = defineString("APP_ORIGIN");

function stripeClient(): Stripe {
  // Pin the API version so a Stripe-side default bump can't silently change the
  // webhook payload shape (and break entitlement derivation). Matches the version
  // the installed `stripe` SDK is generated against.
  return new Stripe(stripeSecret.value(), { apiVersion: "2025-02-24.acacia" });
}
function priceEnv(): PriceEnv {
  return { proMonthly: priceMonthly.value(), proAnnual: priceAnnual.value() };
}

/** The uid→Stripe-customer mapping doc (server-only; deny-all to clients). */
function customerRef(uid: string) {
  return getFirestore().collection("stripeCustomers").doc(uid);
}

/** Find or create the Stripe customer for a uid, persisting the mapping. */
async function ensureCustomer(stripe: Stripe, uid: string, email?: string): Promise<string> {
  const snap = await customerRef(uid).get();
  const existing = snap.exists ? (snap.data()?.customerId as string | undefined) : undefined;
  if (existing) return existing;
  const customer = await stripe.customers.create({ email, metadata: { uid } });
  await customerRef(uid).set({ customerId: customer.id, uid }, { merge: true });
  return customer.id;
}

/** Resolve the uid for a Stripe customer via its stored metadata. */
async function uidForCustomer(stripe: Stripe, customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer.metadata?.uid as string | undefined) ?? null;
}

/** Persist the entitlement derived from a subscription onto users/{uid}. */
async function writeEntitlement(uid: string, sub: Stripe.Subscription): Promise<void> {
  const priceId = sub.items.data[0]?.price?.id;
  const entitlement = entitlementFromSubscription({
    status: sub.status,
    priceId,
    currentPeriodEnd: sub.current_period_end,
    env: priceEnv(),
  });
  await getFirestore().collection("users").doc(uid).set({ entitlement }, { merge: true });
}

export const createCheckoutSession = onCall(
  {
    region: REGION,
    secrets: [stripeSecret],
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5,
    // App Check on the payments surface. These Stripe callables are web-only (the
    // native shell uses store IAP, not Stripe Checkout), and the web app mints
    // reCAPTCHA-Enterprise App Check tokens, so a stolen/automated ID token alone
    // can't drive Stripe from outside the app. Requires the App Check provider to
    // be registered + enforced in the Firebase console and
    // VITE_RECAPTCHA_ENTERPRISE_SITE_KEY set in the deployed build.
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");
    const stripe = stripeClient();
    const plan = request.data?.plan === "monthly" ? "monthly" : "annual";
    const price = plan === "monthly" ? priceMonthly.value() : priceAnnual.value();
    const origin = appOrigin.value();
    const customer = await ensureCustomer(stripe, uid, request.auth?.token?.email as string | undefined);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: uid,
      allow_promotion_codes: true,
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
    });
    return { url: session.url };
  },
);

export const createBillingPortalSession = onCall(
  {
    region: REGION,
    secrets: [stripeSecret],
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5,
    // App Check on the payments surface. These Stripe callables are web-only (the
    // native shell uses store IAP, not Stripe Checkout), and the web app mints
    // reCAPTCHA-Enterprise App Check tokens, so a stolen/automated ID token alone
    // can't drive Stripe from outside the app. Requires the App Check provider to
    // be registered + enforced in the Firebase console and
    // VITE_RECAPTCHA_ENTERPRISE_SITE_KEY set in the deployed build.
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");
    const snap = await customerRef(uid).get();
    const customer = snap.exists ? (snap.data()?.customerId as string | undefined) : undefined;
    if (!customer) throw new HttpsError("failed-precondition", "no-subscription");
    const session = await stripeClient().billingPortal.sessions.create({
      customer,
      return_url: `${appOrigin.value()}/account`,
    });
    return { url: session.url };
  },
);

export const stripeWebhook = onRequest(
  { region: REGION, secrets: [stripeSecret, webhookSecret], timeoutSeconds: 30, memory: "256MiB", maxInstances: 5 },
  async (req, res) => {
    const stripe = stripeClient();
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig as string, webhookSecret.value());
    } catch {
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    // Idempotency: Stripe delivers at-least-once and retries on 5xx, so claim each
    // event id exactly once. `create()` fails if the marker already exists (a
    // duplicate/replay) — ack and skip. `stripeEvents` is server-only (firestore.rules
    // default-deny). On a handler failure below we delete the marker so the retry
    // can reprocess.
    const eventRef = getFirestore().collection("stripeEvents").doc(event.id);
    try {
      await eventRef.create({ type: event.type, receivedAt: FieldValue.serverTimestamp() });
    } catch {
      res.json({ received: true, duplicate: true });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.client_reference_id;
        if (uid && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await writeEntitlement(uid, sub);
        }
      } else if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const sub = event.data.object;
        const uid = await uidForCustomer(stripe, sub.customer as string);
        if (uid) await writeEntitlement(uid, sub);
      }
    } catch {
      // Roll back the idempotency claim so Stripe's retry can reprocess, then
      // surface a 500 to trigger that retry rather than dropping the event.
      await eventRef.delete().catch(() => {});
      res.status(500).send("Webhook handler error");
      return;
    }
    res.json({ received: true });
  },
);
