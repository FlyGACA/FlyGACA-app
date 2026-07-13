#!/usr/bin/env node
/**
 * Mint a licensed-API key for the /v1/ask endpoint. Generates an opaque key, stores
 * only its SHA-256 hash (apiKeys/{hash}) with metadata, and prints the raw key ONCE
 * — it can't be recovered later, so hand it to the partner now. Key generation +
 * hashing MIRROR functions/src/api-key-core.ts.
 *
 * Usage (run from functions/ with Admin credentials):
 *   node scripts/mint-api-key.mjs --label="Acme LMS" [--owner=acme]
 *   node scripts/mint-api-key.mjs --revoke=<sha256-hash>   # disable a key
 */
import { createHash, randomBytes } from "node:crypto";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const API_KEY_PREFIX = "flygaca_live_";
const newApiKey = () => API_KEY_PREFIX + randomBytes(24).toString("hex");
const hashApiKey = (key) => createHash("sha256").update(key.trim()).digest("hex");

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const revoke = arg("revoke");
if (revoke) {
  await db.collection("apiKeys").doc(revoke).set({ active: false }, { merge: true });
  console.log(`Revoked apiKeys/${revoke} (active=false).`);
  process.exit(0);
}

const label = arg("label");
const owner = arg("owner");
if (!label) {
  console.error('A --label is required, e.g. --label="Acme LMS"');
  process.exit(2);
}

const key = newApiKey();
const hash = hashApiKey(key);
await db.collection("apiKeys").doc(hash).set({
  active: true,
  label,
  owner: owner ?? null,
  createdAt: FieldValue.serverTimestamp(),
});

console.log("API key minted. Store it now — it will NOT be shown again:\n");
console.log(`  ${key}\n`);
console.log(`  hash (apiKeys id): ${hash}`);
console.log(`  label: ${label}${owner ? ` · owner: ${owner}` : ""}`);
console.log("\nUsage: POST /api/v1/ask  with header  X-Api-Key: <key>  and JSON { \"message\": \"…\" }");
process.exit(0);
