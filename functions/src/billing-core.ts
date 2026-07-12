/**
 * Pure billing logic shared by the Stripe functions — no Stripe/Admin imports so
 * it is unit-testable. Maps a Stripe price to a plan and a Stripe subscription
 * state to the `entitlement` record the app reads (mirrors src/lib/entitlements.ts).
 */

export type Plan = "free" | "pro" | "school";

export interface Entitlement {
  plan: Plan;
  /** ISO timestamp; absent means non-expiring. */
  expiresAt?: string;
  source?: "stripe" | "revenuecat" | "school" | "staff";
}

/** Configured Stripe price IDs (from function params/env). */
export interface PriceEnv {
  proMonthly?: string;
  proAnnual?: string;
  /** Discounted student prices — grant the same `pro` plan. */
  studentMonthly?: string;
  studentAnnual?: string;
}

/** The plan a price grants, or null when the price isn't recognised. */
export function planForPrice(priceId: string | undefined, env: PriceEnv): Plan | null {
  if (!priceId) return null;
  if (
    priceId === env.proMonthly ||
    priceId === env.proAnnual ||
    priceId === env.studentMonthly ||
    priceId === env.studentAnnual
  ) {
    return "pro";
  }
  return null;
}

/**
 * The plan actually in force for an entitlement `now`: a paid plan whose `expiresAt`
 * has passed collapses to `free`, and a non-expiring grant (school/staff) stands.
 * Mirrors `effectivePlan` in src/lib/entitlements.ts so the gateway gates on exactly
 * the rule the app uses to show UI. Read-only: never grants — only interprets what
 * the Stripe webhook (the sole writer) persisted.
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
 * pass can't downgrade a subscriber. `source: "stripe"` (the pass is a Stripe
 * one-time payment); `isActive`/`effectivePlan` handle the expiry from here.
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
  return { plan, source: "stripe", expiresAt: expiresAt.toISOString() };
}

/** Stripe subscription statuses that grant an active paid plan. */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/**
 * Build the entitlement to persist from a subscription's status + price. Anything
 * not actively paid (canceled, unpaid, unknown price) collapses to `free` so a
 * lapse revokes access on the next webhook.
 */
export function entitlementFromSubscription(input: {
  status: string;
  priceId?: string;
  /** Stripe `current_period_end`, unix seconds. */
  currentPeriodEnd?: number;
  env: PriceEnv;
}): Entitlement {
  const plan = ACTIVE_STATUSES.has(input.status) ? planForPrice(input.priceId, input.env) : null;
  if (!plan) return { plan: "free" };
  return {
    plan,
    source: "stripe",
    expiresAt: input.currentPeriodEnd
      ? new Date(input.currentPeriodEnd * 1000).toISOString()
      : undefined,
  };
}
