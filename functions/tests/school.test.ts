/**
 * Additional unit tests for School Multi-Tenant functions & authorization:
 *  - `isSchoolStaff` and `isSchoolAdmin` helpers
 *  - `canAllocateSeat`
 *  - `getSchoolAnalyticsSummary`
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";
import { isSchoolAdmin, isSchoolStaff, canAllocateSeat } from "../src/school-core.js";

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
        updated[k] = v;
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

let getSchoolAnalyticsSummary: (request: CallableRequest<unknown>) => Promise<{
  schoolId: string;
  totalCadets: number;
  activeLicenses: number;
  avgHealthScore: number;
}>;

beforeAll(async () => {
  const mod = await import("../src/school.js");
  getSchoolAnalyticsSummary = (request) => mod.getSchoolAnalyticsSummary.run(request) as never;
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

describe("school-core authorization helpers", () => {
  const school = {
    ownerUids: ["owner-1"],
    adminUids: ["admin-1"],
    instructorUids: ["inst-1", "inst-2"],
  };

  it("isSchoolStaff returns true for owners, admins, and instructors", () => {
    expect(isSchoolStaff(school, "owner-1")).toBe(true);
    expect(isSchoolStaff(school, "admin-1")).toBe(true);
    expect(isSchoolStaff(school, "inst-1")).toBe(true);
    expect(isSchoolStaff(school, "inst-2")).toBe(true);
    expect(isSchoolStaff(school, "outsider")).toBe(false);
    expect(isSchoolStaff(null, "owner-1")).toBe(false);
  });

  it("isSchoolAdmin returns true only for owners and admins", () => {
    expect(isSchoolAdmin(school, "owner-1")).toBe(true);
    expect(isSchoolAdmin(school, "admin-1")).toBe(true);
    expect(isSchoolAdmin(school, "inst-1")).toBe(false);
    expect(isSchoolAdmin(school, "outsider")).toBe(false);
  });

  it("canAllocateSeat correctly guards limit", () => {
    expect(canAllocateSeat(0, 10)).toBe(true);
    expect(canAllocateSeat(9, 10)).toBe(true);
    expect(canAllocateSeat(10, 10)).toBe(false);
    expect(canAllocateSeat(11, 10)).toBe(false);
  });
});

describe("getSchoolAnalyticsSummary", () => {
  const schoolId = "sch-1";

  beforeEach(() => {
    h.store.set(`schools/${schoolId}`, {
      name: "Academy",
      ownerUids: ["owner"],
      adminUids: [],
      instructorUids: ["instructor"],
      seatLimit: 20,
      allocatedSeats: 1,
    });

    h.store.set(`schools/${schoolId}/analytics/summary`, {
      schoolId,
      totalCadets: 5,
      activeLicenses: 4,
      avgHealthScore: 82.5,
    });
  });

  it("returns existing summary doc for authorized instructor", async () => {
    const summary = await getSchoolAnalyticsSummary(
      req({ uid: "instructor" }, { schoolId }),
    );
    expect(summary.totalCadets).toBe(5);
    expect(summary.activeLicenses).toBe(4);
    expect(summary.avgHealthScore).toBe(82.5);
  });

  it("rejects unauthorized user", async () => {
    await expect(
      getSchoolAnalyticsSummary(req({ uid: "unauthorized" }, { schoolId })),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
});
