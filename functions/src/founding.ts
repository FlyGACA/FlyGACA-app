/**
 * `claimFoundingAccess` (callable): grandfathers a pre-launch account with a
 * complimentary, time-limited Pro window when monetization is turned on. The app
 * calls this on sign-in for a verified, still-free user; the server re-checks
 * eligibility (account created before the launch cutoff, read from the Admin SDK) and
 * grants once.
 *
 * Like the other grant callables this is the ONLY writer of this entitlement on the
 * live path (Admin SDK bypasses firestore.rules; clients can never write
 * `entitlement`). It only ever GRANTS Pro to a currently-free account, so it can't
 * clobber a paying/staff/school user. One grant per account, ever — the
 * `foundingGrants/{uid}` marker's create() is the lock, so a retry or a second device
 * can't stack extra days or re-grant after the window lapses.
 */
import { onCall, HttpsError } from "firebase-functions/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { effectivePlan, type Entitlement } from "./billing-core.js";
import { foundingEntitlement, isFoundingEligible } from "./founding-core.js";
import { REGION } from "./region.js";

if (getApps().length === 0) initializeApp();

export const claimFoundingAccess = onCall(
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

    const emailVerified = request.auth?.token?.email_verified as boolean | undefined;
    if (!emailVerified) return { granted: false as const };

    // Eligibility = the account predates the launch cutoff. creationTime is a
    // server-only signal (not in the ID token), so it can't be spoofed by the client.
    const userRecord = await getAuth().getUser(uid);
    const creationTimeMs = Date.parse(userRecord.metadata.creationTime);
    if (!isFoundingEligible(creationTimeMs)) return { granted: false as const };

    const db = getFirestore();
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const current = snap.exists
      ? (snap.data()?.entitlement as Entitlement | undefined)
      : undefined;
    // Never touch a user who already has an active plan (paid / staff / school / a
    // still-active founding grant) — the comp is for free accounts only.
    if (effectivePlan(current) !== "free") return { granted: false as const, already: true as const };

    // One founding grant per account, ever. create() fails if the marker exists, so a
    // lapsed grant is never silently renewed.
    const claimed = await db
      .collection("foundingGrants")
      .doc(uid)
      .create({ grantedAt: FieldValue.serverTimestamp() })
      .then(() => true)
      .catch(() => false);
    if (!claimed) return { granted: false as const, already: true as const };

    await ref.set({ entitlement: foundingEntitlement(new Date(), current) }, { merge: true });
    logger.info("funnel", { event: "founding_granted", uid });
    return { granted: true as const, plan: "pro" as const };
  },
);
