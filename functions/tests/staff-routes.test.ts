/**
 * Wrapper-level tests for the `claimStaffAccess` callable (functions/src/staff.ts) —
 * the Firestore-writing layer that `staff-core.test.ts` doesn't reach. Exercised via
 * the CallableFunction's `.run(request)` escape hatch (see firebase-functions'
 * onCall — `.run` invokes the handler directly, bypassing HTTP/App Check/CORS), with
 * firebase-admin mocked behind a tiny in-memory Firestore. Mirrors the mocking style
 * of gateway-routes.test.ts / billing-webhook.test.ts.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";

const h = vi.hoisted(() => ({
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
  setSpy: vi.fn(),
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
      h.setSpy(coll, id, val, opts);
      h.stores[coll] ??= {};
      const cur = h.stores[coll][id];
      h.stores[coll][id] = opts?.merge ? { ...(cur ?? {}), ...val } : val;
      return Promise.resolve();
    },
  };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => ({ doc: (id: string) => makeDoc(c, id) }) }),
}));

let claimStaffAccess: (
  request: CallableRequest<unknown>,
) => Promise<{ granted: boolean; plan?: "school" }>;

beforeAll(async () => {
  const mod = await import("../src/staff.js");
  claimStaffAccess = (request) => mod.claimStaffAccess.run(request);
});

beforeEach(() => {
  h.stores = {};
  h.setSpy.mockClear();
});

afterEach(() => vi.clearAllMocks());

/** Minimal CallableRequest — only the fields staff.ts actually reads. */
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

describe("claimStaffAccess — auth", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(claimStaffAccess(req())).rejects.toMatchObject({ code: "unauthenticated" });
    expect(h.setSpy).not.toHaveBeenCalled();
  });
});

describe("claimStaffAccess — successful grant", () => {
  it("grants a verified allowlisted address and writes the non-expiring staff entitlement", async () => {
    const result = await claimStaffAccess(
      req({ uid: "u1", email: "ay2m@hotmail.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(h.stores.users?.u1?.entitlement).toEqual({ plan: "school", source: "staff" });
  });

  it("grants a verified address on the staff domain", async () => {
    const result = await claimStaffAccess(
      req({ uid: "u2", email: "ops@flygaca.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(h.stores.users?.u2?.entitlement).toEqual({ plan: "school", source: "staff" });
  });
});

describe("claimStaffAccess — unverified email rejection", () => {
  it("does not grant a matching address whose email is unverified", async () => {
    const result = await claimStaffAccess(
      req({ uid: "u3", email: "ops@flygaca.com", emailVerified: false }),
    );
    expect(result).toEqual({ granted: false });
    expect(h.stores.users?.u3).toBeUndefined();
    expect(h.setSpy).not.toHaveBeenCalled();
  });

  it("does not grant when emailVerified is missing entirely", async () => {
    const result = await claimStaffAccess(req({ uid: "u4", email: "ay2m@hotmail.com" }));
    expect(result).toEqual({ granted: false });
    expect(h.stores.users?.u4).toBeUndefined();
  });
});

describe("claimStaffAccess — off-allowlist addresses", () => {
  it("does not grant a verified address off the allowlist", async () => {
    const result = await claimStaffAccess(
      req({ uid: "u5", email: "someone@gmail.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: false });
    expect(h.stores.users?.u5).toBeUndefined();
    expect(h.setSpy).not.toHaveBeenCalled();
  });
});

describe("claimStaffAccess — idempotency / never downgrades", () => {
  it("skips the write when the staff grant is already in force", async () => {
    h.stores.users = { u6: { entitlement: { plan: "school", source: "staff" } } };
    const result = await claimStaffAccess(
      req({ uid: "u6", email: "ay2m@hotmail.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(h.setSpy).not.toHaveBeenCalled();
    expect(h.stores.users.u6?.entitlement).toEqual({ plan: "school", source: "staff" });
  });

  it("never leaves the account below the top school tier once staff-granted", async () => {
    // A paid, time-limited school grant (e.g. from a Moyasar/org seat) gets replaced
    // by the permanent staff grant — an upgrade in permanence, never a downgrade in
    // tier: plan stays "school" throughout.
    h.stores.users = {
      u7: { entitlement: { plan: "school", source: "school", expiresAt: "2020-01-01T00:00:00.000Z" } },
    };
    const result = await claimStaffAccess(
      req({ uid: "u7", email: "ay2m@hotmail.com", emailVerified: true }),
    );
    expect(result).toEqual({ granted: true, plan: "school" });
    expect(h.stores.users.u7?.entitlement).toEqual({ plan: "school", source: "staff" });
  });
});
