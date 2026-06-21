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
import { getFirestore } from "firebase-admin/firestore";
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
  return new Stripe(stripeSecret.value());
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
  { region: REGION, secrets: [stripeSecret] },
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
  { region: REGION, secrets: [stripeSecret] },
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
  { region: REGION, secrets: [stripeSecret, webhookSecret] },
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
      // Surface a 500 so Stripe retries rather than dropping the event.
      res.status(500).send("Webhook handler error");
      return;
    }
    res.json({ received: true });
  },
);
