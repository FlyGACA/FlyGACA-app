#!/usr/bin/env node
/**
 * Report the SEAT status of a Fly GACA school cohort — the shared-tracker view the
 * delivery playbook needs before the in-app admin dashboard exists (docs/b2b). For
 * every email on the roster it reports whether the person has a registered account
 * and an in-force `school` seat, a lapsed one, a pending invite, or nothing — reading
 * only server data that exists today: each account's `entitlement` and the
 * `schoolInvites/{email}` roster.
 *
 * SCOPE: this is the SEAT dimension only. Study coverage / Mock Exam "ready" columns
 * are NOT here — study progress is local-first (src/lib/studyProgress.ts) and isn't
 * persisted server-side, so there is nothing to read per seat until progress sync is
 * built (see docs/b2b/PLAN.md §8). The report is honest about that rather than
 * inventing numbers.
 *
 * The entitlement/status rules MIRROR functions/src/{billing-core,school-core}.ts.
 *
 * Usage (run from functions/ with Admin credentials, e.g. GOOGLE_APPLICATION_CREDENTIALS
 * or gcloud application-default creds):
 *   node scripts/school-cohort-report.mjs --file=roster.csv
 *   node scripts/school-cohort-report.mjs --emails="a@x.com,b@y.com"
 *   node scripts/school-cohort-report.mjs --file=roster.csv --csv=cohort-status.csv
 */
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// --- mirror of functions/src/school-core.ts + billing-core.effectivePlan ------
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
function effectivePlan(ent, now = new Date()) {
  if (!ent || ent.plan === "free") return "free";
  if (!ent.expiresAt) return ent.plan;
  return new Date(ent.expiresAt).getTime() > now.getTime() ? ent.plan : "free";
}
function schoolSeatStatus({ entitlement, hasInvite }, now = new Date()) {
  if (effectivePlan(entitlement, now) === "school") return "active";
  if (entitlement?.plan === "school") return "expired";
  if (hasInvite) return "invited";
  return "none";
}
// -----------------------------------------------------------------------------

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const file = arg("file");
const emailsArg = arg("emails");
const csvOut = arg("csv");

if (!file && !emailsArg) {
  console.error("Provide --file=roster.csv or --emails=a@x.com,b@y.com");
  process.exit(2);
}

const emails = parseSeatEmails(file ? readFileSync(file, "utf8") : emailsArg);
if (emails.length === 0) {
  console.error("No valid email addresses found in the roster.");
  process.exit(2);
}

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();
const now = new Date();

const rows = [];
for (const email of emails) {
  let user = null;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = null; // no account yet
  }

  let entitlement = null;
  if (user) {
    const snap = await db.collection("users").doc(user.uid).get();
    entitlement = snap.exists ? (snap.data()?.entitlement ?? null) : null;
  }
  const inviteSnap = await db.collection("schoolInvites").doc(email).get();
  const hasInvite = inviteSnap.exists;
  const inviteExpires = hasInvite ? (inviteSnap.data()?.expiresAt ?? "") : "";

  const status = schoolSeatStatus({ entitlement, hasInvite }, now);
  rows.push({
    email,
    account: user ? "yes" : "no",
    status,
    source: entitlement?.source ?? "",
    expiresAt: entitlement?.expiresAt ?? inviteExpires ?? "",
  });
}

// Console table.
console.table(
  rows.map((r) => ({
    email: r.email,
    account: r.account,
    seat: r.status,
    source: r.source,
    expires: r.expiresAt ? String(r.expiresAt).slice(0, 10) : "",
  })),
);

// Summary counts by status.
const tally = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
console.log(
  `\n${rows.length} on roster — active: ${tally.active ?? 0}, invited: ${tally.invited ?? 0},` +
    ` expired: ${tally.expired ?? 0}, none: ${tally.none ?? 0}.`,
);
console.log(
  "Seat dimension only — study coverage / Mock Exam readiness needs server-side progress (PLAN.md §8).",
);

if (csvOut) {
  const header = "email,account,seat_status,source,expires_at";
  const csv = [header, ...rows.map((r) => `${r.email},${r.account},${r.status},${r.source},${r.expiresAt}`)].join("\n");
  writeFileSync(csvOut, `${csv}\n`, "utf8");
  console.log(`\nWrote ${rows.length} row(s) to ${csvOut}.`);
}

process.exit(0);
