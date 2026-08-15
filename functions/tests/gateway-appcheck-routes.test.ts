/**
 * Route-level App Check enforcement for the gateway — the `AuthError → 403` branch
 * in the /chat and /feedback handlers, reached only when `ENFORCE_APP_CHECK` is on.
 * gateway.test.ts covers the enforced `authenticate` helper directly; this drives the
 * real Express `app` (own in-process server, App Check enforced) so the handlers'
 * catch-and-403 is exercised end-to-end. Kept in its own file because enforcement is
 * a module-load-time param — a separate module instance from gateway-routes.test.ts.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const h = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: h.verifyIdToken }) }));
vi.mock("firebase-admin/app-check", () => ({ getAppCheck: () => ({ verifyToken: h.verifyToken }) }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) }),
  FieldValue: { increment: (n: number) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) },
}));
vi.mock("../src/captain-adel.js", () => ({
  captainAdelFlow: Object.assign(vi.fn(), { stream: vi.fn() }),
}));
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn() },
}));

let server: Server;
let base: string;

beforeAll(async () => {
  // firebase-functions' defineBoolean parses "true"/"false"; must be set before import.
  process.env.ENFORCE_APP_CHECK = "true";
  vi.resetModules();
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
  delete process.env.ENFORCE_APP_CHECK;
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

type Res = { status: number; body: unknown };
async function post(path: string, headers: Record<string, string>, json: unknown): Promise<Res> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(json),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

describe("App Check enforced — /chat", () => {
  it("403s when the App Check token is missing", async () => {
    const r = await post("/chat", {}, { message: "hi" });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: "missing App Check token" });
  });

  it("403s when the App Check token is invalid", async () => {
    h.verifyToken.mockRejectedValue(new Error("nope"));
    const r = await post("/chat", { "X-Firebase-AppCheck": "bad" }, { message: "hi" });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: "invalid App Check token" });
  });
});

describe("App Check enforced — /feedback", () => {
  it("403s when the App Check token is missing", async () => {
    const r = await post("/feedback", {}, { rating: "up" });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: "missing App Check token" });
  });
});
