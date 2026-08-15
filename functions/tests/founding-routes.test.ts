/**
 * Wrapper-level tests for the `claimFoundingAccess` callable (functions/src/founding.ts)
 * — the Firestore/Auth-writing grant layer that founding-core.test.ts doesn't reach.
 * Driven through the CallableFunction's `.run(request)` escape hatch (see
 * firebase-functions' onCall — `.run` invokes the handler directly, bypassing
 * HTTP/App Check/CORS), with firebase-admin's Auth + Firestore mocked behind a tiny
 * in-memory store honouring the create() semantics the one-grant-ever marker relies
 * on. Mirrors the mocking style of staff-routes.test.ts / billing-webhook.test.ts.
 *
 * `claimFoundingAccess` is the only writer of a founding entitlement on the live path
 * (Admin SDK bypasses firestore.rules), so its guards are load-bearing: it must never
 * grant to an unverified or ineligible account, never touch a non-free (paid/staff/
 * school) user, and grant at most once per account ever.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";
import { FOUNDING_CUTOFF_ISO } from "../src/founding-core.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** An ISO creationTime strictly before the launch cutoff → founding-eligible. */
const BEFORE_CUTOFF = new Date(Date.parse(FOUNDING_CUTOFF_ISO) - DAY_MS).toISOString();
/** An ISO creationTime at/after the cutoff → NOT eligible (post-launch signup). */
const AFTER_CUTOFF = new Date(Date.parse(FOUNDING_CUTOFF_ISO) + DAY_MS).toISOString();

const h = vi.hoisted(() => ({
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
  creationTime: "" as string,
}));

function makeDoc(coll: string, id: string) {
  return {
    get: () =>
      Promise.resolve({
        get exists() {
          return h.stores[coll]?.[id] !== undefined;
        },
        data: () => h.stores[coll]?.[id],
      }),
    set: (val: Record<string, unknown>, opts?: { merge?: boolean }) => {
      h.stores[coll] ??= {};
      const cur = h.stores[coll][id];
      h.stores[coll][id] = opts?.merge ? { ...(cur ?? {}), ...val } : val;
      return Promise.resolve();
    },
    // The one-grant-ever lock: create() rejects if the marker already exists, so a
    // retry or a second device can't re-grant after the window lapses.
    create: (val: Record<string, unknown>) => {
      if (h.stores[coll]?.[id] !== undefined) return Promise.reject(new Error("already-exists"));
      h.stores[coll] ??= {};
      h.stores[coll][id] = val;
      return Promise.resolve();
    },
  };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => ({ doc: (id: string) => makeDoc(c, id) }) }),
  FieldValue: { serverTimestamp: () => ({ __ts: true }) },
}));
vi.mock("firebase-admin/auth", () => ({
  // creationTime is the server-only eligibility signal (not in the ID token).
  getAuth: () => ({
    getUser: () => Promise.resolve({ metadata: { creationTime: h.creationTime } }),
  }),
}));
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

let claimFoundingAccess: (
  request: CallableRequest<unknown>,
) => Promise<{ granted: boolean; already?: boolean; plan?: "pro" }>;

beforeAll(async () => {
  const mod = await import("../src/founding.js");
  claimFoundingAccess = (request) => mod.claimFoundingAccess.run(request);
});

beforeEach(() => {
  h.stores = {};
  h.creationTime = BEFORE_CUTOFF;
});

afterEach(() => vi.clearAllMocks());

/** Minimal CallableRequest — only the fields founding.ts actually reads. */
function req(auth?: { uid: string; emailVerified?: boolean }): CallableRequest<unknown> {
  return {
    data: undefined,
    auth: auth
      ? { uid: auth.uid, token: { email_verified: auth.emailVerified } as never, rawToken: "raw" }
      : undefined,
    rawRequest: {} as never,
    acceptsStreaming: false,
  };
}

function entitlementOf(uid: string): Record<string, unknown> | undefined {
  return h.stores.users?.[uid]?.entitlement as Record<string, unknown> | undefined;
}

describe("claimFoundingAccess — auth & verification gate", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(claimFoundingAccess(req())).rejects.toMatchObject({ code: "unauthenticated" });
    expect(h.stores.users).toBeUndefined();
    expect(h.stores.foundingGrants).toBeUndefined();
  });

  it("does not grant when the email is unverified", async () => {
    const result = await claimFoundingAccess(req({ uid: "u1", emailVerified: false }));
    expect(result).toEqual({ granted: false });
    expect(h.stores.users).toBeUndefined();
    expect(h.stores.foundingGrants).toBeUndefined();
  });

  it("does not grant when emailVerified is missing entirely", async () => {
    const result = await claimFoundingAccess(req({ uid: "u2" }));
    expect(result).toEqual({ granted: false });
    expect(entitlementOf("u2")).toBeUndefined();
  });
});

describe("claimFoundingAccess — eligibility (account creation time)", () => {
  it("does not grant an account created at/after the launch cutoff", async () => {
    h.creationTime = AFTER_CUTOFF;
    const result = await claimFoundingAccess(req({ uid: "u3", emailVerified: true }));
    expect(result).toEqual({ granted: false });
    expect(entitlementOf("u3")).toBeUndefined();
    expect(h.stores.foundingGrants?.u3).toBeUndefined();
  });
});

describe("claimFoundingAccess — successful grant", () => {
  it("grants a time-limited Pro window to a verified, eligible, free account", async () => {
    const result = await claimFoundingAccess(req({ uid: "u4", emailVerified: true }));
    expect(result).toEqual({ granted: true, plan: "pro" });
    const ent = entitlementOf("u4");
    expect(ent).toMatchObject({ plan: "pro", source: "founding" });
    expect(typeof ent?.expiresAt).toBe("string");
    // Grant window is in the future.
    expect(Date.parse(ent!.expiresAt as string)).toBeGreaterThan(Date.now());
    // The one-grant-ever marker was written.
    expect(h.stores.foundingGrants?.u4).toBeDefined();
  });
});

describe("claimFoundingAccess — never downgrades a non-free account", () => {
  it("skips a user who already holds an active paid plan", async () => {
    h.stores.users = {
      u5: { entitlement: { plan: "pro", source: "moyasar", expiresAt: "2099-01-01T00:00:00.000Z" } },
    };
    const result = await claimFoundingAccess(req({ uid: "u5", emailVerified: true }));
    expect(result).toEqual({ granted: false, already: true });
    // The paid entitlement is untouched and no grant marker is written.
    expect(entitlementOf("u5")).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(h.stores.foundingGrants?.u5).toBeUndefined();
  });
});

describe("claimFoundingAccess — one grant per account, ever", () => {
  it("does not re-grant once the marker exists, even for a now-free account", async () => {
    // A prior founding window that has since lapsed: the account reads as free again,
    // but the marker create() must still fail so the comp is never silently renewed.
    h.stores.foundingGrants = { u6: { grantedAt: "long-ago" } };
    const result = await claimFoundingAccess(req({ uid: "u6", emailVerified: true }));
    expect(result).toEqual({ granted: false, already: true });
    expect(entitlementOf("u6")).toBeUndefined();
  });
});
