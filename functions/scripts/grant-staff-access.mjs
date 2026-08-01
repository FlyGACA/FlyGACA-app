#!/usr/bin/env node
/**
 * One-off staff-access grant. Sets the non-expiring `school`/`staff` entitlement on
 * every EXISTING Firebase Auth user whose VERIFIED email is on the staff allowlist,
 * so accounts that already exist get access without waiting for the sign-in
 * callable. Idempotent — safe to re-run whenever new staff join.
 *
 * The allowlist below MIRRORS functions/src/staff-core.ts — keep the two in sync.
 *
 * Usage (run from the functions/ directory, where firebase-admin is installed):
 *   # with a service-account key:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/grant-staff-access.mjs [--dry-run]
 *   # or with gcloud application-default credentials for the project.
 *
 * --dry-run prints who WOULD be granted without writing anything.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// --- staff policy (mirror of functions/src/staff-core.ts) ---------------------
const STAFF_EMAILS = ["ay2m@hotmail.com"];
const STAFF_DOMAINS = ["flygaca.com"];
function isStaffEmail(email, emailVerified) {
  if (!emailVerified || !email) return false;
  const e = String(email).trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return false;
  if (STAFF_EMAILS.includes(e)) return true;
  return STAFF_DOMAINS.includes(e.slice(at + 1));
}
const STAFF_ENTITLEMENT = { plan: "school", source: "staff" };
// -----------------------------------------------------------------------------

const dryRun = process.argv.includes("--dry-run");

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

let scanned = 0;
let granted = 0;
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const u of page.users) {
    scanned += 1;
    if (!isStaffEmail(u.email, u.emailVerified)) continue;
    console.log(`${dryRun ? "[dry-run] would grant" : "granting"} school/staff → ${u.email} (${u.uid})`);
    if (!dryRun) {
      await db.collection("users").doc(u.uid).set({ entitlement: STAFF_ENTITLEMENT }, { merge: true });
    }
    granted += 1;
  }
  pageToken = page.pageToken;
} while (pageToken);

console.log(`\nDone. Scanned ${scanned} user(s); ${dryRun ? "would grant" : "granted"} ${granted}.`);
process.exit(0);
