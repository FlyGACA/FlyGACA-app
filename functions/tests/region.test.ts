/**
 * `REGION` (functions/src/region.ts) is the single source of truth for the Cloud
 * Functions deploy region — but firebase.json's Hosting rewrites can't import it
 * (JSON has no imports), so every rewrite's "region" field has to be kept in sync
 * by hand. This test is the drift guard: it reads the real firebase.json and fails
 * loudly if a rewrite's region silently falls out of sync with REGION, instead of
 * only surfacing as a Hosting deploy-time finalize failure (see commit 5aa6451).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REGION } from "../src/region.js";

const HERE = dirname(fileURLToPath(import.meta.url));

describe("REGION", () => {
  it("is the expected Cloud Functions deploy region", () => {
    // Pinned so a change is a deliberate, reviewed edit — not a silent drift.
    // Moving regions is a migration (new functions, stranding the live ones),
    // never a one-line edit — see the module doc comment.
    expect(REGION).toBe("me-central1");
  });
});

describe("REGION vs firebase.json Hosting rewrites", () => {
  it("matches every /api/* rewrite's region in firebase.json", () => {
    const firebaseJson = JSON.parse(
      readFileSync(resolve(HERE, "../../firebase.json"), "utf8"),
    ) as {
      hosting?: { rewrites?: Array<{ source?: string; function?: string; region?: string }> };
    };
    const rewrites = firebaseJson.hosting?.rewrites ?? [];
    const functionRewrites = rewrites.filter((r) => typeof r.function === "string");

    // There should be at least one function rewrite to actually guard — an empty
    // list here would make this test vacuously (and silently) useless.
    expect(functionRewrites.length).toBeGreaterThan(0);

    for (const rewrite of functionRewrites) {
      expect(rewrite.region, `rewrite for function "${rewrite.function}"`).toBe(REGION);
    }
  });
});
