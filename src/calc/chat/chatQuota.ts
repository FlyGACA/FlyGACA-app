/**
 * Free-tier chat quota maths. Pure (no DOM): a local-first daily nudge that
 * counts how many questions a free user has asked today and tells the UI when to
 * surface the Pro upsell. This is NOT entitlement enforcement — the server stays
 * the source of truth; Pro/School users bypass it entirely in the page.
 */

/** Questions a free user may ask Captain Adel per day before the upsell gate. */
export const FREE_DAILY_LIMIT = 5;

/**
 * Questions an anonymous (not-signed-in) visitor may ask per day before the
 * sign-in nudge — a smaller "taste" than the signed-in free allowance. Must match
 * `ANON_DAILY_LIMIT` in functions/src/chat-quota-core.ts (the enforced value),
 * pinned by tests/client-server-mirrors.test.ts.
 */
export const ANON_DAILY_LIMIT = 3;

export interface Usage {
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  count: number;
}

/** The UTC calendar day for `now`. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Normalise a possibly-stale stored usage record against `now`: a record from a
 * previous day resets to zero, and anything malformed becomes a fresh record.
 */
export function currentUsage(
  raw: Partial<Usage> | null | undefined,
  now: Date = new Date(),
): Usage {
  const today = dayKey(now);
  if (!raw || raw.day !== today || typeof raw.count !== 'number' || !(raw.count >= 0)) {
    return { day: today, count: 0 };
  }
  return { day: today, count: Math.floor(raw.count) };
}

/**
 * Questions left today (never negative). `limit` defaults to the signed-in free
 * allowance; the chat page passes `ANON_DAILY_LIMIT` for a not-signed-in visitor.
 */
export function remaining(usage: Usage, limit: number = FREE_DAILY_LIMIT): number {
  return Math.max(0, limit - usage.count);
}

/** True once the day's allowance (`limit`, default free tier) is spent. */
export function isExhausted(usage: Usage, limit: number = FREE_DAILY_LIMIT): boolean {
  return remaining(usage, limit) <= 0;
}

/** Record one more question used today. */
export function consume(usage: Usage): Usage {
  return { day: usage.day, count: usage.count + 1 };
}
