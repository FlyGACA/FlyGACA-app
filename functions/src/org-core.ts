/**
 * B2B org seat-provisioning policy — the pure, Firebase-free rules behind the
 * `provisionSeats` callable (functions/src/org.ts). Per the repo convention
 * ("every business rule lives in a pure `*-core.ts`"), the request validation,
 * the seat-limit guardrail, and the invite-doc assembly live here so they are
 * unit-testable in isolation; the callable stays a thin Firestore wrapper.
 *
 * The seat-limit check is the money/access guardrail: it decides whether an
 * owner may add N more members without exceeding the seats they were invoiced
 * for, so a regression is either over-provisioning (unbilled seats) or a false
 * block. Keeping it pure means that decision has a regression net.
 */
import { inviteKeyForEmail } from "./school-core.js";

/** The validated shape of a `provisionSeats` request. */
export interface ProvisionInput {
  orgId: string;
  emails: string[];
  expiresAt?: string;
}

/** Why a `provisionSeats` request was rejected (maps 1:1 to the callable's `invalid-argument` codes). */
export type ProvisionInputError =
  | "orgId-required"
  | "emails-required"
  | "expiresAt-must-be-ISO-string";

export type ParseResult =
  | { ok: true; value: ProvisionInput }
  | { ok: false; code: ProvisionInputError };

/**
 * Validate the raw callable payload. Pure so the wrapper can map the failure
 * `code` straight onto an `HttpsError("invalid-argument", code)` and the rules
 * are tested without a Firebase runtime. `orgId` must be a non-empty string,
 * `emails` a non-empty array, and `expiresAt` — when present — a string.
 */
export function parseProvisionInput(data: unknown): ParseResult {
  const d = (data ?? {}) as { orgId?: unknown; emails?: unknown; expiresAt?: unknown };
  if (typeof d.orgId !== "string" || !d.orgId) {
    return { ok: false, code: "orgId-required" };
  }
  if (!Array.isArray(d.emails) || d.emails.length === 0) {
    return { ok: false, code: "emails-required" };
  }
  if (d.expiresAt !== undefined && typeof d.expiresAt !== "string") {
    return { ok: false, code: "expiresAt-must-be-ISO-string" };
  }
  return {
    ok: true,
    value: {
      orgId: d.orgId,
      emails: d.emails as string[],
      expiresAt: d.expiresAt as string | undefined,
    },
  };
}

export type SeatLimitResult = { ok: true } | { ok: false; message: string };

/**
 * Whether adding `requested` members keeps the org within its `seatLimit`.
 * `seatsUsed + requested` may equal the limit (a full org is fine) but not
 * exceed it. The failure `message` mirrors the callable's `resource-exhausted`
 * text verbatim, so the wrapper stays a passthrough.
 */
export function checkSeatLimit(args: {
  seatsUsed: number;
  seatLimit: number;
  requested: number;
}): SeatLimitResult {
  const { seatsUsed, seatLimit, requested } = args;
  if (seatsUsed + requested > seatLimit) {
    return {
      ok: false,
      message: `seat-limit-exceeded: ${seatsUsed}/${seatLimit} used, requested ${requested}`,
    };
  }
  return { ok: true };
}

/** A `schoolInvites/{key}` document plus the doc-id key it is written under. */
export interface BuiltInvite {
  key: string;
  doc: { email: string; orgId: string; createdAt: string; expiresAt?: string };
}

/**
 * Assemble the invite doc for one roster email, or `null` when the address is
 * malformed (the caller records that as a per-email failure). The doc `email`
 * and the doc-id `key` are the same normalized (trimmed + lowercased) address,
 * so a re-provision of the same email is idempotent under `set({ merge: true })`.
 * `now` is injectable so the `createdAt` timestamp is deterministic in tests.
 */
export function buildInvite(
  email: string,
  orgId: string,
  opts: { expiresAt?: string; now?: Date } = {},
): BuiltInvite | null {
  const key = inviteKeyForEmail(email);
  if (!key) return null;
  const doc: BuiltInvite["doc"] = {
    email: key,
    orgId,
    createdAt: (opts.now ?? new Date()).toISOString(),
  };
  if (opts.expiresAt) doc.expiresAt = opts.expiresAt;
  return { key, doc };
}
