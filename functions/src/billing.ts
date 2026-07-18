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
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import {
  entitlementFromSubscription,
  entitlementFromPass,
  type Entitlement,
  type PriceEnv,
} from "./billing-core.js";
import { CREDIT_PACK_SIZE } from "./chat-quota-core.js";
import { isStudentEmail } from "./student-core.js";
import {
  referralCode,
  normalizeCode,
  isValidCode,
  REFERRAL_REWARD_CREDITS,
} from "./referral-core.js";
import { REGION } from "./region.js";

if (getApps().length === 0) initializeApp();

const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const priceMonthly = defineString("STRIPE_PRICE_PRO_MONTHLY");
const priceAnnual = defineString("STRIPE_PRICE_PRO_ANNUAL");
// One-time Exam Season Pass price (Stripe `mode: payment`, not a subscription).
const pricePass = defineString("STRIPE_PRICE_PASS");
// One-time Captain Adel credit-pack price (also `mode: payment`).
const priceCredits = defineString("STRIPE_PRICE_CREDITS");
// Discounted student subscription prices (gated on a verified academic email).
const priceStudentMonthly = defineString("STRIPE_PRICE_STUDENT_MONTHLY");
const priceStudentAnnual = defineString("STRIPE_PRICE_STUDENT_ANNUAL");
const appOrigin = defineString("APP_ORIGIN");

function stripeClient(): Stripe {
  // Pin the API version so a Stripe-side default bump can't silently change the
  // webhook payload shape (and break entitlement derivation). Matches the version
  // the installed `stripe` SDK is generated against.
  return new Stripe(stripeSecret.value(), { apiVersion: "2025-02-24.acacia" } as any);
}
function priceEnv(): PriceEnv {
  return {
    proMonthly: priceMonthly.value(),
    proAnnual: priceAnnual.value(),
    studentMonthly: priceStudentMonthly.value(),
    studentAnnual: priceStudentAnnual.value(),
  };
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
    currentPeriodEnd: (sub as any).current_period_end ?? (sub as any).currentPeriodEnd,
    env: priceEnv(),
  });
  await getFirestore().collection("users").doc(uid).set({ entitlement }, { merge: true });
}

/**
 * Grant a one-time Exam Season Pass entitlement (PASS_DAYS of Pro). Reads the
 * current entitlement so the pass never shortens a later paid expiry or downgrades
 * an active school grant (see entitlementFromPass). Idempotent under the webhook's
 * per-event marker, so a Stripe retry can't stack extra days.
 */
async function grantPass(uid: string): Promise<void> {
  const ref = getFirestore().collection("users").doc(uid);
  const snap = await ref.get();
  const current = snap.exists ? (snap.data()?.entitlement as Entitlement | undefined) : undefined;
  const entitlement = entitlementFromPass(new Date(), current);
  await ref.set({ entitlement }, { merge: true });
  logger.info("funnel", { event: "pass_granted", uid });
}

/**
 * Top up a user's Captain Adel credit balance by one pack (`chatCredits/{uid}` —
 * server-written, owner-readable so the app can show/spend it). `FieldValue.increment`
 * is atomic; the webhook's per-event marker keeps a Stripe retry from double-counting.
 */
async function grantCredits(uid: string, amount: number): Promise<void> {
  await getFirestore()
    .collection("chatCredits")
    .doc(uid)
    .set({ balance: FieldValue.increment(amount) }, { merge: true });
}

async function addCredits(uid: string): Promise<void> {
  await grantCredits(uid, CREDIT_PACK_SIZE);
  logger.info("funnel", { event: "credits_purchased", uid });
}

/**
 * Reward a completed referral. `ref` is the normalized code carried on the checkout
 * session; resolve it to the referrer and, once per referee, credit BOTH sides. The
 * `referrals/{refereeUid}` marker (created transactionally via `create`) makes it
 * idempotent across a user's multiple purchases and blocks self-referral.
 */
async function processReferral(refereeUid: string, ref: string | undefined): Promise<void> {
  if (!ref || !isValidCode(ref)) return;
  const db = getFirestore();
  const codeSnap = await db.collection("referralCodes").doc(ref).get();
  const referrerUid = codeSnap.exists ? (codeSnap.data()?.uid as string | undefined) : undefined;
  if (!referrerUid || referrerUid === refereeUid) return; // unknown code or self-referral
  // Claim the one reward this referee is worth; `create` fails if it already exists.
  const claimed = await db
    .collection("referrals")
    .doc(refereeUid)
    .create({ referrerUid, at: FieldValue.serverTimestamp() })
    .then(() => true)
    .catch(() => false);
  if (!claimed) return;
  await grantCredits(referrerUid, REFERRAL_REWARD_CREDITS);
  await grantCredits(refereeUid, REFERRAL_REWARD_CREDITS);
  logger.info("funnel", { event: "referral_rewarded", referrerUid, refereeUid });
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
    const origin = appOrigin.value();
    const customer = await ensureCustomer(stripe, uid, request.auth?.token?.email as string | undefined);
    const variant = request.data?.plan;
    // Referral attribution: a valid code rides on the session metadata so the
    // webhook can reward both sides when this checkout converts.
    const ref = normalizeCode(request.data?.ref as string | undefined);
    const refMeta: Record<string, string> = isValidCode(ref) ? { ref } : {};

    // One-time purchases (`payment`, not `subscription`): the Exam Season Pass and
    // Captain Adel credit packs. The webhook fulfils them by `metadata.kind`, which
    // it needs because client_reference_id alone doesn't carry the intent.
    if (variant === "pass" || variant === "credits") {
      const price = variant === "pass" ? pricePass.value() : priceCredits.value();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer,
        line_items: [{ price, quantity: 1 }],
        client_reference_id: uid,
        metadata: { uid, kind: variant, ...refMeta },
        allow_promotion_codes: true,
        success_url: `${origin}/account?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancel`,
      });
      logger.info("funnel", { event: "checkout_started", kind: variant, uid });
      return { url: session.url };
    }

    // Discounted student subscription — gated server-side on a VERIFIED academic
    // email so the rate can't be self-claimed. Cadence follows the client toggle
    // (`data.annual`). Ineligible callers get a stable code the UI explains.
    if (variant === "student") {
      const email = request.auth?.token?.email as string | undefined;
      const emailVerified = request.auth?.token?.email_verified as boolean | undefined;
      if (!isStudentEmail(email, emailVerified)) {
        throw new HttpsError("failed-precondition", "student-verification-required");
      }
      const studentPrice = request.data?.annual
        ? priceStudentAnnual.value()
        : priceStudentMonthly.value();
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer,
        line_items: [{ price: studentPrice, quantity: 1 }],
        client_reference_id: uid,
        metadata: refMeta,
        allow_promotion_codes: true,
        success_url: `${origin}/account?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancel`,
      });
      logger.info("funnel", { event: "checkout_started", kind: "student", uid });
      return { url: session.url };
    }

    // Recurring Pro. `monthly` uses the monthly price; anything else (annual or an
    // unknown variant) falls back to the annual price.
    const price = variant === "monthly" ? priceMonthly.value() : priceAnnual.value();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: uid,
      metadata: refMeta,
      allow_promotion_codes: true,
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
    });
    logger.info("funnel", { event: "checkout_started", kind: variant ?? "annual", uid });
    return { url: session.url };
  },
);

export const getReferralCode = onCall(
  {
    region: REGION,
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 5,
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");
    const code = referralCode(uid);
    // Persist the reverse mapping (code → referrer) so the webhook can resolve a
    // referral at the referee's checkout. Deterministic + merge = idempotent.
    await getFirestore().collection("referralCodes").doc(code).set({ uid }, { merge: true });
    return { code };
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
        const uid = session.client_reference_id ?? (session.metadata?.uid as string | undefined);
        const ref = session.metadata?.ref as string | undefined;
        if (uid && session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await writeEntitlement(uid, sub);
          await processReferral(uid, ref);
        } else if (uid && session.mode === "payment" && session.payment_status === "paid") {
          const kind = session.metadata?.kind;
          if (kind === "pass") await grantPass(uid);
          else if (kind === "credits") await addCredits(uid);
          await processReferral(uid, ref);
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
