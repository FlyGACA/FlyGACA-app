#!/usr/bin/env node
/**
 * Create (or update) a Fly GACA B2B org (school) record — the `orgs/{orgId}` doc the
 * `/business/admin` cohort dashboard reads (docs/b2b/DESIGN-admin-dashboard.md). Sets
 * the org's name, its admin owner(s), seat limit, pass threshold and expected quiz
 * banks. Owners are given by email and resolved to uids (they must have signed in at
 * least once). Idempotent; safe to re-run to add owners or change settings.
 *
 * Usage (run from functions/ with Admin credentials, e.g. GOOGLE_APPLICATION_CREDENTIALS
 * or gcloud application-default creds):
 *   node scripts/grant-org.mjs --id=riyadh-flight --name="Riyadh Flight Academy" \
 *     --owners="head@academy.edu.sa" [--seat-limit=25] [--threshold=75] \
 *     [--banks=aip-ais,airspace] [--domains=academy.edu.sa]
 *
 * Provision seats into the org afterwards with:
 *   node scripts/grant-school-seats.mjs --file=roster.csv --org=riyadh-flight
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
function list(v) {
  return v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

const id = arg("id");
const name = arg("name");
const ownerEmails = list(arg("owners")).map((e) => e.toLowerCase());
const seatLimit = arg("seat-limit") ? Number(arg("seat-limit")) : undefined;
const threshold = arg("threshold") ? Number(arg("threshold")) : 75;
const banks = list(arg("banks"));
const domains = list(arg("domains")).map((d) => d.toLowerCase());

if (!id || !name || ownerEmails.length === 0) {
  console.error('Provide --id, --name and --owners="a@x.com,b@y.com".');
  process.exit(2);
}
if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
  console.error(`Invalid --threshold: ${arg("threshold")} (use 0–100)`);
  process.exit(2);
}

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

const ownerUids = [];
const missing = [];
for (const email of ownerEmails) {
  try {
    const u = await auth.getUserByEmail(email);
    ownerUids.push(u.uid);
  } catch {
    missing.push(email);
  }
}
if (ownerUids.length === 0) {
  console.error(`No owner account found for: ${ownerEmails.join(", ")}. They must sign in first.`);
  process.exit(1);
}

const ref = db.collection("orgs").doc(id);
const exists = (await ref.get()).exists;
const doc = {
  name,
  // arrayUnion so re-running adds owners without dropping existing ones.
  ownerUids: FieldValue.arrayUnion(...ownerUids),
  passThreshold: threshold,
  ...(seatLimit !== undefined ? { seatLimit } : {}),
  ...(banks.length ? { banks } : {}),
  ...(domains.length ? { approvedDomains: domains } : {}),
  ...(exists ? {} : { createdAt: new Date().toISOString() }),
};
await ref.set(doc, { merge: true });

console.log(`${exists ? "Updated" : "Created"} org "${name}" (${id}).`);
console.log(`Owners resolved: ${ownerUids.length} of ${ownerEmails.length}.`);
if (missing.length) console.log(`No account yet (re-run after they sign in): ${missing.join(", ")}`);
process.exit(0);
