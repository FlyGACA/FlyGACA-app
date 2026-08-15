import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { authenticate, notFoundHandler, errorHandler } from "../src/gateway.js";

// Mocks for the Admin SDK + the RAG flow, so importing the gateway never boots
// firebase-admin or loads genkit. getApps() returns non-empty so the module's
// `initializeApp()` guard is a no-op.
const h = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifySessionCookie: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: h.verifyIdToken,
    verifySessionCookie: h.verifySessionCookie,
  }),
}));
vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: () => ({ verifyToken: h.verifyToken }),
}));
vi.mock("../src/captain-adel.js", () => ({
  captainAdelFlow: Object.assign(vi.fn(), { stream: vi.fn() }),
}));
// Silence structured logs in tests (logger works outside a deployed function,
// but the output is noise here).
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

/** A minimal Express-like request carrying just the headers the gateway reads. */
function reqWith(headers: Record<string, string> = {}): Request {
  const lowercased: Record<string, string> = {};
  Object.keys(headers).forEach((k) => {
    lowercased[k.toLowerCase()] = headers[k];
  });
  return {
    header: (name: string) => headers[name],
    headers: lowercased,
  } as unknown as Request;
}

/** A minimal Express-like response recording status/json/end calls. */
function mockRes(headersSent = false) {
  const res = {
    headersSent,
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticate — App Check not enforced (default)", () => {
  it("returns anonymous when no Authorization header is present", async () => {
    const out = await authenticate(reqWith());
    expect(out).toEqual({ emailVerified: false });
    expect(h.verifyIdToken).not.toHaveBeenCalled();
  });

  it("returns the auth context for a valid session cookie", async () => {
    h.verifySessionCookie.mockResolvedValue({ uid: "u2" });
    const out = await authenticate(reqWith({ Cookie: "session=goodcookie" }));
    expect(out).toEqual({ uid: "u2", email: undefined, emailVerified: false });
    expect(h.verifySessionCookie).toHaveBeenCalledWith("goodcookie", true);
  });

  it("surfaces the email/email_verified claims from a session cookie", async () => {
    h.verifySessionCookie.mockResolvedValue({
      uid: "u2",
      email: "cap@example.com",
      email_verified: true,
    });
    const out = await authenticate(reqWith({ Cookie: "session=goodcookie" }));
    expect(out).toEqual({ uid: "u2", email: "cap@example.com", emailVerified: true });
  });

  it("returns the uid for a valid bearer token", async () => {
    h.verifyIdToken.mockResolvedValue({ uid: "u1" });
    const out = await authenticate(reqWith({ Authorization: "Bearer good" }));
    expect(out).toEqual({ uid: "u1", email: undefined, emailVerified: false });
    expect(h.verifyIdToken).toHaveBeenCalledWith("good");
  });

  it("surfaces the email/email_verified claims from the token", async () => {
    h.verifyIdToken.mockResolvedValue({
      uid: "u1",
      email: "cap@example.com",
      email_verified: true,
    });
    const out = await authenticate(reqWith({ Authorization: "Bearer good" }));
    expect(out).toEqual({ uid: "u1", email: "cap@example.com", emailVerified: true });
  });

  it("falls back to anonymous when the ID token is invalid", async () => {
    h.verifyIdToken.mockRejectedValue(new Error("bad token"));
    const out = await authenticate(reqWith({ Authorization: "Bearer bad" }));
    expect(out).toEqual({ emailVerified: false });
  });

  it("ignores a non-Bearer Authorization scheme", async () => {
    const out = await authenticate(reqWith({ Authorization: "Basic abc" }));
    expect(out).toEqual({ emailVerified: false });
    expect(h.verifyIdToken).not.toHaveBeenCalled();
  });

  it("does not verify App Check when enforcement is off", async () => {
    await authenticate(reqWith({ "X-Firebase-AppCheck": "anything" }));
    expect(h.verifyToken).not.toHaveBeenCalled();
  });
});

describe("notFoundHandler / errorHandler", () => {
  const noopNext = (() => {}) as NextFunction;

  it("returns JSON 404 for unknown paths", () => {
    const res = mockRes();
    notFoundHandler(reqWith(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "not found" });
  });

  it("returns sanitized JSON 500 without leaking the error", () => {
    const res = mockRes();
    errorHandler(new Error("secret detail"), { path: "/chat" } as Request, res, noopNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "internal error" });
  });

  it("terminates instead of writing JSON when headers are already sent (mid-SSE)", () => {
    const res = mockRes(true);
    errorHandler(new Error("boom"), { path: "/chat" } as Request, res, noopNext);
    expect(res.end).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("authenticate — App Check enforced", () => {
  let enforced: typeof import("../src/gateway.js");

  beforeEach(async () => {
    vi.resetModules();
    // firebase-functions v7's defineBoolean only parses "true"/"false" — "1" is false.
    process.env.ENFORCE_APP_CHECK = "true";
    enforced = await import("../src/gateway.js");
  });

  afterEach(() => {
    delete process.env.ENFORCE_APP_CHECK;
  });

  it("throws AuthError when the App Check token is missing", async () => {
    // resetModules() minted a fresh module, so assert against its own AuthError.
    await expect(enforced.authenticate(reqWith())).rejects.toBeInstanceOf(enforced.AuthError);
  });

  it("throws AuthError when the App Check token is invalid", async () => {
    h.verifyToken.mockRejectedValue(new Error("nope"));
    await expect(
      enforced.authenticate(reqWith({ "X-Firebase-AppCheck": "bad" })),
    ).rejects.toBeInstanceOf(enforced.AuthError);
  });

  it("passes once App Check verifies, then resolves the bearer uid", async () => {
    h.verifyToken.mockResolvedValue({});
    h.verifyIdToken.mockResolvedValue({ uid: "u2" });
    const out = await enforced.authenticate(
      reqWith({ "X-Firebase-AppCheck": "ok", Authorization: "Bearer good" }),
    );
    expect(out).toEqual({ uid: "u2", email: undefined, emailVerified: false });
    expect(h.verifyToken).toHaveBeenCalledWith("ok");
  });
});
