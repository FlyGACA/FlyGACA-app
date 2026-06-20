/**
 * Pure logbook aggregation + CSV serialization. No DOM / store imports (only the
 * Flight type) so it stays unit-testable and free of the account store's side
 * effects. Hour/landing columns are free-text strings in the store, so every
 * read is coerced through `num`.
 */
import type { Flight } from '../lib/account';
import { addDays, addMonths, parseISO } from './recency';

const num = (s: string | undefined): number => parseFloat(String(s ?? '')) || 0;
const sum = (flights: Flight[], key: keyof Flight): number =>
  flights.reduce((s, f) => s + num(f[key] as string), 0);

const LAST_N_DAYS = 90;

export interface LogbookSummary {
  totalHours: number;
  picHours: number;
  nightHours: number;
  ifrHours: number;
  landings: number;
  flightCount: number;
  /** Rolling totals over the trailing 90 days. */
  last90: { hours: number; landings: number; flightCount: number };
  /** The `recentN` most recent flights (input is already newest-first). */
  recent: Flight[];
}

export function summarizeLogbook(
  flights: Flight[],
  now: Date = new Date(),
  recentN = 5,
): LogbookSummary {
  const lo = addDays(now, -LAST_N_DAYS).getTime();
  const within = flights.filter((f) => {
    const d = parseISO(f.date);
    return d != null && d.getTime() >= lo && d.getTime() <= now.getTime();
  });
  return {
    totalHours: sum(flights, 'total'),
    picHours: sum(flights, 'pic'),
    nightHours: sum(flights, 'night'),
    ifrHours: sum(flights, 'ifr'),
    landings: sum(flights, 'ldg'),
    flightCount: flights.length,
    last90: {
      hours: sum(within, 'total'),
      landings: sum(within, 'ldg'),
      flightCount: within.length,
    },
    recent: flights.slice(0, recentN),
  };
}

const CSV_FIELDS: (keyof Flight)[] = [
  'date',
  'type',
  'reg',
  'from',
  'to',
  'total',
  'pic',
  'night',
  'ifr',
  'ldg',
  'nightLdg',
  'appr',
  'remarks',
];

/** RFC 4180 cell: quote when it contains a comma, quote or newline; double inner quotes. */
function csvCell(v: string | undefined): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface MonthBucket {
  /** Short month label, e.g. "Jan". */
  label: string;
  /** YYYY-MM key (stable, locale-independent). */
  key: string;
  hours: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Flight `total` hours bucketed by calendar month over the trailing `months`
 * (oldest → newest), so the dashboard can chart recent activity. Months with no
 * flights report 0.
 */
export function monthlyHours(flights: Flight[], months = 6, now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(now, -i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    index.set(key, buckets.length);
    buckets.push({ label: MONTHS[d.getUTCMonth()], key, hours: 0 });
  }
  for (const f of flights) {
    const d = parseISO(f.date);
    if (!d) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const at = index.get(key);
    if (at != null) buckets[at].hours += num(f.total);
  }
  return buckets;
}

/** Serialize the logbook to CSV (header + one row per flight), CRLF-terminated. */
export function flightsToCsv(flights: Flight[]): string {
  const header = CSV_FIELDS.join(',');
  const rows = flights.map((f) => CSV_FIELDS.map((k) => csvCell(f[k] as string)).join(','));
  return [header, ...rows].join('\r\n');
}
