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
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
  verifyToken: vi.fn(),
  flowResult: undefined as unknown,
  flowError: false,
  // Streaming shape for captainAdelFlow.stream(); set per test.
  streamImpl: (() => ({ stream: (async function* () {})(), output: Promise.resolve(undefined) })) as () => {
    stream: AsyncGenerator<string>;
    output: Promise<unknown>;
  },
  // Fault injection for the fail-open/-closed catch branches.
  failGetColl: undefined as string | undefined, // doc.get() rejects for this collection
  failTxColl: undefined as string | undefined, // a transaction's tx.get() rejects for this collection
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
}));

function makeDoc(coll: string, id: string) {
  return {
    coll,
    id,
    get: () =>
      h.failGetColl === coll
        ? Promise.reject(new Error(`firestore get boom: ${coll}`))
        : Promise.resolve({
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
      get: (ref: { coll: string; get: () => Promise<unknown> }) =>
        h.failTxColl === ref.coll
          ? Promise.reject(new Error(`firestore tx get boom: ${ref.coll}`))
          : ref.get(),
      set: (ref: { coll: string; id: string }, val: Record<string, unknown>, opts?: unknown) =>
        writeDoc(ref.coll, ref.id, val, opts as { merge?: boolean } | undefined),
    }),
};

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: h.verifyIdToken,
    verifySessionCookie: h.verifySessionCookie,
    createSessionCookie: h.createSessionCookie,
  }),
}));
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
    { stream: vi.fn(() => h.streamImpl()) },
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
  h.failGetColl = undefined;
  h.failTxColl = undefined;
  // Default: any bearer token resolves to a uid equal to the token; "bad" rejects.
  h.verifyIdToken.mockImplementation((t: string) =>
    t === "bad" ? Promise.reject(new Error("bad")) : Promise.resolve({ uid: t }),
  );
  // No valid session cookie unless a test opts in; a fresh cookie mints a fixed value.
  h.verifySessionCookie.mockRejectedValue(new Error("no session cookie"));
  h.createSessionCookie.mockResolvedValue("sess_cookie_value");
  // Default stream: two tokens then the buffered result as the final output.
  h.streamImpl = () => ({
    stream: (async function* () {
      yield "Hel";
      yield "lo";
    })(),
    output: Promise.resolve(h.flowResult),
  });
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

describe("POST /chat?stream=1 — SSE streaming path", () => {
  it("streams token frames then a final frame and closes with [DONE]", async () => {
    h.stores.users = { "u-s": { entitlement: { plan: "pro" } } };
    const res = await fetch(`${base}/chat?stream=1`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth("u-s") },
      body: JSON.stringify({ message: "hi" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const body = await res.text();
    // A ping opens the stream, token deltas carry the generated text, and a final
    // frame carries the answer, ending with the [DONE] sentinel.
    expect(body).toContain("\"type\":\"token\"");
    expect(body).toContain("Hel");
    expect(body).toContain("\"type\":\"final\"");
    expect(body).toContain("\"answer\":\"A\"");
    expect(body).toContain("[DONE]");
  });

  it("emits an error frame (not a 500) when the stream throws mid-flight", async () => {
    h.stores.users = { "u-serr": { entitlement: { plan: "pro" } } };
    h.streamImpl = () => ({
      stream: (async function* () {
        yield "partial";
        throw new Error("stream boom");
      })(),
      output: Promise.resolve(h.flowResult),
    });
    const res = await fetch(`${base}/chat?stream=1`, {
      method: "POST",
      headers: { "content-type": "application/json", ...auth("u-serr") },
      body: JSON.stringify({ message: "hi" }),
    });
    // Headers were already flushed (200 + SSE), so a mid-stream failure surfaces as
    // an error frame within the stream rather than an HTTP error status.
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("\"type\":\"error\"");
    expect(body).toContain("stream_failed");
    expect(body).toContain("[DONE]");
  });
});

describe("POST /auth/session-login & /auth/session-logout", () => {
  it("400s when no idToken is supplied", async () => {
    const r = await call("/auth/session-login", { method: "POST", json: {} });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ error: "idToken is required" });
  });

  it("exchanges a valid idToken for an HttpOnly session cookie", async () => {
    h.verifyIdToken.mockResolvedValue({ uid: "u-login" });
    const r = await call("/auth/session-login", { method: "POST", json: { idToken: "good" } });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ success: true, uid: "u-login" });
    const setCookie = r.headers.get("set-cookie");
    expect(setCookie).toContain("session=sess_cookie_value");
    expect(setCookie?.toLowerCase()).toContain("httponly");
    expect(h.createSessionCookie).toHaveBeenCalledWith("good", expect.objectContaining({ expiresIn: expect.any(Number) }));
  });

  it("401s when the idToken fails verification", async () => {
    h.verifyIdToken.mockRejectedValue(new Error("bad token"));
    const r = await call("/auth/session-login", { method: "POST", json: { idToken: "nope" } });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: "unauthorized" });
  });

  it("clears the session cookie on logout", async () => {
    const r = await call("/auth/session-logout", { method: "POST", json: {} });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ success: true });
    expect(r.headers.get("set-cookie")?.toLowerCase()).toContain("session=;");
  });
});

describe("POST /v1/ask — tiering, quota & errors", () => {
  const keyed = (key: string) => ({ "x-api-key": key });

  it("sets quota headers and 429s a key over its monthly tier quota", async () => {
    const key = "fk_starter";
    const hash = hashApiKey(key);
    const month = new Date().toISOString().slice(0, 7);
    h.stores.apiKeys = { [hash]: { active: true, tier: "starter" } };
    h.stores.apiUsage = { [hash]: { months: { [month]: 100000 } } }; // way over any finite tier
    const r = await call("/v1/ask", { method: "POST", headers: keyed(key), json: { message: "hi" } });
    expect(r.status).toBe(429);
    expect(r.body).toMatchObject({ error: "monthly_quota_exceeded", tier: "starter" });
    expect(r.headers.get("x-quota-limit")).toBeTruthy();
    expect(r.headers.get("x-quota-used")).toBe("100000");
  });

  it("400s a valid key sending a blank message", async () => {
    const key = "fk_ok";
    const hash = hashApiKey(key);
    h.stores.apiKeys = { [hash]: { active: true } };
    const r = await call("/v1/ask", { method: "POST", headers: keyed(key), json: { message: "  " } });
    expect(r.status).toBe(400);
  });

  it("500s (without leaking) when the RAG flow throws", async () => {
    const key = "fk_boom";
    const hash = hashApiKey(key);
    h.stores.apiKeys = { [hash]: { active: true } };
    h.flowError = true;
    const r = await call("/v1/ask", { method: "POST", headers: keyed(key), json: { message: "hi" } });
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: "ask failed" });
  });
});

describe("CORS — allowed non-preflight & localhost", () => {
  it("reflects the Origin on an allowed non-preflight POST", async () => {
    const r = await call("/feedback", {
      method: "POST",
      headers: { Origin: "https://flygaca.com" },
      json: { rating: "up" },
    });
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("https://flygaca.com");
    expect(r.headers.get("vary")).toBe("Origin");
  });

  it("allows a localhost dev Origin", async () => {
    const r = await call("/chat", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
});

describe("POST /chat — Firestore faults fail toward the cheap path", () => {
  it("treats an entitlement-read failure as free (fails open to the free tier)", async () => {
    // readEntitlement swallows the error and returns null → the user is metered as
    // free rather than being handed the Pro model on a transient blip.
    h.failGetColl = "users";
    const r = await call("/chat", { method: "POST", headers: auth("u-entfail"), json: { message: "hi" } });
    expect(r.status).toBe(200);
    // Still consumed a free question (the free path ran).
    expect(h.stores.chatUsage?.["u-entfail"]).toEqual({ day: today, count: 1 });
  });

  it("allows the turn when the free-quota transaction fails (fail-open)", async () => {
    h.failTxColl = "chatUsage";
    const r = await call("/chat", { method: "POST", headers: auth("u-qfail"), json: { message: "hi" } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ answer: "A" });
  });

  it("429s when the credit transaction fails after the free allowance is spent (fail-closed)", async () => {
    h.stores.chatUsage = { "u-cfail": { day: today, count: 5 } }; // free allowance exhausted
    h.stores.chatCredits = { "u-cfail": { balance: 3 } };
    h.failTxColl = "chatCredits"; // the credit spend transaction throws
    const r = await call("/chat", { method: "POST", headers: auth("u-cfail"), json: { message: "hi" } });
    expect(r.status).toBe(429);
    expect(r.body).toEqual({ error: "quota_exceeded" });
  });
});
