/**
 * B2B org (school) admin callables — the read path for the `/business/admin`
 * cohort dashboard (docs/b2b/DESIGN-admin-dashboard.md). An org record lives at
 * `orgs/{orgId}` with `ownerUids`; its members are indexed at
 * `orgs/{orgId}/members/{uid}` (both server-owned, deny-all client). These
 * callables let an org OWNER read their own cohort's readiness without any
 * cross-user client reads — the server aggregates and returns only the roll-up the
 * caller is entitled to, so the "a member's progress is owner-read only" rule holds.
 *
 *  - `getMyOrgs`         — orgs the caller owns (id, name, seat counts).
 *  - `getCohortReadiness`— per-member seat status + study readiness for one owned org.
 *
 * Both enforce App Check and re-verify ownership server-side. Read-only: neither
 * grants or writes anything (provisioning stays the ops script / a later callable).
 */
import { onCall, HttpsError } from "firebase-functions/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Entitlement } from "./billing-core.js";
import { cohortRow, type CohortRow } from "./school-core.js";
import { buildInvite, checkSeatLimit, parseProvisionInput } from "./org-core.js";
import { REGION } from "./region.js";

if (getApps().length === 0) initializeApp();

const CALL_OPTS = {
  region: REGION,
  timeoutSeconds: 30,
  memory: "256MiB" as const,
  maxInstances: 5,
  enforceAppCheck: true,
};

/** The AIP prep pack's quiz banks — the default expected set (mirrors packCatalog). */
const DEFAULT_BANKS = ["aip-ais", "airspace"];

interface OrgDoc {
  name?: string;
  ownerUids?: string[];
  seatLimit?: number;
  passThreshold?: number;
  banks?: string[];
}

/** Orgs the signed-in caller owns. */
export const getMyOrgs = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");

  const db = getFirestore();
  const snap = await db.collection("orgs").where("ownerUids", "array-contains", uid).get();
  const orgs = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as OrgDoc;
      const members = await d.ref.collection("members").count().get();
      return {
        id: d.id,
        name: data.name ?? d.id,
        seatLimit: data.seatLimit ?? null,
        seatsUsed: members.data().count,
      };
    }),
  );
  return { orgs };
});

/** Per-member seat status + study readiness for one org the caller owns. */
export const getCohortReadiness = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");
  const orgId = (request.data as { orgId?: string } | undefined)?.orgId;
  if (!orgId || typeof orgId !== "string") {
    throw new HttpsError("invalid-argument", "orgId-required");
  }

  const db = getFirestore();
  const orgSnap = await db.collection("orgs").doc(orgId).get();
  if (!orgSnap.exists) throw new HttpsError("not-found", "org-not-found");
  const org = orgSnap.data() as OrgDoc;

  // Ownership gate — only an owner may read the cohort.
  if (!(org.ownerUids ?? []).includes(uid)) {
    throw new HttpsError("permission-denied", "not-an-owner");
  }

  const banks = org.banks?.length ? org.banks : DEFAULT_BANKS;
  const threshold = typeof org.passThreshold === "number" ? org.passThreshold : 75;
  const now = new Date();

  const memberSnap = await orgSnap.ref.collection("members").get();
  const rows: CohortRow[] = await Promise.all(
    memberSnap.docs.map(async (m) => {
      const email = (m.data()?.email as string | undefined) ?? m.id;
      const userSnap = await db.collection("users").doc(m.id).get();
      const entitlement = userSnap.exists
        ? ((userSnap.data()?.entitlement as Entitlement | undefined) ?? null)
        : null;
      const progSnap = await db
        .collection("users")
        .doc(m.id)
        .collection("progress")
        .doc("summary")
        .get();
      const summary = progSnap.exists ? (progSnap.data() as never) : null;
      // A claimed member always has (or had) a seat; invites for unregistered
      // members aren't in `members` yet, so hasInvite is not needed here.
      return cohortRow({ email, entitlement, hasInvite: false, summary }, banks, threshold, now);
    }),
  );
  rows.sort((a, b) => a.email.localeCompare(b.email));

  const readyCount = rows.filter((r) => r.ready).length;
  const activeCount = rows.filter((r) => r.status === "active").length;
  return {
    orgId,
    name: org.name ?? orgId,
    threshold,
    banks,
    counts: { total: rows.length, active: activeCount, ready: readyCount },
    rows,
  };
});

/** Provision new seats for an org (admin invites new members). */
export const provisionSeats = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");

  const parsed = parseProvisionInput(request.data);
  if (!parsed.ok) throw new HttpsError("invalid-argument", parsed.code);
  const { orgId, emails, expiresAt } = parsed.value;

  const db = getFirestore();
  const orgSnap = await db.collection("orgs").doc(orgId).get();
  if (!orgSnap.exists) throw new HttpsError("not-found", "org-not-found");
  const org = orgSnap.data() as OrgDoc;

  // Ownership gate.
  if (!(org.ownerUids ?? []).includes(uid)) {
    throw new HttpsError("permission-denied", "not-an-owner");
  }

  // Seat-limit check (only when the org has a limit — skip the count read otherwise).
  const seatLimit = org.seatLimit;
  if (typeof seatLimit === "number") {
    const memberSnap = await orgSnap.ref.collection("members").count().get();
    const seatsUsed = memberSnap.data().count;
    const check = checkSeatLimit({ seatsUsed, seatLimit, requested: emails.length });
    if (!check.ok) throw new HttpsError("resource-exhausted", check.message);
  }

  // Create invites (or update if already exists, idempotent via merge=true).
  const results = await Promise.all(
    emails.map(async (email) => {
      const invite = buildInvite(email, orgId, { expiresAt });
      if (!invite) return { email, success: false, error: "invalid-email" };
      try {
        await db.collection("schoolInvites").doc(invite.key).set(invite.doc, { merge: true });
        return { email: invite.doc.email, success: true };
      } catch (err) {
        return {
          email,
          success: false,
          error: err instanceof Error ? err.message : "unknown-error",
        };
      }
    }),
  );

  return { results };
});
