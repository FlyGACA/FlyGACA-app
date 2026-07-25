/**
 * Pure billing logic shared by the Moyasar functions — no Moyasar SDK/Admin imports
 * so it is unit-testable. Moyasar (unlike Stripe) has no native subscription object:
 * `pro`/`student` are "recurring" only in the sense that a saved card token is
 * re-charged by a scheduled function (see ./billing.ts renewMoyasarSubscriptions) and
 * each successful charge EXTENDS `expiresAt` by one cadence period — the same
 * expiry-extension shape already used for the one-time Exam Season Pass
 * (entitlementFromPass). Mirrors src/lib/services/entitlements.ts.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type Plan = "free" | "pro" | "school";

export interface Entitlement {
  plan: Plan;
  /** ISO timestamp; absent means non-expiring. */
  expiresAt?: string;
  source?: "moyasar" | "revenuecat" | "school" | "staff";
}

export type Cadence = "monthly" | "annual";

/** What a checkout is for. `pro`/`student` are recurring (token-renewed); the rest
 * are one-time purchases. */
export type CheckoutKind = "pro" | "student" | "pass" | "credits" | "pack";

export function isRecurringKind(kind: CheckoutKind): boolean {
  return kind === "pro" || kind === "student";
}

/** Configured SAR list prices (major units, e.g. "59" or "59.00") for every sellable
 * SKU — the authoritative source the server derives the halalas amount from. Mirror
 * the indicative figures shown on `/pricing` (src/pages/pricing/Pricing.tsx) and the
 * exam-prep pack price (src/lib/prepCatalog.ts PREP_PACK_PRICE). */
export interface PriceEnv {
  proMonthly: string;
  proAnnual: string;
  studentMonthly: string;
  studentAnnual: string;
  pass: string;
  credits: string;
  prepPack: string;
}

/** Convert a SAR major-unit string to halalas (integer minor units). Throws on a
 * missing/non-positive/non-numeric env value so a misconfigured deploy fails loudly
 * at checkout time rather than silently charging SAR 0. */
export function sarToHalalas(sar: string | undefined): number {
  const n = Number(sar);
  if (!sar || !Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid-price:${String(sar)}`);
  }
  return Math.round(n * 100);
}

/** The halalas amount for a checkout, from the configured SAR price table. `cadence`
 * only matters for the recurring kinds (`pro`/`student`); one-time kinds ignore it. */
export function amountForCheckout(
  kind: CheckoutKind,
  cadence: Cadence | undefined,
  env: PriceEnv,
): number {
  switch (kind) {
  case "pro":
    return sarToHalalas(cadence === "monthly" ? env.proMonthly : env.proAnnual);
  case "student":
    return sarToHalalas(cadence === "monthly" ? env.studentMonthly : env.studentAnnual);
  case "pass":
    return sarToHalalas(env.pass);
  case "credits":
    return sarToHalalas(env.credits);
  case "pack":
    return sarToHalalas(env.prepPack);
  }
}

/**
 * The plan actually in force for an entitlement `now`: a paid plan whose `expiresAt`
 * has passed collapses to `free`, and a non-expiring grant (school/staff) stands.
 * Mirrors `effectivePlan` in src/lib/services/entitlements.ts so the gateway gates on
 * exactly the rule the app uses to show UI. Read-only — never grants.
 */
export function effectivePlan(
  ent: Entitlement | null | undefined,
  now: Date = new Date(),
): Plan {
  if (!ent || ent.plan === "free") return "free";
  if (!ent.expiresAt) return ent.plan; // non-expiring grant (school/staff)
  return new Date(ent.expiresAt).getTime() > now.getTime() ? ent.plan : "free";
}

/** Whether an entitlement grants an active paid plan (pro or school) right now. */
export function isPaidActive(
  ent: Entitlement | null | undefined,
  now: Date = new Date(),
): boolean {
  return effectivePlan(ent, now) !== "free";
}

/** Days of Pro access granted by one Exam Season Pass purchase. */
export const PASS_DAYS = 90;

/**
 * Entitlement for a one-time Exam Season Pass: `days` (default PASS_DAYS) of Pro
 * from `now`. Given the buyer's `current` entitlement it never SHORTENS an existing
 * later paid expiry and preserves an active higher (`school`) tier — so buying a
 * pass can't downgrade a subscriber.
 */
export function entitlementFromPass(
  now: Date,
  current?: Entitlement | null,
  days: number = PASS_DAYS,
): Entitlement {
  const passExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const activeNow = effectivePlan(current, now);
  const currentExpiry =
    activeNow !== "free" && current?.expiresAt ? new Date(current.expiresAt) : null;
  const expiresAt =
    currentExpiry && currentExpiry.getTime() > passExpiry.getTime() ? currentExpiry : passExpiry;
  const plan: Plan = activeNow === "school" ? "school" : "pro";
  return { plan, source: "moyasar", expiresAt: expiresAt.toISOString() };
}

/**
 * Exam-prep packs that can be bought one-time. MUST mirror the paid + live packs in
 * src/lib/prepCatalog.ts (`access: 'paid'`, `status: 'live'`). The server validates
 * the `packId` on checkout AND at fulfilment against this list so an unknown/`soon`/
 * tampered id can never grant ownership. A pack going live is a one-line addition
 * here + a deploy; a frontend-only catalog change never grants.
 */
export const SELLABLE_PACK_IDS = [
  "ppl-exam",
  "medical",
  "aip",
  "elp",
  "conversion",
  "cpl",
  "ir",
  "atpl",
] as const;

/** Narrow untrusted input to a sellable pack id, else null. */
export function sellablePackId(v: unknown): string | null {
  return typeof v === "string" && (SELLABLE_PACK_IDS as readonly string[]).includes(v) ? v : null;
}

/** Days one successful (initial or renewal) charge buys, by cadence. */
export function cadenceDays(cadence: Cadence): number {
  return cadence === "monthly" ? 30 : 365;
}

/** How many days before `expiresAt` the renewal engine attempts the recharge — a
 * buffer so a few retry attempts (see MAX_RENEWAL_ATTEMPTS) fit before access lapses. */
export const RENEWAL_LEAD_DAYS = 3;

/** Consecutive failed renewal charges before auto-renew gives up (the plan then
 * lapses to free at its already-set `expiresAt`, same as a lapsed Stripe subscription). */
export const MAX_RENEWAL_ATTEMPTS = 3;

/** The next renewal-charge attempt date, `leadDays` before `expiresAt`. */
export function nextChargeAt(expiresAt: Date, leadDays: number = RENEWAL_LEAD_DAYS): Date {
  return new Date(expiresAt.getTime() - leadDays * 24 * 60 * 60 * 1000);
}

/** Extend an expiry by one cadence period FROM ITSELF (not from `now`), so a renewal
 * charged a few days early (RENEWAL_LEAD_DAYS) doesn't shave time off the period the
 * subscriber already paid for. */
export function extendExpiry(expiresAt: Date, cadence: Cadence): Date {
  return new Date(expiresAt.getTime() + cadenceDays(cadence) * 24 * 60 * 60 * 1000);
}

/**
 * Entitlement to persist after a paid `pro`/`student` charge — a NEW purchase passes
 * `now` as `from`; a renewal charge passes the current `expiresAt` so the fresh period
 * is appended rather than measured from the (early) charge date. Both grant `plan:
 * 'pro'` — the discounted student rate carries the same entitlement as full-price Pro.
 */
export function entitlementFromCheckout(cadence: Cadence, from: Date): Entitlement {
  return { plan: "pro", source: "moyasar", expiresAt: extendExpiry(from, cadence).toISOString() };
}

/**
 * Verify the `x-moyasar-signature` header against the raw webhook body using the
 * shared secret configured for the endpoint (Moyasar dashboard → Webhooks →
 * `shared_secret`). Defense-in-depth only: `confirmPayment` (the callable, which
 * fetches the payment server-to-server by id with the secret key) is the PRIMARY,
 * trusted fulfilment path, so an incorrect signature recipe here would make the
 * webhook path inert rather than insecure. Re-verify this against Moyasar's current
 * webhook docs before depending on the webhook alone (docs.moyasar.com blocked
 * automated fetches during authoring of this integration).
 */
export function verifyMoyasarSignature(
  rawBody: string,
  signature: string | string[] | undefined,
  secret: string,
): boolean {
  if (!signature || Array.isArray(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
