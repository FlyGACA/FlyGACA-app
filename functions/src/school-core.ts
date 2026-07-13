/**
 * School (B2B seat) grant policy — pure helpers shared by the seat-grant script so
 * the entitlement shape and roster parsing are testable in one place. Schools are
 * sold offline (invoiced per seat), so seats are provisioned by an admin from the
 * school's roster rather than self-service; the grant is the top `school` tier,
 * which satisfies every Pro feature via the plan rank.
 */
import type { Entitlement } from "./billing-core.js";

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
