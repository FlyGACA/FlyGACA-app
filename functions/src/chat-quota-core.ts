/**
 * Pure free-tier daily-quota maths for Captain Adel — no Firebase/Express imports
 * so it is unit-testable (the billing-core/rate-limit-core pattern). The gateway
 * wraps this with a Firestore read/write; this decides, given the stored usage and
 * `now`, whether one more free question is allowed and when the allowance resets.
 *
 * FREE_DAILY_LIMIT MUST match `src/calc/chat/chatQuota.ts` (the client-side nudge) so the
 * server enforces exactly the limit the UI advertises. The localStorage counter in
 * the app is only a hint that can be cleared/bypassed; this is the source of truth
 * (DESIGN §8 — the server owns entitlement and cost control).
 */

/** Free questions a signed-in free user may ask per UTC day. Must match src/calc/chat/chatQuota.ts. */
export const FREE_DAILY_LIMIT = 5;

/**
 * Questions granted by one purchased credit pack (a one-time top-up for free users
 * who hit the daily limit but won't subscribe). Credits are spent only after the
 * day's free allowance is used and never expire. Mirror in src/lib/billing.ts.
 */
export const CREDIT_PACK_SIZE = 50;

/** Persisted per-uid usage document (`chatUsage/{uid}`). */
export interface DailyUsage {
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  count: number;
}

/** The UTC calendar day for `now`. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Whole seconds until the next UTC midnight (when the free allowance resets); ≥ 1. */
export function secondsUntilUtcReset(now: Date = new Date()): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((nextMidnight - now.getTime()) / 1000));
}

export interface QuotaVerdict {
  /** Whether this question is within today's free allowance. */
  allowed: boolean;
  /** The usage record to persist — incremented when allowed, unchanged when blocked. */
  usage: DailyUsage;
  /** Seconds until the allowance resets — the `Retry-After` value when blocked. */
  retryAfterSec: number;
}

/**
 * Decide whether one more free question is allowed, given the stored usage (from a
 * prior request — possibly a previous day, or malformed) and `now`. A record from an
 * earlier day (or anything malformed) resets the count to zero. When allowed,
 * `usage.count` is incremented for the caller to persist; when blocked it is
 * returned unchanged so a rejected turn never burns the allowance.
 */
export function checkDailyQuota(
  raw: Partial<DailyUsage> | null | undefined,
  now: Date = new Date(),
  limit: number = FREE_DAILY_LIMIT,
): QuotaVerdict {
  const today = dayKey(now);
  const count =
    raw && raw.day === today && typeof raw.count === "number" && raw.count >= 0
      ? Math.floor(raw.count)
      : 0;
  const allowed = count < limit;
  return {
    allowed,
    usage: { day: today, count: allowed ? count + 1 : count },
    retryAfterSec: secondsUntilUtcReset(now),
  };
}
