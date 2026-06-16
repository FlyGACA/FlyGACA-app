/**
 * Frontend entitlement helpers. The `entitlement` record itself is written
 * SERVER-ONLY (Cloud Functions via the Admin SDK) and read here only to gate
 * UI — never to grant access. Pure predicate, mirrors functions/entitlements-core.js
 * so it is unit-testable without any backend.
 */

export type Plan = 'free' | 'pro' | 'school';

export interface Entitlement {
  plan: Plan;
  /** ISO timestamp; absent or in the past means lapsed. */
  expiresAt?: string;
  source?: 'stripe' | 'revenuecat' | 'school' | 'staff';
}

/** True when the entitlement grants an active paid plan at `now`. */
export function isActive(ent: Entitlement | null | undefined, now: Date = new Date()): boolean {
  if (!ent || ent.plan === 'free') return false;
  if (!ent.expiresAt) return true; // non-expiring grant (e.g. staff/school)
  const expiry = Date.parse(ent.expiresAt);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

/** Whichever plan is in force right now (lapsed paid plans fall back to free). */
export function effectivePlan(ent: Entitlement | null | undefined, now?: Date): Plan {
  return isActive(ent, now) ? (ent as Entitlement).plan : 'free';
}
