/**
 * Free-tier chat quota maths. Pure (no DOM): a local-first daily nudge that
 * counts how many questions a free user has asked today and tells the UI when to
 * surface the Pro upsell. This is NOT entitlement enforcement — the server stays
 * the source of truth; Pro/School users bypass it entirely in the page.
 */

/** Questions a free user may ask Captain Adel per day before the upsell gate. */
export const FREE_DAILY_LIMIT = 5;

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

/** Free questions left today (never negative). */
export function remaining(usage: Usage): number {
  return Math.max(0, FREE_DAILY_LIMIT - usage.count);
}

/** True once the free user has spent the day's allowance. */
export function isExhausted(usage: Usage): boolean {
  return remaining(usage) <= 0;
}

/** Record one more question used today. */
export function consume(usage: Usage): Usage {
  return { day: usage.day, count: usage.count + 1 };
}
