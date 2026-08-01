#!/usr/bin/env node
/**
 * Mint a licensed Captain Adel API key for a partner tenant. Writes `apiKeys/{hash}`
 * (only the SHA-256 hash is stored — the raw key is shown here EXACTLY ONCE) and
 * prints the key to copy to the partner. The gateway's `POST /v1/ask` looks the hash
 * up, enforces the tier's monthly quota, and meters usage (see functions/src/gateway.ts
 * + api-tier-core.ts).
 *
 * The key format + tier list below MIRROR functions/src/api-key-core.ts and
 * api-tier-core.ts — keep them in sync (same convention as grant-staff-access.mjs).
 *
 * Usage (run from the functions/ directory, where firebase-admin is installed):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/mint-api-key.mjs --tenant "Acme Aviation" --tier growth
 *   # or with gcloud application-default credentials for the project.
 *
 * Flags: --tenant "<name>" (required) · --tier starter|growth|enterprise (default
 * starter) · --dry-run (mint + hash + print, but write nothing).
 */
import { createHash, randomBytes } from "node:crypto";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// --- key + tier policy (mirror of api-key-core.ts / api-tier-core.ts) ----------
const API_KEY_PREFIX = "flygaca_live_";
const newApiKey = () => API_KEY_PREFIX + randomBytes(24).toString("hex");
const hashApiKey = (key) => createHash("sha256").update(key.trim()).digest("hex");
const keyPreview = (key) => key.slice(0, API_KEY_PREFIX.length + 6);
const TIERS = ["starter", "growth", "enterprise"];
// -------------------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = args.includes("--dry-run");
const tenant = opt("tenant", "");
const tier = opt("tier", "starter");

if (!tenant) {
  console.error('Missing --tenant. Usage: node scripts/mint-api-key.mjs --tenant "Acme" --tier growth');
  process.exit(1);
}
if (!TIERS.includes(tier)) {
  console.error(`Invalid --tier "${tier}". Expected one of: ${TIERS.join(", ")}.`);
  process.exit(1);
}

const key = newApiKey();
const hash = hashApiKey(key);

console.log(`Tenant : ${tenant}`);
console.log(`Tier   : ${tier}`);
console.log(`Preview: ${keyPreview(key)}…`);
console.log(`Hash   : ${hash}`);

if (dryRun) {
  console.log("\n[dry-run] no document written.");
  process.exit(0);
}

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
const db = getFirestore();
await db.collection("apiKeys").doc(hash).set({
  tenant,
  tier,
  active: true,
  preview: keyPreview(key),
  createdAt: FieldValue.serverTimestamp(),
});

console.log("\n✅ Key minted. Copy it to the partner NOW — it is not stored and cannot be shown again:\n");
console.log(`   ${key}\n`);
process.exit(0);
