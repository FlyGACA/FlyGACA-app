/**
 * Wrapper-level tests for the `claimSchoolSeat` callable (functions/src/school.ts) —
 * the Firestore-writing layer that `school-core.test.ts` doesn't reach. Exercised via
 * the CallableFunction's `.run(request)` escape hatch (see firebase-functions'
 * onCall — `.run` invokes the handler directly, bypassing HTTP/App Check/CORS), with
 * firebase-admin mocked behind a tiny path-keyed in-memory Firestore so nested
 * `orgs/{orgId}/members/{uid}` writes work alongside the flat `users/{uid}` doc.
 * Mirrors the mocking style of gateway-routes.test.ts / billing-webhook.test.ts.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";

type Data = Record<string, unknown>;

const h = vi.hoisted(() => ({ store: new Map<string, Data>() }));

function docRef(path: string) {
  return {
    get: () =>
      Promise.resolve({
        get exists() {
          return h.store.has(path);
        },
        data: () => h.store.get(path),
      }),
    set: (val: Data, opts?: { merge?: boolean }) => {
      const cur = h.store.get(path);
      h.store.set(path, opts?.merge ? { ...(cur ?? {}), ...val } : val);
      return Promise.resolve();
    },
    collection: (name: string) => collectionRef(`${path}/${name}`),
  };
}
function collectionRef(path: string) {
  return { doc: (id: string) => docRef(`${path}/${id}`) };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => collectionRef(c) }),
}));

let claimSchoolSeat: (
  request: CallableRequest<unknown>,
) => Promise<{ granted: boolean; plan?: "school" }>;

beforeAll(async () => {
  const mod = await import("../src/school.js");
  claimSchoolSeat = (request) => mod.claimSchoolSeat.run(request);
});

beforeEach(() => {
  h.store.clear();
});

afterEach(() => vi.clearAllMocks());

function user(uid: string): Data | undefined {
  return h.store.get(`users/${uid}`);
}
function seedUser(uid: string, entitlement: Data) {
  h.store.set(`users/${uid}`, { entitlement });
}
function seedInvite(email: string, doc: Data) {
  h.store.set(`schoolInvites/${email}`, doc);
}

/** Minimal CallableRequest — only the fields school.ts actually reads. */
function req(
  auth?: { uid: string; email?: string; emailVerified?: boolean },
): CallableRequest<unknown> {
  return {
    data: undefined,
    auth: auth
      ? {
        uid: auth.uid,
        token: { email: auth.email, email_verified: auth.emailVerified } as never,
        rawToken: "raw",
      }
      : undefined,
    rawRequest: {} as never,
    acceptsStreaming: false,
  };
}

describe("claimSchoolSeat — auth", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(claimSchoolSeat(req())).rejects.toMatchObject({ code: "unauthenticated" });
  });
});

describe("claimSchoolSeat — unverified email rejection", () => {
  it("does not grant even with a matching invite when the email is unverified", async () => {
    seedInvite("student@example.com", { email: "student@example.com", orgId: "org1" });
    const result = await claimSchoolSeat(
      req({ uid: "u1", email: "student@example.com", emailVerified: false }),
    );
    expect(result).toEqual({ granted: false });
    expect(user("u1")).toBeUndefined();
  });

  it("does not grant when there is no email on the token", async () => {
    const result = await claimSchoolSeat(req({ uid: "u2", emailVerified: true }));
    expect(result).toEqual({ granted: false });
  });
});

describe("claimSchoolSeat — not eligible", () => {
  it("does not grant a verified email with no matching invite and no domain match", async () => {
    const result = await claimSchoolSeat(
      req({ uid: "u3", email: "nobody@example.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: false });
    expect(user("u3")).toBeUndefined();
  });
});

describe("claimSchoolSeat — successful grant", () => {
  it("grants a school seat to a verified email on the invite roster", async () => {
    seedInvite("student@example.com", { email: "student@example.com" });
    const result = await claimSchoolSeat(
      req({ uid: "u4", email: "student@example.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(user("u4")?.entitlement).toEqual({ plan: "school", source: "school" });
  });

  it("carries the invite's expiresAt onto the granted entitlement", async () => {
    seedInvite("timed@example.com", {
      email: "timed@example.com",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    const result = await claimSchoolSeat(
      req({ uid: "u5", email: "timed@example.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(user("u5")?.entitlement).toEqual({
      plan: "school",
      source: "school",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
  });

  it("indexes the member under the invite's org so the cohort dashboard can see them", async () => {
    seedInvite("member@example.com", { email: "member@example.com", orgId: "org-42" });
    await claimSchoolSeat(req({ uid: "u6", email: "member@example.com", emailVerified: true }));
    const member = h.store.get("orgs/org-42/members/u6");
    expect(member).toMatchObject({ email: "member@example.com" });
    expect(typeof member?.claimedAt).toBe("string");
  });

  it("normalizes the email casing when indexing the org member", async () => {
    seedInvite("mixedcase@example.com", { email: "mixedcase@example.com", orgId: "org-9" });
    await claimSchoolSeat(
      req({ uid: "u7", email: "  MixedCase@Example.com  ", emailVerified: true }),
    );
    // inviteKeyForEmail lowercases+trims, so the invite lookup still matches, and the
    // member index is written with the normalized address.
    const member = h.store.get("orgs/org-9/members/u7");
    expect(member?.email).toBe("mixedcase@example.com");
  });
});

describe("claimSchoolSeat — idempotency / never downgrades", () => {
  it("does not overwrite an already-active school-tier entitlement with an invite grant", async () => {
    // A permanent staff grant is strictly better than a fresh, possibly-expiring
    // school-seat grant — claiming an invite must not clobber it.
    seedUser("u8", { plan: "school", source: "staff" });
    seedInvite("staffer@example.com", {
      email: "staffer@example.com",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    const result = await claimSchoolSeat(
      req({ uid: "u8", email: "staffer@example.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(user("u8")?.entitlement).toEqual({ plan: "school", source: "staff" });
  });

  it("still indexes the org member even when the entitlement write is skipped", async () => {
    seedUser("u9", { plan: "school", source: "staff" });
    seedInvite("staffer2@example.com", { email: "staffer2@example.com", orgId: "org-7" });
    await claimSchoolSeat(
      req({ uid: "u9", email: "staffer2@example.com", emailVerified: true }),
    );
    expect(user("u9")?.entitlement).toEqual({ plan: "school", source: "staff" });
    expect(h.store.get("orgs/org-7/members/u9")).toMatchObject({ email: "staffer2@example.com" });
  });

  it("is idempotent when called twice for the same already-eligible member", async () => {
    seedInvite("repeat@example.com", { email: "repeat@example.com" });
    const first = await claimSchoolSeat(
      req({ uid: "u10", email: "repeat@example.com", emailVerified: true }),
    );
    const second = await claimSchoolSeat(
      req({ uid: "u10", email: "repeat@example.com", emailVerified: true }),
    );
    expect(first).toEqual(second);
    expect(user("u10")?.entitlement).toEqual({ plan: "school", source: "school" });
  });
});
