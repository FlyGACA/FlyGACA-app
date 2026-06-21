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
