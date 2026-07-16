/**
 * End-to-end tests for the gateway's Express route handlers (/chat, /v1/ask,
 * /feedback) — the enforcement paths (auth, CORS, free-quota consumption, credit
 * metering, API-key lookup) that gateway.test.ts's helper-level tests don't
 * reach. The real `app` is driven over an in-process HTTP server; firebase-admin
 * (auth/firestore) and the RAG flow are mocked, so this exercises the actual
 * middleware chain without booting Firebase or Genkit.
 *
 * The raw Express app relies on Firebase's onRequest wrapper to parse the JSON
 * body in production, so the harness mounts it behind express.json().
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { hashApiKey } from "../src/api-key-core.js";

const today = new Date().toISOString().slice(0, 10);

// In-memory Firestore, keyed by collection → docId → data. Reset per test.
const h = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifyToken: vi.fn(),
  flowResult: undefined as unknown,
  flowError: false,
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
}));

function makeDoc(coll: string, id: string) {
  return {
    coll,
    id,
    get: () =>
      Promise.resolve({
        get exists() {
          return h.stores[coll]?.[id] !== undefined;
        },
        data: () => h.stores[coll]?.[id],
      }),
    set: (val: Record<string, unknown>, opts?: { merge?: boolean }) => {
      writeDoc(coll, id, val, opts);
      return Promise.resolve();
    },
  };
}

function writeDoc(
  coll: string,
  id: string,
  val: Record<string, unknown>,
  opts?: { merge?: boolean },
) {
  h.stores[coll] ??= {};
  const cur = h.stores[coll][id];
  h.stores[coll][id] = opts?.merge ? { ...(cur ?? {}), ...val } : val;
}

const firestore = {
  collection: (name: string) => ({ doc: (id: string) => makeDoc(name, id) }),
  runTransaction: async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      get: (ref: { get: () => Promise<unknown> }) => ref.get(),
      set: (ref: { coll: string; id: string }, val: Record<string, unknown>, opts?: unknown) =>
        writeDoc(ref.coll, ref.id, val, opts as { merge?: boolean } | undefined),
    }),
};

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: h.verifyIdToken }) }));
vi.mock("firebase-admin/app-check", () => ({ getAppCheck: () => ({ verifyToken: h.verifyToken }) }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => firestore,
  FieldValue: { increment: (n: number) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) },
}));
vi.mock("../src/captain-adel.js", () => ({
  captainAdelFlow: Object.assign(
    vi.fn(async () => {
      if (h.flowError) throw new Error("flow boom");
      return h.flowResult;
    }),
    { stream: vi.fn() },
  ),
}));
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn() },
}));

let server: Server;
let base: string;

beforeAll(async () => {
  // Pin the free-tier limit so the quota tests don't depend on deploy-time param
  // resolution (an unbound defineInt resolves to 0 outside a deployed function).
  process.env.FREE_DAILY_LIMIT = "5";
  const app = (await import("../src/gateway.js")).default;
  const harness = express();
  harness.use(express.json());
  harness.use(app);
  await new Promise<void>((resolve) => {
    server = harness.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  h.stores = {};
  h.flowError = false;
  h.flowResult = { answer: "A", sources: [], kind: "grounded", meta: { provider: "flash" } };
  // Default: any bearer token resolves to a uid equal to the token; "bad" rejects.
  h.verifyIdToken.mockImplementation((t: string) =>
    t === "bad" ? Promise.reject(new Error("bad")) : Promise.resolve({ uid: t }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

type Res = { status: number; body: unknown; headers: Headers };
async function call(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Res> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(headers as Record<string, string>),
    },
    body: json !== undefined ? JSON.stringify(json) : (rest.body as BodyInit | undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined, headers: res.headers };
}

const auth = (uid: string) => ({ Authorization: `Bearer ${uid}` });

describe("POST /chat — auth & validation", () => {
  it("401s an anonymous (no bearer) request", async () => {
    const r = await call("/chat", { method: "POST", json: { message: "hi" } });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: "sign-in required" });
  });

  it("401s when the ID token is invalid (treated as anonymous)", async () => {
    const r = await call("/chat", { method: "POST", headers: auth("bad"), json: { message: "hi" } });
    expect(r.status).toBe(401);
  });

  it("400s a signed-in request with a blank message", async () => {
    const r = await call("/chat", { method: "POST", headers: auth("u-blank"), json: { message: "  " } });
    expect(r.status).toBe(400);
  });
});

describe("POST /chat — plan gating", () => {
  it("a paid user bypasses the free-quota consumption entirely", async () => {
    h.stores.users = { "u-pro": { entitlement: { plan: "pro" } } };
    const r = await call("/chat", { method: "POST", headers: auth("u-pro"), json: { message: "hi" } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ answer: "A", meta: { provider: "flash" } });
    // No chatUsage document was touched for a paid user.
    expect(h.stores.chatUsage?.["u-pro"]).toBeUndefined();
  });

  it("a free user consumes one daily free question and gets an answer", async () => {
    const r = await call("/chat", { method: "POST", headers: auth("u-free"), json: { message: "hi" } });
    expect(r.status).toBe(200);
    expect(h.stores.chatUsage?.["u-free"]).toEqual({ day: today, count: 1 });
  });

  it("spends a purchased credit once the daily allowance is exhausted", async () => {
    h.stores.chatUsage = { "u-cred": { day: today, count: 5 } }; // FREE_DAILY_LIMIT reached
    h.stores.chatCredits = { "u-cred": { balance: 3 } };
    const r = await call("/chat", { method: "POST", headers: auth("u-cred"), json: { message: "hi" } });
    expect(r.status).toBe(200);
    expect(h.stores.chatCredits["u-cred"]).toEqual({ balance: 2 }); // one credit spent
  });

  it("429s (quota_exceeded) when neither free questions nor credits remain", async () => {
    h.stores.chatUsage = { "u-out": { day: today, count: 5 } };
    const r = await call("/chat", { method: "POST", headers: auth("u-out"), json: { message: "hi" } });
    expect(r.status).toBe(429);
    expect(r.body).toEqual({ error: "quota_exceeded" });
    expect(r.headers.get("retry-after")).toBeTruthy();
  });

  it("500s (without leaking) when the RAG flow throws on the buffered path", async () => {
    h.stores.users = { "u-err": { entitlement: { plan: "pro" } } };
    h.flowError = true;
    const r = await call("/chat", { method: "POST", headers: auth("u-err"), json: { message: "hi" } });
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: "chat failed" });
  });
});

describe("CORS", () => {
  it("403s a request from a disallowed Origin", async () => {
    const r = await call("/chat", {
      method: "POST",
      headers: { ...auth("u1"), Origin: "https://evil.example" },
      json: { message: "hi" },
    });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: "CORS not allowed" });
  });

  it("reflects an allowed Origin and answers the preflight with 204", async () => {
    const r = await call("/chat", { method: "OPTIONS", headers: { Origin: "https://flygaca.com" } });
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("https://flygaca.com");
  });

  it("allows a project-scoped Vercel preview Origin (suffix match)", async () => {
    const r = await call("/chat", {
      method: "OPTIONS",
      headers: { Origin: "https://feature-branch-flygaca-app.vercel.app" },
    });
    expect(r.status).toBe(204);
  });
});

describe("POST /v1/ask — licensed API", () => {
  it("401s when no API key is presented", async () => {
    const r = await call("/v1/ask", { method: "POST", json: { message: "hi" } });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: "api key required" });
  });

  it("401s an unknown or deactivated key", async () => {
    const r = await call("/v1/ask", {
      method: "POST",
      headers: { "x-api-key": "fk_unknown" },
      json: { message: "hi" },
    });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: "invalid api key" });
  });

  it("answers and meters a valid key", async () => {
    const key = "fk_live_valid";
    const hash = hashApiKey(key);
    h.stores.apiKeys = { [hash]: { active: true } };
    const r = await call("/v1/ask", {
      method: "POST",
      headers: { "x-api-key": key },
      json: { message: "what is VMC?" },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ answer: "A" });
    // Metered per key (best-effort write-through).
    expect(h.stores.apiUsage?.[hash]).toBeDefined();
  });
});

describe("POST /feedback", () => {
  it("204s a well-formed rating (anonymous allowed)", async () => {
    const r = await call("/feedback", { method: "POST", json: { rating: "up" } });
    expect(r.status).toBe(204);
  });

  it("400s an invalid rating", async () => {
    const r = await call("/feedback", { method: "POST", json: { rating: "sideways" } });
    expect(r.status).toBe(400);
  });
});
