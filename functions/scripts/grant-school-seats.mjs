#!/usr/bin/env node
/**
 * Provision (or revoke) Fly GACA school seats. Grants the `school`/`school`
 * entitlement — non-expiring, or dated to a contract end — to every account whose
 * email is on the roster you pass. Schools are invoiced offline, so this is the
 * day-one seat mechanism (a self-serve seat dashboard can follow). Idempotent;
 * safe to re-run as a roster changes.
 *
 * The email parsing + entitlement shape MIRROR functions/src/school-core.ts.
 *
 * Usage (run from functions/ with Admin credentials, e.g. GOOGLE_APPLICATION_CREDENTIALS
 * or gcloud application-default creds):
 *   node scripts/grant-school-seats.mjs --file=roster.csv [--expires=2027-06-30] [--dry-run]
 *   node scripts/grant-school-seats.mjs --emails="a@x.com,b@y.com"
 *   node scripts/grant-school-seats.mjs --file=roster.csv --revoke   # offboard → free
 *
 * roster.csv: one email per line (a leading "email" header is ignored). Emails with
 * no Fly GACA account yet are reported as skipped — re-run after they sign in.
 */
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// --- mirror of functions/src/school-core.ts -----------------------------------
function schoolEntitlement(expiresAt) {
  return expiresAt
    ? { plan: "school", source: "school", expiresAt }
    : { plan: "school", source: "school" };
}
function parseSeatEmails(text) {
  const seen = new Set();
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e || e === "email") continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue;
    seen.add(e);
  }
  return [...seen];
}
// -----------------------------------------------------------------------------

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const dryRun = process.argv.includes("--dry-run");
const revoke = process.argv.includes("--revoke");
const file = arg("file");
const emailsArg = arg("emails");
const expiresArg = arg("expires"); // YYYY-MM-DD (contract end), optional

if (!file && !emailsArg) {
  console.error("Provide --file=roster.csv or --emails=a@x.com,b@y.com");
  process.exit(2);
}

let expiresAt;
if (expiresArg) {
  const d = new Date(`${expiresArg}T23:59:59Z`);
  if (Number.isNaN(d.getTime())) {
    console.error(`Invalid --expires date: ${expiresArg} (use YYYY-MM-DD)`);
    process.exit(2);
  }
  expiresAt = d.toISOString();
}

const emails = parseSeatEmails(file ? readFileSync(file, "utf8") : emailsArg);
if (emails.length === 0) {
  console.error("No valid email addresses found in the roster.");
  process.exit(2);
}

const entitlement = revoke ? { plan: "free" } : schoolEntitlement(expiresAt);
const label = revoke ? "revoke → free" : `grant school${expiresAt ? ` (until ${expiresArg})` : ""}`;

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

let done = 0;
const skipped = [];
for (const email of emails) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    skipped.push(email); // no account yet — re-run after they sign in
    continue;
  }
  console.log(`${dryRun ? "[dry-run] would " : ""}${label} → ${email} (${user.uid})`);
  if (!dryRun) {
    await db.collection("users").doc(user.uid).set({ entitlement }, { merge: true });
  }
  done += 1;
}

console.log(`\nDone. ${dryRun ? "Would apply to" : "Applied to"} ${done} of ${emails.length} email(s).`);
if (skipped.length) {
  console.log(`No account yet (skipped, re-run after they sign in): ${skipped.join(", ")}`);
}
process.exit(0);
