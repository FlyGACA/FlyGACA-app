/**
 * `claimSchoolSeat` (callable): a signed-in user whose VERIFIED email is eligible
 * for a school seat is granted the `school` entitlement. Two eligibility sources,
 * both admin-controlled (per the "org/seat" plan, docs/b2b/PLAN.md §8):
 *
 *   1. an APPROVED SCHOOL DOMAIN (see ./school-core) — the academy's own mail
 *      domain, self-unlocks like the staff `@flygaca.com` flow; or
 *   2. an INVITE on the roster — a `schoolInvites/{email}` doc an admin provisioned
 *      (server-only; deny-all client writes in firestore.rules), which also carries
 *      an optional `expiresAt` contract end.
 *
 * The app calls this on sign-in so an invited/domain member unlocks without waiting
 * for the `grant-school-seats.mjs` script to be re-run. Like the billing/staff
 * callables this is the ONLY writer of this entitlement on the live path (Admin SDK
 * bypasses firestore.rules; clients can never write `entitlement`). It only ever
 * GRANTS — never downgrades, so it can't clobber a paying or higher-tier user; and
 * it is idempotent, skipping the write when a school-tier grant is already in force.
 */
import { onCall, HttpsError } from "firebase-functions/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { effectivePlan, type Entitlement } from "./billing-core.js";
import { isApprovedSchoolDomain, inviteKeyForEmail, schoolEntitlement } from "./school-core.js";
import { REGION } from "./region.js";

if (getApps().length === 0) initializeApp();

export const claimSchoolSeat = onCall(
  {
    region: REGION,
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 5,
    // App Check on the grant surface, matching the billing/staff callables — a stolen
    // ID token alone can't drive it from outside the app.
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");

    const email = request.auth?.token?.email as string | undefined;
    const emailVerified = request.auth?.token?.email_verified as boolean | undefined;
    if (!emailVerified || !email) return { granted: false as const };

    const db = getFirestore();

    // Source 1 — approved domain (pure, no read). Source 2 — an invite doc the admin
    // provisioned; only looked up when the domain path didn't already qualify.
    let expiresAt: string | undefined;
    let orgId: string | undefined;
    let eligible = isApprovedSchoolDomain(email, emailVerified);
    if (!eligible) {
      const key = inviteKeyForEmail(email);
      if (key) {
        const invite = await db.collection("schoolInvites").doc(key).get();
        if (invite.exists) {
          eligible = true;
          const e = invite.data()?.expiresAt;
          if (typeof e === "string") expiresAt = e;
          const o = invite.data()?.orgId;
          if (typeof o === "string") orgId = o;
        }
      }
    }
    if (!eligible) return { granted: false as const };

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const current = snap.exists
      ? (snap.data()?.entitlement as Entitlement | undefined)
      : undefined;

    // Idempotent + non-downgrading: skip if a school-tier plan is already in force
    // (a live school/staff grant), so we never overwrite it or clobber it.
    if (effectivePlan(current) !== "school") {
      await ref.set({ entitlement: schoolEntitlement(expiresAt) }, { merge: true });
    }

    // If the invite named an org, index this member so the org's owner-verified
    // cohort dashboard can enumerate them (server-only doc; merge = idempotent).
    if (orgId) {
      await db
        .collection("orgs")
        .doc(orgId)
        .collection("members")
        .doc(uid)
        .set({ email: email.trim().toLowerCase(), claimedAt: new Date().toISOString() }, { merge: true });
    }
    return { granted: true as const, plan: "school" as const };
  },
);
