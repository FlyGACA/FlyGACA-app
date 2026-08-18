/**
 * Unit tests for Multi-Tenant School License & Roster Functions:
 *  - `grantSchoolLicence`
 *  - `revokeSchoolLicence`
 *  - `recomputeSchoolAnalytics`
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";

type Data = Record<string, unknown>;

interface MockDocRef {
  id: string;
  path: string;
  get: () => Promise<{ id: string; exists: boolean; data: () => Data | undefined }>;
  set: (val: Data, opts?: { merge?: boolean }) => Promise<void>;
  update: (val: Record<string, unknown>) => Promise<void>;
  collection: (name: string) => MockCollectionRef;
}

interface MockCollectionRef {
  doc: (id?: string) => MockDocRef;
  get: () => Promise<{ docs: Array<{ id: string; exists: boolean; data: () => Data }> }>;
}

const h = vi.hoisted(() => {
  const store = new Map<string, Data>();
  let idCounter = 1;
  return { store, nextId: () => `auto-id-${idCounter++}` };
});

function docRef(path: string): MockDocRef {
  const id = path.split("/").pop() || "";
  return {
    id,
    path,
    get: () =>
      Promise.resolve({
        id,
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
    update: (val: Record<string, unknown>) => {
      const cur = h.store.get(path) ?? {};
      const updated: Data = { ...cur };
      for (const [k, v] of Object.entries(val)) {
        if (v && typeof v === "object" && "__increment" in v) {
          const inc = (v as { __increment: number }).__increment;
          updated[k] = (Number(updated[k]) || 0) + inc;
        } else {
          updated[k] = v;
        }
      }
      h.store.set(path, updated);
      return Promise.resolve();
    },
    collection: (name: string) => collectionRef(`${path}/${name}`),
  };
}

function collectionRef(path: string): MockCollectionRef {
  return {
    doc: (id?: string) => docRef(`${path}/${id || h.nextId()}`),
    get: () => {
      const docs: Array<{ id: string; exists: boolean; data: () => Data }> = [];
      const prefix = `${path}/`;
      for (const [key, val] of h.store.entries()) {
        if (key.startsWith(prefix)) {
          const sub = key.slice(prefix.length);
          if (!sub.includes("/")) {
            docs.push({
              id: sub,
              exists: true,
              data: () => val,
            });
          }
        }
      }
      return Promise.resolve({ docs });
    },
  };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (c: string) => collectionRef(c),
    runTransaction: async <T>(cb: (tx: {
      get: (ref: MockDocRef) => ReturnType<MockDocRef["get"]>;
      set: (ref: MockDocRef, data: Data, opts?: { merge?: boolean }) => ReturnType<MockDocRef["set"]>;
      update: (ref: MockDocRef, data: Record<string, unknown>) => ReturnType<MockDocRef["update"]>;
    }) => Promise<T>): Promise<T> => {
      const tx = {
        get: (ref: MockDocRef) => ref.get(),
        set: (ref: MockDocRef, data: Data, opts?: { merge?: boolean }) => ref.set(data, opts),
        update: (ref: MockDocRef, data: Record<string, unknown>) => ref.update(data),
      };
      return await cb(tx);
    },
  }),
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
  },
}));

let grantSchoolLicence: (request: CallableRequest<unknown>) => Promise<{
  success: true;
  schoolId: string;
  cadetUid: string;
  allocatedSeats: number;
  grantedAt: string;
}>;
let revokeSchoolLicence: (request: CallableRequest<unknown>) => Promise<{
  success: true;
  schoolId: string;
  cadetUid: string;
  revokedAt: string;
}>;
let recomputeSchoolAnalytics: (request: CallableRequest<unknown>) => Promise<{
  schoolId: string;
  totalCadets: number;
  activeLicenses: number;
  consentedCadetsCount: number;
  redactedCadetsCount: number;
  avgExamScore: number;
}>;

beforeAll(async () => {
  const mod = await import("../src/school.js");
  grantSchoolLicence = (request) => mod.grantSchoolLicence.run(request) as never;
  revokeSchoolLicence = (request) => mod.revokeSchoolLicence.run(request) as never;
  recomputeSchoolAnalytics = (request) => mod.recomputeSchoolAnalytics.run(request) as never;
});

beforeEach(() => {
  h.store.clear();
});

afterEach(() => vi.clearAllMocks());

function req(auth?: { uid: string }, data?: unknown): CallableRequest<unknown> {
  return {
    data,
    auth: auth ? { uid: auth.uid, token: {} as never, rawToken: "raw" } : undefined,
    rawRequest: {} as never,
    acceptsStreaming: false,
  };
}

describe("grantSchoolLicence", () => {
  const schoolId = "school-1";
  const ownerUid = "owner-uid";
  const adminUid = "admin-uid";
  const unauthorizedUid = "random-user";

  beforeEach(() => {
    h.store.set(`schools/${schoolId}`, {
      name: "Alpha Flight School",
      ownerUids: [ownerUid],
      adminUids: [adminUid],
      instructorUids: ["inst-1"],
      seatLimit: 2,
      allocatedSeats: 0,
    });
  });

  it("rejects unauthenticated callers", async () => {
    await expect(
      grantSchoolLicence(req(undefined, { schoolId, cadetUid: "c1", cadetEmail: "c1@s.sa" })),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects unauthorized non-admin callers", async () => {
    await expect(
      grantSchoolLicence(
        req({ uid: unauthorizedUid }, { schoolId, cadetUid: "c1", cadetEmail: "c1@s.sa" }),
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("successfully grants a license and increments allocated seats", async () => {
    const res = await grantSchoolLicence(
      req({ uid: adminUid }, { schoolId, cadetUid: "c1", cadetEmail: "Cadet1@School.sa" }),
    );

    expect(res.success).toBe(true);
    expect(res.allocatedSeats).toBe(1);

    // Verify roster doc
    const roster = h.store.get(`schools/${schoolId}/roster/c1`);
    expect(roster).toMatchObject({
      cadetUid: "c1",
      cadetEmail: "cadet1@school.sa",
      licenseStatus: "active",
      seatAllocated: true,
      grantedBy: adminUid,
      pdplConsent: {
        consent: false,
        consentVersion: "v1.0-2026",
      },
    });

    // Verify user entitlement
    const user = h.store.get("users/c1");
    expect(user?.entitlement).toEqual({
      plan: "school",
      source: "school",
    });

    // Verify school allocatedSeats
    const school = h.store.get(`schools/${schoolId}`);
    expect(school?.allocatedSeats).toBe(1);
  });

  it("enforces seatLimit strictly", async () => {
    // Fill the 2 seats
    await grantSchoolLicence(
      req({ uid: ownerUid }, { schoolId, cadetUid: "c1", cadetEmail: "c1@s.sa" }),
    );
    await grantSchoolLicence(
      req({ uid: ownerUid }, { schoolId, cadetUid: "c2", cadetEmail: "c2@s.sa" }),
    );

    // 3rd grant must be rejected
    await expect(
      grantSchoolLicence(
        req({ uid: ownerUid }, { schoolId, cadetUid: "c3", cadetEmail: "c3@s.sa" }),
      ),
    ).rejects.toMatchObject({ code: "resource-exhausted" });
  });
});

describe("revokeSchoolLicence", () => {
  const schoolId = "school-1";
  const ownerUid = "owner-uid";

  beforeEach(() => {
    h.store.set(`schools/${schoolId}`, {
      name: "Alpha Flight School",
      ownerUids: [ownerUid],
      adminUids: [],
      instructorUids: [],
      seatLimit: 5,
      allocatedSeats: 1,
    });

    h.store.set(`schools/${schoolId}/roster/c1`, {
      cadetUid: "c1",
      cadetEmail: "c1@s.sa",
      licenseStatus: "active",
      seatAllocated: true,
      grantedBy: ownerUid,
      pdplConsent: { consent: false },
    });

    h.store.set("users/c1", {
      entitlement: { plan: "school", source: "school" },
    });
  });

  it("revokes license, releases seat, and demotes user entitlement", async () => {
    const res = await revokeSchoolLicence(
      req({ uid: ownerUid }, { schoolId, cadetUid: "c1", reason: "Graduated" }),
    );

    expect(res.success).toBe(true);

    const roster = h.store.get(`schools/${schoolId}/roster/c1`);
    expect(roster?.licenseStatus).toBe("revoked");
    expect(roster?.seatAllocated).toBe(false);
    expect(roster?.revokeReason).toBe("Graduated");

    const school = h.store.get(`schools/${schoolId}`);
    expect(school?.allocatedSeats).toBe(0);

    const user = h.store.get("users/c1");
    expect(user?.entitlement).toEqual({ plan: "free" });
  });
});

describe("School Analytics Aggregation", () => {
  const schoolId = "school-analytics-1";
  const instructorUid = "inst-uid";

  beforeEach(() => {
    h.store.set(`schools/${schoolId}`, {
      name: "Test School",
      ownerUids: ["owner-uid"],
      adminUids: [],
      instructorUids: [instructorUid],
      seatLimit: 10,
      allocatedSeats: 2,
    });

    // Roster cadet 1 (consented)
    h.store.set(`schools/${schoolId}/roster/c1`, {
      cadetUid: "c1",
      cadetEmail: "c1@school.sa",
      licenseStatus: "active",
      seatAllocated: true,
      pdplConsent: { consent: true },
    });
    h.store.set("users/c1/progress/summary", {
      quizBest: { "aip-ais": 90, airspace: 80 },
      examBest: 85,
      updatedAt: "2026-08-16T10:00:00Z",
    });

    // Roster cadet 2 (non-consented PDPL)
    h.store.set(`schools/${schoolId}/roster/c2`, {
      cadetUid: "c2",
      cadetEmail: "c2@school.sa",
      licenseStatus: "active",
      seatAllocated: true,
      pdplConsent: { consent: false },
    });
    h.store.set("users/c2/progress/summary", {
      quizBest: { "aip-ais": 100 },
      examBest: 100,
      updatedAt: "2026-08-16T10:00:00Z",
    });
  });

  it("recomputes analytics with PDPL redaction and saves pre-aggregated summary", async () => {
    const summary = await recomputeSchoolAnalytics(req({ uid: instructorUid }, { schoolId }));

    expect(summary.totalCadets).toBe(2);
    expect(summary.activeLicenses).toBe(2);
    expect(summary.consentedCadetsCount).toBe(1);
    expect(summary.redactedCadetsCount).toBe(1);
    expect(summary.avgExamScore).toBe(85); // Only consented c1 is calculated

    const storedSummary = h.store.get(`schools/${schoolId}/analytics/summary`);
    expect(storedSummary).toMatchObject({
      totalCadets: 2,
      activeLicenses: 2,
      consentedCadetsCount: 1,
    });
  });
});
