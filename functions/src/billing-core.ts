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
}

/** The plan a price grants, or null when the price isn't recognised. */
export function planForPrice(priceId: string | undefined, env: PriceEnv): Plan | null {
  if (!priceId) return null;
  if (priceId === env.proMonthly || priceId === env.proAnnual) return "pro";
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
