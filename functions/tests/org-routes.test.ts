/**
 * Wrapper-level tests for the B2B org callables (functions/src/org.ts) —
 * `getMyOrgs`, `getCohortReadiness`, `provisionSeats` — the Firestore-writing/reading
 * layer that `org-core.test.ts` doesn't reach. Exercised via the CallableFunction's
 * `.run(request)` escape hatch (see firebase-functions' onCall — `.run` invokes the
 * handler directly, bypassing HTTP/App Check/CORS), with firebase-admin mocked
 * behind a small path-keyed in-memory Firestore that also supports the
 * `where("ownerUids", "array-contains", uid)` query and `.collection().count()`
 * these callables use. Mirrors the mocking style of gateway-routes.test.ts /
 * billing-webhook.test.ts.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";

type Data = Record<string, unknown>;

const h = vi.hoisted(() => ({ store: new Map<string, Data>() }));

function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/** Direct children of `path` — i.e. docs one segment deeper, under `path/`. */
function children(path: string): Array<{ id: string; path: string; data: Data }> {
  const depth = segments(path).length + 1;
  const out: Array<{ id: string; path: string; data: Data }> = [];
  for (const [p, data] of h.store.entries()) {
    if (p.startsWith(`${path}/`) && segments(p).length === depth) {
      out.push({ id: segments(p)[depth - 1], path: p, data });
    }
  }
  return out;
}

function docRef(path: string) {
  return {
    id: segments(path).at(-1)!,
    ref: undefined as unknown,
    get: () =>
      Promise.resolve({
        get exists() {
          return h.store.has(path);
        },
        id: segments(path).at(-1)!,
        data: () => h.store.get(path),
        ref: docRef(path),
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
  return {
    doc: (id: string) => docRef(`${path}/${id}`),
    get: () =>
      Promise.resolve({
        docs: children(path).map(({ id, data, path: p }) => ({
          id,
          data: () => data,
          ref: docRef(p),
        })),
      }),
    where: (field: string, op: string, value: unknown) => {
      const matches = () =>
        children(path).filter(({ data }) => {
          if (op === "array-contains") {
            return Array.isArray(data[field]) && (data[field] as unknown[]).includes(value);
          }
          return data[field] === value;
        });
      return {
        get: () =>
          Promise.resolve({
            docs: matches().map(({ id, data, path: p }) => ({
              id,
              data: () => data,
              ref: docRef(p),
            })),
          }),
        // provisionSeats counts outstanding invites with
        // `db.collection("schoolInvites").where("orgId","==",id).count()`. Only the
        // bare collection had count() — a filtered query didn't — so the seat-limit
        // branch threw "count is not a function" instead of enforcing the limit.
        // That branch IS the seat-limit-bypass fix from 0f3bce3, so leaving it
        // unexercised is exactly what the test is there to prevent.
        count: () => ({
          get: () => Promise.resolve({ data: () => ({ count: matches().length }) }),
        }),
      };
    },
    count: () => ({
      get: () => Promise.resolve({ data: () => ({ count: children(path).length }) }),
    }),
  };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => collectionRef(c) }),
}));

let getMyOrgs: (request: CallableRequest<unknown>) => Promise<unknown>;
let getCohortReadiness: (request: CallableRequest<unknown>) => Promise<unknown>;
let provisionSeats: (request: CallableRequest<unknown>) => Promise<unknown>;

beforeAll(async () => {
  const mod = await import("../src/org.js");
  getMyOrgs = (request) => mod.getMyOrgs.run(request);
  getCohortReadiness = (request) => mod.getCohortReadiness.run(request);
  provisionSeats = (request) => mod.provisionSeats.run(request);
});

beforeEach(() => {
  h.store.clear();
});

afterEach(() => vi.clearAllMocks());

function seed(path: string, data: Data) {
  h.store.set(path, data);
}

function req(uid?: string, data?: unknown): CallableRequest<unknown> {
  return {
    data,
    auth: uid ? { uid, token: {} as never, rawToken: "raw" } : undefined,
    rawRequest: {} as never,
    acceptsStreaming: false,
  };
}

describe("getMyOrgs", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(getMyOrgs(req())).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("returns only orgs the caller owns, with seat counts", async () => {
    seed("orgs/org1", { name: "Falcon Academy", ownerUids: ["u1"], seatLimit: 10 });
    seed("orgs/org1/members/m1", { email: "m1@example.com" });
    seed("orgs/org1/members/m2", { email: "m2@example.com" });
    seed("orgs/org2", { name: "Other School", ownerUids: ["u2"] });

    const result = (await getMyOrgs(req("u1"))) as { orgs: unknown[] };
    expect(result.orgs).toEqual([
      { id: "org1", name: "Falcon Academy", seatLimit: 10, seatsUsed: 2 },
    ]);
  });

  it("falls back to the org id as the name and null seatLimit when unset", async () => {
    seed("orgs/org3", { ownerUids: ["u3"] });
    const result = (await getMyOrgs(req("u3"))) as { orgs: unknown[] };
    expect(result.orgs).toEqual([{ id: "org3", name: "org3", seatLimit: null, seatsUsed: 0 }]);
  });

  it("returns an empty list for a caller who owns nothing", async () => {
    seed("orgs/org4", { ownerUids: ["someone-else"] });
    const result = (await getMyOrgs(req("u-nobody"))) as { orgs: unknown[] };
    expect(result.orgs).toEqual([]);
  });
});

describe("getCohortReadiness", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(getCohortReadiness(req())).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects a missing orgId", async () => {
    await expect(getCohortReadiness(req("u1", {}))).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("404s an unknown org", async () => {
    await expect(getCohortReadiness(req("u1", { orgId: "ghost" }))).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("denies a caller who isn't an owner of the org", async () => {
    seed("orgs/org1", { name: "Academy", ownerUids: ["owner-1"] });
    await expect(getCohortReadiness(req("intruder", { orgId: "org1" }))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("assembles per-member seat status + readiness for the owner", async () => {
    seed("orgs/org1", {
      name: "Academy",
      ownerUids: ["owner-1"],
      banks: ["aip-ais", "airspace"],
      passThreshold: 75,
    });
    seed("orgs/org1/members/m1", { email: "ready@example.com" });
    seed("orgs/org1/members/m2", { email: "notready@example.com" });
    seed("users/m1", { entitlement: { plan: "school", source: "school" } });
    seed("users/m1/progress/summary", {
      quizBest: { "aip-ais": 80, airspace: 90 },
      examBest: 85,
      updatedAt: "2026-01-01",
    });
    seed("users/m2", { entitlement: { plan: "school", source: "school" } });
    // m2 has no progress doc at all — treated as unstarted.

    const result = (await getCohortReadiness(req("owner-1", { orgId: "org1" }))) as {
      orgId: string;
      counts: { total: number; active: number; ready: number };
      rows: Array<{ email: string; ready: boolean; hasProgress: boolean }>;
    };

    expect(result.orgId).toBe("org1");
    expect(result.counts).toEqual({ total: 2, active: 2, ready: 1 });
    // Sorted by email.
    expect(result.rows.map((r) => r.email)).toEqual(["notready@example.com", "ready@example.com"]);
    const ready = result.rows.find((r) => r.email === "ready@example.com")!;
    expect(ready.ready).toBe(true);
    expect(ready.hasProgress).toBe(true);
    const notReady = result.rows.find((r) => r.email === "notready@example.com")!;
    expect(notReady.ready).toBe(false);
    expect(notReady.hasProgress).toBe(false);
  });

  it("falls back to the default AIP banks and 75% threshold when unset on the org", async () => {
    seed("orgs/org5", { name: "Academy", ownerUids: ["owner-5"] });
    const result = (await getCohortReadiness(req("owner-5", { orgId: "org5" }))) as {
      banks: string[];
      threshold: number;
    };
    expect(result.banks).toEqual(["aip-ais", "airspace"]);
    expect(result.threshold).toBe(75);
  });
});

describe("provisionSeats", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(provisionSeats(req())).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects a missing orgId", async () => {
    await expect(
      provisionSeats(req("u1", { emails: ["a@example.com"] })),
    ).rejects.toMatchObject({ code: "invalid-argument", message: "orgId-required" });
  });

  it("rejects an empty emails list", async () => {
    await expect(
      provisionSeats(req("u1", { orgId: "org1", emails: [] })),
    ).rejects.toMatchObject({ code: "invalid-argument", message: "emails-required" });
  });

  it("404s an unknown org", async () => {
    await expect(
      provisionSeats(req("u1", { orgId: "ghost", emails: ["a@example.com"] })),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("denies a caller who isn't an owner of the org", async () => {
    seed("orgs/org1", { ownerUids: ["owner-1"] });
    await expect(
      provisionSeats(req("intruder", { orgId: "org1", emails: ["a@example.com"] })),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("rejects when the request would exceed the org's seat limit", async () => {
    seed("orgs/org1", { ownerUids: ["owner-1"], seatLimit: 2 });
    seed("orgs/org1/members/m1", { email: "existing@example.com" });
    seed("orgs/org1/members/m2", { email: "existing2@example.com" });
    await expect(
      provisionSeats(req("owner-1", { orgId: "org1", emails: ["new@example.com"] })),
    ).rejects.toMatchObject({ code: "resource-exhausted" });
  });

  it("creates an invite doc for each valid email and reports per-email results", async () => {
    seed("orgs/org1", { ownerUids: ["owner-1"] });
    const result = (await provisionSeats(
      req("owner-1", { orgId: "org1", emails: ["a@example.com", "not-an-email"] }),
    )) as { results: Array<{ email: string; success: boolean; error?: string }> };

    expect(result.results).toEqual([
      { email: "a@example.com", success: true },
      { email: "not-an-email", success: false, error: "invalid-email" },
    ]);
    expect(h.store.get("schoolInvites/a@example.com")).toMatchObject({
      email: "a@example.com",
      orgId: "org1",
    });
    expect(h.store.get("schoolInvites/not-an-email")).toBeUndefined();
  });

  it("is idempotent — re-provisioning the same email merges rather than duplicates/errors", async () => {
    seed("orgs/org1", { ownerUids: ["owner-1"] });
    await provisionSeats(req("owner-1", { orgId: "org1", emails: ["a@example.com"] }));
    const second = (await provisionSeats(
      req("owner-1", { orgId: "org1", emails: ["a@example.com"] }),
    )) as { results: Array<{ email: string; success: boolean }> };
    expect(second.results).toEqual([{ email: "a@example.com", success: true }]);
    expect(h.store.get("schoolInvites/a@example.com")).toMatchObject({ email: "a@example.com" });
  });

  it("allows the request when seatsUsed + requested exactly fills the seat limit", async () => {
    seed("orgs/org1", { ownerUids: ["owner-1"], seatLimit: 1 });
    const result = (await provisionSeats(
      req("owner-1", { orgId: "org1", emails: ["a@example.com"] }),
    )) as { results: Array<{ success: boolean }> };
    expect(result.results[0].success).toBe(true);
  });
});
