/**
 * Moyasar billing Cloud Functions.
 *
 *  - `createCheckoutConfig` (callable): validate + price a checkout (Pro/student
 *    cadence, the Exam Season Pass, a Captain Adel credit pack, or an exam-prep
 *    pack), persist a server-trusted `checkoutIntents/{id}` record, and return the
 *    config the client mounts Moyasar's hosted JS widget with. Card data never
 *    touches this server — the widget talks to Moyasar directly from the browser.
 *  - `confirmPayment` (callable): after the widget redirects back with a payment id,
 *    fetch the payment server-to-server (trusted — the browser could have tampered
 *    with the widget's amount/metadata before submitting) and fulfil it.
 *  - `cancelAutoRenew` (callable): turn off the token-renewal engine for a subscriber.
 *  - `moyasarWebhook` (HTTP): async backstop for the same fulfilment path — the
 *    idempotency marker on `moyasarPayments/{id}` means whichever of confirmPayment/
 *    the webhook lands first does the actual grant.
 *  - `renewMoyasarSubscriptions` (scheduled): Moyasar has no native subscription
 *    object, so a recurring plan is a saved card TOKEN re-charged daily near expiry,
 *    extending `entitlement.expiresAt` on success (see ./billing-core cadence math).
 *
 * `users/{uid}.entitlement` is written ONLY here (bypassing firestore.rules via the
 * Admin SDK) — see ./billing-core for the pure derivation. Config: secrets
 * MOYASAR_SECRET_KEY / MOYASAR_WEBHOOK_SECRET; params MOYASAR_PRICE_*_SAR /
 * APP_ORIGIN. See docs/BILLING.md.
 */
import { randomUUID } from "node:crypto";
import { onCall, onRequest, HttpsError } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/scheduler";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, type DocumentReference } from "firebase-admin/firestore";
import {
  amountForCheckout,
  cadenceDays,
  entitlementFromCheckout,
  entitlementFromPass,
  isRecurringKind,
  nextChargeAt,
  sellablePackId,
  verifyMoyasarSignature,
  MAX_RENEWAL_ATTEMPTS,
  type Cadence,
  type CheckoutKind,
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

const moyasarSecret = defineSecret("MOYASAR_SECRET_KEY");
const webhookSecret = defineSecret("MOYASAR_WEBHOOK_SECRET");
const appOrigin = defineString("APP_ORIGIN");
// SAR list prices (major units, e.g. "59" or "449.00") — see billing-core's PriceEnv.
const priceProMonthly = defineString("MOYASAR_PRICE_PRO_MONTHLY_SAR");
const priceProAnnual = defineString("MOYASAR_PRICE_PRO_ANNUAL_SAR");
const priceStudentMonthly = defineString("MOYASAR_PRICE_STUDENT_MONTHLY_SAR");
const priceStudentAnnual = defineString("MOYASAR_PRICE_STUDENT_ANNUAL_SAR");
const pricePass = defineString("MOYASAR_PRICE_PASS_SAR");
const priceCredits = defineString("MOYASAR_PRICE_CREDITS_SAR");
const pricePrepPack = defineString("MOYASAR_PRICE_PREP_PACK_SAR");

function priceEnv(): PriceEnv {
  return {
    proMonthly: priceProMonthly.value(),
    proAnnual: priceProAnnual.value(),
    studentMonthly: priceStudentMonthly.value(),
    studentAnnual: priceStudentAnnual.value(),
    pass: pricePass.value(),
    credits: priceCredits.value(),
    prepPack: pricePrepPack.value(),
  };
}

const CHECKOUT_KINDS = new Set<CheckoutKind>(["pro", "student", "pass", "credits", "pack"]);
function checkoutKind(v: unknown): CheckoutKind | null {
  return typeof v === "string" && CHECKOUT_KINDS.has(v as CheckoutKind) ? (v as CheckoutKind) : null;
}
function cadenceOf(v: unknown): Cadence {
  return v === "monthly" ? "monthly" : "annual";
}
function describeCheckout(kind: CheckoutKind, packId?: string): string {
  switch (kind) {
  case "pro":
    return "Fly GACA Pro";
  case "student":
    return "Fly GACA Pro (Student)";
  case "pass":
    return "Fly GACA Exam Season Pass";
  case "credits":
    return "Fly GACA Captain Adel credit pack";
  case "pack":
    return `Fly GACA Exam Prep Pack — ${packId ?? ""}`;
  }
}

// ---- Minimal Moyasar REST client (Node's global fetch; no SDK dependency) --------

const MOYASAR_API = "https://api.moyasar.com/v1";

interface MoyasarPayment {
  id: string;
  status: string; // 'paid' | 'failed' | 'authorized' | 'initiated' | ...
  amount: number; // halalas
  currency: string;
  metadata?: Record<string, unknown> | null;
  source?: {
    type?: string;
    token?: string;
    company?: string;
    last_four?: string;
  } | null;
}

function moyasarAuthHeader(secretKey: string): string {
  return "Basic " + Buffer.from(`${secretKey}:`).toString("base64");
}

async function moyasarGetPayment(secretKey: string, id: string): Promise<MoyasarPayment> {
  const res = await fetch(`${MOYASAR_API}/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: moyasarAuthHeader(secretKey) },
  });
  const body = (await res.json()) as MoyasarPayment;
  if (!res.ok) throw new Error(`moyasar-get-failed:${res.status}`);
  return body;
}

/** Charge a previously-saved card token off-session (the renewal engine). */
async function moyasarChargeToken(
  secretKey: string,
  input: {
    amount: number;
    currency: string;
    description: string;
    token: string;
    callbackUrl: string;
    metadata: Record<string, string>;
  },
): Promise<MoyasarPayment> {
  const res = await fetch(`${MOYASAR_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: moyasarAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      callback_url: input.callbackUrl,
      source: { type: "token", token: input.token },
      metadata: input.metadata,
    }),
  });
  const body = (await res.json()) as MoyasarPayment;
  if (!res.ok) throw new Error(`moyasar-charge-failed:${res.status}:${JSON.stringify(body)}`);
  return body;
}

// ---- Firestore helpers -------------------------------------------------------

async function writeEntitlement(uid: string, entitlement: Entitlement): Promise<void> {
  await getFirestore().collection("users").doc(uid).set({ entitlement }, { merge: true });
}

/**
 * Grant a one-time Exam Season Pass entitlement (PASS_DAYS of Pro). Reads the
 * current entitlement so the pass never shortens a later paid expiry or downgrades
 * an active school grant (see entitlementFromPass). Idempotent under the
 * moyasarPayments/{id} marker, so a retried confirmation can't stack extra days.
 */
async function grantPass(uid: string): Promise<void> {
  const ref = getFirestore().collection("users").doc(uid);
  const snap = await ref.get();
  const current = snap.exists ? (snap.data()?.entitlement as Entitlement | undefined) : undefined;
  const entitlement = entitlementFromPass(new Date(), current);
  await ref.set({ entitlement }, { merge: true });
  logger.info("funnel", { event: "pass_granted", uid });
}

/** Top up a user's Captain Adel credit balance by one pack. */
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
 * Record ownership of a one-time exam-prep pack purchase. Re-validates `packId`
 * against SELLABLE_PACK_IDS so a tampered/`soon`/stale id can never grant access.
 */
async function grantPack(uid: string, rawPackId: unknown): Promise<void> {
  const packId = sellablePackId(rawPackId);
  if (!packId) {
    logger.error("pack_grant_rejected", { uid, packId: String(rawPackId) });
    return;
  }
  await getFirestore()
    .collection("packEntitlements")
    .doc(uid)
    .set(
      { packs: { [packId]: { purchasedAt: new Date().toISOString(), source: "moyasar" } } },
      { merge: true },
    );
  logger.info("funnel", { event: "pack_granted", uid, packId });
}

/** Reward a completed referral, once per referee, on both sides. */
async function processReferral(refereeUid: string, ref: string | undefined): Promise<void> {
  if (!ref || !isValidCode(ref)) return;
  const db = getFirestore();
  const codeSnap = await db.collection("referralCodes").doc(ref).get();
  const referrerUid = codeSnap.exists ? (codeSnap.data()?.uid as string | undefined) : undefined;
  if (!referrerUid || referrerUid === refereeUid) return;
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

/** Persist the reusable card token from a `save_card` payment for the renewal
 * engine. STC Pay/Apple Pay never carry a `source.token`; only `pro`/`student`
 * checkouts request `save_card` (see createCheckoutConfig), so this is a no-op
 * for one-time purchases. */
async function saveCardToken(uid: string, payment: MoyasarPayment): Promise<void> {
  const token = payment.source?.token;
  if (!token) return;
  await getFirestore()
    .collection("moyasarCustomers")
    .doc(uid)
    .set(
      {
        token,
        brand: payment.source?.company ?? null,
        last4: payment.source?.last_four ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function upsertSubscription(uid: string, cadence: Cadence, expiresAtIso: string): Promise<void> {
  await getFirestore()
    .collection("subscriptions")
    .doc(uid)
    .set(
      {
        cadence,
        autoRenew: true,
        status: "active",
        failedAttempts: 0,
        nextChargeAt: nextChargeAt(new Date(expiresAtIso)).toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

interface CheckoutIntent {
  uid: string;
  kind: CheckoutKind;
  cadence?: Cadence | null;
  packId?: string | null;
  ref?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "fulfilled";
}

/**
 * Where the confirming client should navigate next — a RELATIVE path (never built
 * from APP_ORIGIN), so it resolves correctly on whichever host actually served the
 * app (prod, a preview deploy, localhost) rather than forcing a redirect to the
 * configured production origin. `callback_url` (Moyasar's own redirect target, which
 * DOES need to be absolute) is built separately in createCheckoutConfig.
 */
function redirectForIntent(intent: Pick<CheckoutIntent, "kind" | "packId">, ok: boolean): string {
  if (ok && intent.kind === "pack" && intent.packId) return `/study/packs/${intent.packId}?checkout=success`;
  if (ok) return "/account?checkout=success";
  if (intent.kind === "pack" && intent.packId) return `/study/packs/${intent.packId}?checkout=cancel`;
  return "/pricing?checkout=cancel";
}

async function grantForIntent(intent: CheckoutIntent, payment: MoyasarPayment): Promise<void> {
  const { uid, kind } = intent;
  if (kind === "pro" || kind === "student") {
    const cadence: Cadence = intent.cadence === "monthly" ? "monthly" : "annual";
    const entitlement = entitlementFromCheckout(cadence, new Date());
    await writeEntitlement(uid, entitlement);
    await saveCardToken(uid, payment);
    await upsertSubscription(uid, cadence, entitlement.expiresAt!);
  } else if (kind === "pass") {
    await grantPass(uid);
  } else if (kind === "credits") {
    await addCredits(uid);
  } else if (kind === "pack") {
    await grantPack(uid, intent.packId);
  }
  await processReferral(uid, intent.ref ?? undefined);
}

/**
 * Idempotently fulfil a Moyasar payment by id — the ONE path both `confirmPayment`
 * and `moyasarWebhook` funnel through. Fetches the payment server-to-server (never
 * trusts the browser's widget config, which could have been tampered with) and
 * cross-checks it against the `checkoutIntents/{checkoutId}` record the CALLABLE
 * wrote server-side: `payment.metadata.checkoutId` is the only client-influenced
 * value trusted here, and only as a lookup key — the amount/currency/uid/kind that
 * actually decide what gets granted all come from the stored intent, never from the
 * payment's own metadata (which the browser could have altered before submitting to
 * Moyasar). The `moyasarPayments/{id}` create() marker makes this safe to call twice
 * for the same payment (confirmPayment racing the webhook, or a client retry).
 */
async function fulfillPayment(
  secretKey: string,
  paymentId: string,
): Promise<{ uid: string | null; redirectTo: string }> {
  const db = getFirestore();
  const marker = db.collection("moyasarPayments").doc(paymentId);
  const claimed = await marker
    .create({ receivedAt: FieldValue.serverTimestamp() })
    .then(() => true)
    .catch(() => false);

  const payment = await moyasarGetPayment(secretKey, paymentId);
  const checkoutId = payment.metadata?.checkoutId as string | undefined;
  if (!checkoutId) {
    logger.error("moyasar_payment_no_checkout_id", { paymentId });
    return { uid: null, redirectTo: `${appOrigin.value()}/pricing?checkout=cancel` };
  }

  const intentRef = db.collection("checkoutIntents").doc(checkoutId);
  const intentSnap = await intentRef.get();
  if (!intentSnap.exists) {
    logger.error("moyasar_checkout_intent_missing", { paymentId, checkoutId });
    return { uid: null, redirectTo: `${appOrigin.value()}/pricing?checkout=cancel` };
  }
  const intent = intentSnap.data() as CheckoutIntent;

  const paid = payment.status === "paid";
  const amountOk = payment.amount === intent.amount && payment.currency === intent.currency;
  if (!paid || !amountOk) {
    if (!amountOk) {
      logger.error("moyasar_amount_mismatch", {
        paymentId,
        checkoutId,
        got: `${payment.amount} ${payment.currency}`,
        want: `${intent.amount} ${intent.currency}`,
      });
    }
    return { uid: intent.uid, redirectTo: redirectForIntent(intent, false) };
  }

  const redirectTo = redirectForIntent(intent, true);
  if (!claimed) return { uid: intent.uid, redirectTo }; // already fulfilled by a prior call

  await grantForIntent(intent, payment);
  await intentRef.set({ status: "fulfilled" }, { merge: true });
  return { uid: intent.uid, redirectTo };
}

// ---- Callables -----------------------------------------------------------------

export const createCheckoutConfig = onCall(
  {
    region: REGION,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5,
    // App Check on the payments surface. Moyasar checkout is web-only (the native
    // shell uses store IAP), and the web app mints reCAPTCHA-Enterprise App Check
    // tokens, so a stolen/automated ID token alone can't drive checkout from outside
    // the app. Requires the App Check provider to be registered + enforced in the
    // Firebase console and VITE_RECAPTCHA_ENTERPRISE_SITE_KEY set in the build.
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");

    const kind = checkoutKind(request.data?.kind);
    if (!kind) throw new HttpsError("invalid-argument", "unknown-checkout-kind");

    let packId: string | undefined;
    let cadence: Cadence | undefined;

    if (kind === "pack") {
      const valid = sellablePackId(request.data?.packId);
      if (!valid) throw new HttpsError("invalid-argument", "unknown-pack");
      packId = valid;
    } else if (kind === "student") {
      // Discounted student rate — gated server-side on a VERIFIED academic email so
      // it can't be self-claimed.
      const email = request.auth?.token?.email as string | undefined;
      const emailVerified = request.auth?.token?.email_verified as boolean | undefined;
      if (!isStudentEmail(email, emailVerified)) {
        throw new HttpsError("failed-precondition", "student-verification-required");
      }
      cadence = cadenceOf(request.data?.cadence);
    } else if (kind === "pro") {
      cadence = cadenceOf(request.data?.cadence);
    }

    const amount = amountForCheckout(kind, cadence, priceEnv());
    const ref = normalizeCode(request.data?.ref as string | undefined);
    const checkoutId = randomUUID();

    await getFirestore()
      .collection("checkoutIntents")
      .doc(checkoutId)
      .set({
        uid,
        kind,
        cadence: cadence ?? null,
        packId: packId ?? null,
        ref: isValidCode(ref) ? ref : null,
        amount,
        currency: "SAR",
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });

    const recurring = isRecurringKind(kind);
    logger.info("funnel", { event: "checkout_started", kind, uid });
    return {
      checkoutId,
      amount,
      currency: "SAR",
      description: describeCheckout(kind, packId),
      callbackUrl: `${appOrigin.value()}/checkout/return`,
      // Only a saved card token can be re-charged off-session, so recurring plans
      // only offer cards/mada and force save_card; one-time purchases offer every
      // configured method.
      methods: recurring ? ["creditcard"] : ["creditcard", "applepay", "stcpay"],
      saveCard: recurring,
      supportedNetworks: ["visa", "mastercard", "mada"],
    };
  },
);

export const confirmPayment = onCall(
  {
    region: REGION,
    secrets: [moyasarSecret],
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5,
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");
    const paymentId = request.data?.id;
    if (typeof paymentId !== "string" || !paymentId) {
      throw new HttpsError("invalid-argument", "missing-payment-id");
    }
    const result = await fulfillPayment(moyasarSecret.value(), paymentId);
    // The confirming caller must be the same user the checkout was started for —
    // never fulfil (or reveal anything about) a payment that isn't theirs.
    if (result.uid !== uid) throw new HttpsError("permission-denied", "payment-not-yours");
    return { redirectTo: result.redirectTo };
  },
);

export const cancelAutoRenew = onCall(
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
    await getFirestore()
      .collection("subscriptions")
      .doc(uid)
      .set({ autoRenew: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    logger.info("funnel", { event: "auto_renew_canceled", uid });
    return { ok: true };
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
    await getFirestore().collection("referralCodes").doc(code).set({ uid }, { merge: true });
    return { code };
  },
);

// ---- Webhook (async backstop) ---------------------------------------------------

export const moyasarWebhook = onRequest(
  {
    region: REGION,
    secrets: [moyasarSecret, webhookSecret],
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5,
  },
  async (req, res) => {
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody?.toString("utf8") ?? "";
    const sig = req.headers["x-moyasar-signature"] as string | string[] | undefined;
    if (!verifyMoyasarSignature(raw, sig, webhookSecret.value())) {
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    // Payload shape per Moyasar's payment-webhooks docs: `{ id, type, data: <payment> }`.
    // `data.id` is the payment id; fall back to a top-level `id` defensively.
    const body = req.body as { id?: string; data?: { id?: string } } | undefined;
    const paymentId = body?.data?.id ?? body?.id;
    if (!paymentId) {
      res.status(400).send("Missing payment id");
      return;
    }

    try {
      await fulfillPayment(moyasarSecret.value(), paymentId);
    } catch (e) {
      logger.error("moyasar_webhook_error", { paymentId, error: String(e) });
      res.status(500).send("Webhook handler error");
      return;
    }
    res.json({ received: true });
  },
);

// ---- Renewal engine (scheduled) --------------------------------------------------

async function recordRenewalFailure(
  subRef: DocumentReference,
  failedAttempts: number,
  uid: string,
): Promise<void> {
  const attempts = failedAttempts + 1;
  if (attempts >= MAX_RENEWAL_ATTEMPTS) {
    await subRef.set(
      { status: "canceled", autoRenew: false, failedAttempts: attempts, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    logger.error("moyasar_renewal_gave_up", { uid, attempts });
  } else {
    // Retry on tomorrow's run — RENEWAL_LEAD_DAYS gives headroom before the
    // existing entitlement actually lapses.
    await subRef.set(
      { status: "past_due", failedAttempts: attempts, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    logger.info("funnel", { event: "renewal_retry_scheduled", uid, attempts });
  }
}

async function renewOne(secretKey: string, uid: string, cadence: Cadence, failedAttempts: number): Promise<void> {
  const db = getFirestore();
  const subRef = db.collection("subscriptions").doc(uid);
  const customerSnap = await db.collection("moyasarCustomers").doc(uid).get();
  const token = customerSnap.exists ? (customerSnap.data()?.token as string | undefined) : undefined;
  if (!token) {
    await subRef.set(
      { status: "canceled", autoRenew: false, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    logger.error("moyasar_renewal_no_token", { uid });
    return;
  }

  let payment: MoyasarPayment;
  try {
    payment = await moyasarChargeToken(secretKey, {
      amount: amountForCheckout("pro", cadence, priceEnv()),
      currency: "SAR",
      description: `Fly GACA Pro — ${cadenceDays(cadence)}-day renewal`,
      token,
      callbackUrl: `${appOrigin.value()}/checkout/return`,
      metadata: { uid, renewal: "true" },
    });
  } catch (e) {
    logger.error("moyasar_renewal_charge_failed", { uid, error: String(e) });
    await recordRenewalFailure(subRef, failedAttempts, uid);
    return;
  }

  if (payment.status !== "paid") {
    logger.info("funnel", { event: "renewal_failed", uid, status: payment.status });
    await recordRenewalFailure(subRef, failedAttempts, uid);
    return;
  }

  const userSnap = await db.collection("users").doc(uid).get();
  const current = userSnap.exists ? (userSnap.data()?.entitlement as Entitlement | undefined) : undefined;
  const base = current?.expiresAt ? new Date(current.expiresAt) : new Date();
  const entitlement = entitlementFromCheckout(cadence, base);
  await writeEntitlement(uid, entitlement);
  await subRef.set(
    {
      status: "active",
      failedAttempts: 0,
      nextChargeAt: nextChargeAt(new Date(entitlement.expiresAt!)).toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  logger.info("funnel", { event: "renewal_charged", uid, cadence });
}

/**
 * Daily sweep: Moyasar has no native subscription object, so this IS the renewal
 * engine — it re-charges every due subscriber's saved card token and extends their
 * `entitlement.expiresAt` on success (see ./billing-core RENEWAL_LEAD_DAYS /
 * MAX_RENEWAL_ATTEMPTS for the retry/give-up cadence).
 */
export const renewMoyasarSubscriptions = onSchedule(
  {
    region: REGION,
    schedule: "every 24 hours",
    secrets: [moyasarSecret],
    timeoutSeconds: 540,
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const dueSnap = await db
      .collection("subscriptions")
      .where("autoRenew", "==", true)
      .where("status", "in", ["active", "past_due"])
      .where("nextChargeAt", "<=", new Date().toISOString())
      .get();

    const secretKey = moyasarSecret.value();
    for (const doc of dueSnap.docs) {
      const sub = doc.data() as { cadence: Cadence; failedAttempts?: number };
      await renewOne(secretKey, doc.id, sub.cadence, sub.failedAttempts ?? 0).catch((e) => {
        logger.error("moyasar_renewal_unhandled_error", { uid: doc.id, error: String(e) });
      });
    }
  },
);
