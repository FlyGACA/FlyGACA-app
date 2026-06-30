import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { parseRequest, authenticate } from "../src/gateway.js";

// Mocks for the Admin SDK + the RAG flow, so importing the gateway never boots
// firebase-admin or loads genkit. getApps() returns non-empty so the module's
// `initializeApp()` guard is a no-op.
const h = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: h.verifyIdToken }),
}));
vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: () => ({ verifyToken: h.verifyToken }),
}));
vi.mock("../src/captain-adel.js", () => ({
  captainAdelFlow: Object.assign(vi.fn(), { stream: vi.fn() }),
}));

/** A minimal Express-like request carrying just the headers the gateway reads. */
function reqWith(headers: Record<string, string> = {}): Request {
  return { header: (name: string) => headers[name] } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseRequest", () => {
  it("rejects a non-object body", () => {
    expect(parseRequest(null)).toBeNull();
    expect(parseRequest("hello")).toBeNull();
    expect(parseRequest(42)).toBeNull();
  });

  it("rejects a missing or blank message", () => {
    expect(parseRequest({})).toBeNull();
    expect(parseRequest({ message: "" })).toBeNull();
    expect(parseRequest({ message: "   " })).toBeNull();
  });

  it("accepts a minimal message and defaults product to flygaca", () => {
    const out = parseRequest({ message: "what is VMC?" });
    expect(out).toMatchObject({ message: "what is VMC?", product: "flygaca", history: [] });
    expect(out?.provider).toBeUndefined();
    expect(out?.session).toBeUndefined();
  });

  it("passes through optional product / provider / session", () => {
    const out = parseRequest({
      message: "hi",
      product: "captain-adel",
      provider: "pro",
      session: "s1",
    });
    expect(out).toMatchObject({ product: "captain-adel", provider: "pro", session: "s1" });
  });

  it("keeps only well-formed history turns", () => {
    const out = parseRequest({
      message: "hi",
      history: [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "system", content: "drop me" }, // bad role
        { role: "user", content: 5 }, // bad content type
        "nope", // not an object
      ],
    });
    expect(out?.history).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
    ]);
  });

  it("caps history to the most recent 12 turns", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: String(i),
    }));
    const out = parseRequest({ message: "hi", history });
    expect(out?.history).toHaveLength(12);
    expect(out?.history?.[0]?.content).toBe("8"); // 20 - 12
    expect(out?.history?.at(-1)?.content).toBe("19");
  });

  it("treats a non-array history as empty", () => {
    expect(parseRequest({ message: "hi", history: "oops" })?.history).toEqual([]);
  });
});

describe("authenticate — App Check not enforced (default)", () => {
  it("returns anonymous when no Authorization header is present", async () => {
    const out = await authenticate(reqWith());
    expect(out).toEqual({});
    expect(h.verifyIdToken).not.toHaveBeenCalled();
  });

  it("returns the uid for a valid bearer token", async () => {
    h.verifyIdToken.mockResolvedValue({ uid: "u1" });
    const out = await authenticate(reqWith({ Authorization: "Bearer good" }));
    expect(out).toEqual({ uid: "u1" });
    expect(h.verifyIdToken).toHaveBeenCalledWith("good");
  });

  it("falls back to anonymous when the ID token is invalid", async () => {
    h.verifyIdToken.mockRejectedValue(new Error("bad token"));
    const out = await authenticate(reqWith({ Authorization: "Bearer bad" }));
    expect(out).toEqual({});
  });

  it("ignores a non-Bearer Authorization scheme", async () => {
    const out = await authenticate(reqWith({ Authorization: "Basic abc" }));
    expect(out).toEqual({});
    expect(h.verifyIdToken).not.toHaveBeenCalled();
  });

  it("does not verify App Check when enforcement is off", async () => {
    await authenticate(reqWith({ "X-Firebase-AppCheck": "anything" }));
    expect(h.verifyToken).not.toHaveBeenCalled();
  });
});

describe("authenticate — App Check enforced", () => {
  let enforced: typeof import("../src/gateway.js");

  beforeEach(async () => {
    vi.resetModules();
    process.env.ENFORCE_APP_CHECK = "1";
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
    expect(out).toEqual({ uid: "u2" });
    expect(h.verifyToken).toHaveBeenCalledWith("ok");
  });
});
