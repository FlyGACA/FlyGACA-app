/**
 * `claimStaffAccess` (callable): a signed-in user whose VERIFIED email is on the
 * staff allowlist (see ./staff-core) is granted the non-expiring `school`/`staff`
 * entitlement. The app calls this on sign-in so any future `@flygaca.com` account
 * self-unlocks; the one-off `scripts/grant-staff-access.mjs` covers accounts that
 * already exist.
 *
 * Like the billing callables this is the ONLY writer of these entitlements on the
 * live path (Admin SDK bypasses firestore.rules; clients can never write
 * `entitlement`). It only ever GRANTS — it never downgrades, so it can't clobber a
 * paying user; revocation is deliberate (remove from the allowlist + re-run the
 * script to reset). Idempotent: skips the write when the grant is already in place.
 */
import { onCall, HttpsError } from "firebase-functions/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { effectivePlan, type Entitlement } from "./billing-core.js";
import { isStaffEmail, staffEntitlement } from "./staff-core.js";
import { REGION } from "./region.js";

if (getApps().length === 0) initializeApp();

export const claimStaffAccess = onCall(
  {
    region: REGION,
    timeoutSeconds: 20,
    memory: "256MiB",
    maxInstances: 5,
    // App Check on the grant surface, matching the billing callables — a stolen ID
    // token alone can't drive it from outside the app.
    enforceAppCheck: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "sign-in-required");

    const email = request.auth?.token?.email as string | undefined;
    const emailVerified = request.auth?.token?.email_verified as boolean | undefined;
    if (!isStaffEmail(email, emailVerified)) return { granted: false as const };

    const ref = getFirestore().collection("users").doc(uid);
    const snap = await ref.get();
    const current = snap.exists
      ? (snap.data()?.entitlement as Entitlement | undefined)
      : undefined;

    // Idempotent — only write when the staff grant isn't already in force.
    const alreadyStaff = current?.source === "staff" && effectivePlan(current) === "school";
    if (!alreadyStaff) {
      await ref.set({ entitlement: staffEntitlement() }, { merge: true });
    }
    return { granted: true as const, plan: "school" as const };
  },
);
