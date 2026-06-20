/**
 * Recency / validity date maths shared by the currency tools. Pure. The
 * regulatory window is supplied by the caller — the tools cite the relevant
 * GACAR Part and tell the user to confirm the exact period there.
 */
const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseISO(s: string): Date | null {
  if (!ISO.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}

/** The date `n` days before `now`. */
export function daysAgo(n: number, now: Date = new Date()): Date {
  return addDays(now, -n);
}

/** True when an ISO date falls inside the trailing `days`-day window ending at `now`. */
export function withinDays(dateISO: string, days: number, now: Date = new Date()): boolean {
  const d = parseISO(dateISO);
  if (!d) return false;
  const t = d.getTime();
  return t >= daysAgo(days, now).getTime() && t <= now.getTime();
}

export interface Validity {
  expiry: Date;
  daysLeft: number;
  current: boolean;
}

function build(expiry: Date, now: Date): Validity {
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / DAY);
  return { expiry, daysLeft, current: daysLeft >= 0 };
}

/** Validity that expires `windowDays` after `start`. */
export function recencyByDays(
  start: Date | null,
  windowDays: number,
  now: Date = new Date(),
): Validity | null {
  if (!start || !(windowDays > 0)) return null;
  return build(addDays(start, windowDays), now);
}

/** Validity that expires `months` after `start`. */
export function validityByMonths(
  start: Date | null,
  months: number,
  now: Date = new Date(),
): Validity | null {
  if (!start || !(months > 0)) return null;
  return build(addMonths(start, months), now);
}
