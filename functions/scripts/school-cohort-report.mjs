#!/usr/bin/env node
/**
 * Report a Fly GACA school cohort's SEAT status and study READINESS — the
 * shared-tracker view the delivery playbook needs before the in-app admin dashboard
 * exists (docs/b2b). For every email on the roster it reports the seat (registered +
 * in-force `school` seat / lapsed / pending invite / none) and, from the seat's synced
 * study progress, coverage (quiz banks ≥ threshold), best Mock Exam %, and whether
 * they're READY to sit. Reads server data: each account's `entitlement`, the
 * `schoolInvites/{email}` roster, and `users/{uid}/progress/summary` (populated once
 * study-progress sync is enabled + deployed; a seat with none shows `ready: —`).
 *
 * Readiness = every expected quiz bank ≥ threshold AND Mock Exam ≥ threshold. The
 * expected banks default to the AIP pack (`aip-ais`, `airspace`); override with
 * `--banks=`. Threshold defaults to 75; override with `--threshold=`.
 *
 * The entitlement/status/readiness rules MIRROR functions/src/{billing-core,school-core}.ts.
 *
 * Usage (run from functions/ with Admin credentials, e.g. GOOGLE_APPLICATION_CREDENTIALS
 * or gcloud application-default creds):
 *   node scripts/school-cohort-report.mjs --file=roster.csv
 *   node scripts/school-cohort-report.mjs --emails="a@x.com,b@y.com" --threshold=80
 *   node scripts/school-cohort-report.mjs --file=roster.csv --banks=aip-ais,airspace --csv=out.csv
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
function schoolReadiness(summary, expectedBanks, threshold = 75) {
  const quizBest = summary?.quizBest ?? {};
  const examBest = summary?.examBest ?? 0;
  const coveredBanks = expectedBanks.filter((b) => (quizBest[b] ?? 0) >= threshold).length;
  const totalBanks = expectedBanks.length;
  const ready = totalBanks > 0 && coveredBanks === totalBanks && examBest >= threshold;
  return { coveredBanks, totalBanks, examBest, ready };
}
// The AIP prep pack's quiz banks (src/pages/study/packCatalog.ts, pack `aip`).
const DEFAULT_BANKS = ["aip-ais", "airspace"];
// -----------------------------------------------------------------------------

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const file = arg("file");
const emailsArg = arg("emails");
const csvOut = arg("csv");
const banksArg = arg("banks"); // comma-separated quiz banks; default the AIP pack
const thresholdArg = arg("threshold"); // pass mark %, default 75

if (!file && !emailsArg) {
  console.error("Provide --file=roster.csv or --emails=a@x.com,b@y.com");
  process.exit(2);
}

const expectedBanks = banksArg
  ? banksArg
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean)
  : DEFAULT_BANKS;
const threshold = thresholdArg ? Number(thresholdArg) : 75;
if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
  console.error(`Invalid --threshold: ${thresholdArg} (use 0–100)`);
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
  let summary = null;
  if (user) {
    const snap = await db.collection("users").doc(user.uid).get();
    entitlement = snap.exists ? (snap.data()?.entitlement ?? null) : null;
    const progSnap = await db
      .collection("users")
      .doc(user.uid)
      .collection("progress")
      .doc("summary")
      .get();
    summary = progSnap.exists ? progSnap.data() : null;
  }
  const inviteSnap = await db.collection("schoolInvites").doc(email).get();
  const hasInvite = inviteSnap.exists;
  const inviteExpires = hasInvite ? (inviteSnap.data()?.expiresAt ?? "") : "";

  const status = schoolSeatStatus({ entitlement, hasInvite }, now);
  const readiness = schoolReadiness(summary, expectedBanks, threshold);
  rows.push({
    email,
    account: user ? "yes" : "no",
    status,
    source: entitlement?.source ?? "",
    expiresAt: entitlement?.expiresAt ?? inviteExpires ?? "",
    coverage: `${readiness.coveredBanks}/${readiness.totalBanks}`,
    examBest: readiness.examBest,
    ready: summary ? (readiness.ready ? "yes" : "no") : "—", // "—" = no progress synced yet
    lastActive: summary?.updatedAt ? String(summary.updatedAt).slice(0, 10) : "",
  });
}

// Console table.
console.table(
  rows.map((r) => ({
    email: r.email,
    account: r.account,
    seat: r.status,
    coverage: r.coverage,
    examBest: r.examBest,
    ready: r.ready,
    active: r.lastActive,
  })),
);

// Summary counts by status + readiness.
const tally = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
const readyCount = rows.filter((r) => r.ready === "yes").length;
const noProgress = rows.filter((r) => r.ready === "—").length;
console.log(
  `\n${rows.length} on roster — active: ${tally.active ?? 0}, invited: ${tally.invited ?? 0},` +
    ` expired: ${tally.expired ?? 0}, none: ${tally.none ?? 0}.`,
);
console.log(
  `Readiness (banks ${expectedBanks.join("+")} at ≥${threshold}% + Mock Exam ≥${threshold}%):` +
    ` ${readyCount} ready, ${noProgress} with no progress synced yet.`,
);

if (csvOut) {
  const header = "email,account,seat_status,source,expires_at,coverage,exam_best,ready,last_active";
  const csv = [
    header,
    ...rows.map((r) =>
      [r.email, r.account, r.status, r.source, r.expiresAt, r.coverage, r.examBest, r.ready, r.lastActive].join(","),
    ),
  ].join("\n");
  writeFileSync(csvOut, `${csv}\n`, "utf8");
  console.log(`\nWrote ${rows.length} row(s) to ${csvOut}.`);
}

process.exit(0);
