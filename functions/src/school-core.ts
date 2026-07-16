/**
 * School (B2B seat) grant policy — pure helpers shared by the seat-grant script and
 * the `claimSchoolSeat` callable so the entitlement shape, roster parsing and
 * eligibility live in one testable place. Schools are sold offline (invoiced per
 * seat); seats are provisioned by an admin from the roster, and — for domains/invites
 * an admin has approved — a member's VERIFIED email can self-unlock on sign-in. The
 * grant is the top `school` tier, which satisfies every Pro feature via the plan rank.
 */
import type { Entitlement } from "./billing-core.js";

/**
 * Email domains whose VERIFIED addresses self-unlock a school seat (e.g. an
 * academy's own mail domain). Empty by default — an approved domain is a per-contract
 * decision, so nothing auto-grants until an operator adds it here. Members on a shared
 * consumer domain (gmail, etc.) are covered by the invite roster instead, never this.
 */
export const APPROVED_SCHOOL_DOMAINS: readonly string[] = [];

/**
 * A school seat entitlement: the `school` tier tagged `source: "school"` so it is
 * distinguishable from a Stripe or staff grant. `expiresAt` (ISO) sets the contract
 * end; omit it for a non-expiring seat.
 */
export function schoolEntitlement(expiresAt?: string): Entitlement {
  return expiresAt
    ? { plan: "school", source: "school", expiresAt }
    : { plan: "school", source: "school" };
}

/**
 * Parse a school roster — a CSV or a newline/comma/semicolon/space-separated list —
 * into a normalized, de-duplicated list of lowercased email addresses. Blanks, a
 * leading `email` header, and anything that isn't shaped like an address are
 * ignored, so a copy-pasted spreadsheet column works as-is.
 */
export function parseSeatEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e || e === "email") continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue; // local@domain.tld
    seen.add(e);
  }
  return [...seen];
}

/**
 * Normalize an email to its Firestore invite-doc key: trimmed + lowercased, or
 * `null` when it isn't shaped like an address. Used both to write an invite
 * (from the admin roster) and to look one up in `claimSchoolSeat`, so the two
 * always agree on the key. Emails never contain `/`, so they are valid doc ids.
 */
export function inviteKeyForEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

/**
 * Whether `email` self-unlocks a school seat by DOMAIN. Requires `emailVerified` —
 * an unverified address never qualifies, mirroring the staff/student grants, so a
 * domain match can't be spoofed by signing up as someone you aren't. The invite
 * roster is checked separately (it needs a Firestore read); this is the pure part.
 */
export function isApprovedSchoolDomain(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
  domains: readonly string[] = APPROVED_SCHOOL_DOMAINS,
): boolean {
  if (!emailVerified || !email) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return false;
  return domains.includes(e.slice(at + 1));
}
