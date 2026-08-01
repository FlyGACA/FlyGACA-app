/**
 * `moyasarWebhook` — the async backstop for `fulfillPayment`, the ONE path that
 * grants entitlements/packs/credits from a Moyasar payment (shared with the
 * `confirmPayment` callable, which is exercised manually/e2e — see docs/BILLING.md).
 * Covers: signature verification, the moyasarPayments/{id} idempotency marker,
 * fulfilment by checkout kind, the amount/currency cross-check against the stored
 * checkoutIntent, and card-token capture for recurring checkouts. Moyasar's REST API
 * and firebase-admin are mocked with a small in-memory Firestore honouring the
 * create()/set() semantics the idempotency guard and intent lookup rely on.
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CREDIT_PACK_SIZE } from "../src/chat-quota-core.js";

const h = vi.hoisted(() => ({
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
  payment: undefined as unknown,
  getThrows: false,
}));

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v) && !("__inc" in (v as object));
}

function mergeInto(cur: Record<string, unknown>, val: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...cur };
  for (const [k, v] of Object.entries(val)) {
    if (v && typeof v === "object" && "__inc" in (v as object)) {
      next[k] = Number(cur[k] ?? 0) + (v as { __inc: number }).__inc;
    } else if (isPlainObject(v) && isPlainObject(cur[k])) {
      next[k] = mergeInto(cur[k] as Record<string, unknown>, v);
    } else {
      next[k] = v;
    }
  }
  return next;
}

function writeDoc(coll: string, id: string, val: Record<string, unknown>, opts?: { merge?: boolean }) {
  h.stores[coll] ??= {};
  const cur = opts?.merge ? (h.stores[coll][id] ?? {}) : {};
  h.stores[coll][id] = mergeInto(cur as Record<string, unknown>, val);
}

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
      writeDoc(coll, id, val, opts);
      return Promise.resolve();
    },
    create: (val: Record<string, unknown>) => {
      if (h.stores[coll]?.[id] !== undefined) return Promise.reject(new Error("already-exists"));
      writeDoc(coll, id, val);
      return Promise.resolve();
    },
    delete: () => {
      if (h.stores[coll]) delete h.stores[coll][id];
      return Promise.resolve();
    },
  };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => ({ doc: (id: string) => makeDoc(c, id) }) }),
  FieldValue: { increment: (n: number) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) },
}));
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

let moyasarWebhook: (req: unknown, res: unknown) => Promise<void> | void;

const WEBHOOK_SECRET = "whsec_test";

beforeAll(async () => {
  Object.assign(process.env, {
    MOYASAR_SECRET_KEY: "sk_test",
    MOYASAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
    MOYASAR_PRICE_PRO_MONTHLY_SAR: "59",
    MOYASAR_PRICE_PRO_ANNUAL_SAR: "449",
    MOYASAR_PRICE_STUDENT_MONTHLY_SAR: "39",
    MOYASAR_PRICE_STUDENT_ANNUAL_SAR: "299",
    MOYASAR_PRICE_PASS_SAR: "149",
    MOYASAR_PRICE_CREDITS_SAR: "19",
    MOYASAR_PRICE_PREP_PACK_SAR: "39",
    APP_ORIGIN: "https://flygaca.com",
  });
  moyasarWebhook = (await import("../src/billing.js")).moyasarWebhook as typeof moyasarWebhook;
});

function mockRes() {
  const res = { statusCode: 0, status: vi.fn(), send: vi.fn(), json: vi.fn() };
  res.status.mockImplementation((c: number) => {
    res.statusCode = c;
    return res;
  });
  return res;
}

function signedReq(paymentId: string) {
  const body = JSON.stringify({ type: "payment_paid", data: { id: paymentId } });
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  return {
    headers: { "x-moyasar-signature": sig },
    rawBody: Buffer.from(body),
    body: { type: "payment_paid", data: { id: paymentId } },
  };
}

async function invoke(req: ReturnType<typeof signedReq>, res: ReturnType<typeof mockRes>) {
  await moyasarWebhook(req, res);
}

beforeEach(() => {
  h.stores = {};
  h.getThrows = false;
  h.payment = { id: "pay_1", status: "paid", amount: 4900, currency: "SAR", metadata: { checkoutId: "co_1" } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (h.getThrows) throw new Error("moyasar down");
      return { ok: true, status: 200, json: async () => h.payment };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("moyasarWebhook — signature verification", () => {
  it("400s when the signature is missing or wrong", async () => {
    const res = mockRes();
    await invoke({ headers: {}, rawBody: Buffer.from("{}"), body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    const res2 = mockRes();
    await invoke(
      { headers: { "x-moyasar-signature": "deadbeef" }, rawBody: Buffer.from("{}"), body: {} },
      res2,
    );
    expect(res2.status).toHaveBeenCalledWith(400);
  });
});

describe("moyasarWebhook — fulfilment", () => {
  it("grants a Pro entitlement, saves the card token, and opens a subscription for a paid pro checkout", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pro", cadence: "annual", amount: 4900, currency: "SAR", status: "pending" },
    };
    h.payment = {
      id: "pay_1",
      status: "paid",
      amount: 4900,
      currency: "SAR",
      metadata: { checkoutId: "co_1" },
      source: { type: "creditcard", token: "tok_abc", company: "visa", last_four: "4242" },
    };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("pro");
    expect(h.stores.moyasarCustomers?.u1?.token).toBe("tok_abc");
    expect(h.stores.subscriptions?.u1).toMatchObject({ cadence: "annual", autoRenew: true, status: "active" });
    expect(h.stores.checkoutIntents?.co_1?.status).toBe("fulfilled");
  });

  it("grants an Exam Season Pass for a paid 'pass' checkout", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pass", amount: 4900, currency: "SAR", status: "pending" },
    };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("pro");
  });

  it("tops up the credit balance for a paid 'credits' checkout", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "credits", amount: 4900, currency: "SAR", status: "pending" },
    };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(h.stores.chatCredits?.u1?.balance).toBe(CREDIT_PACK_SIZE);
  });

  it("records pack ownership for a paid 'pack' checkout", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pack", packId: "medical", amount: 4900, currency: "SAR", status: "pending" },
    };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    const packs = h.stores.packEntitlements?.u1?.packs as Record<string, unknown>;
    expect(packs?.medical).toMatchObject({ source: "moyasar" });
  });

  it("acks without granting for an unknown/tampered packId", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pack", packId: "foi", amount: 4900, currency: "SAR", status: "pending" },
    };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(h.stores.packEntitlements).toBeUndefined();
  });

  it("rewards a valid referral on both sides", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pass", ref: "ABCD2345", amount: 4900, currency: "SAR", status: "pending" },
    };
    h.stores.referralCodes = { ABCD2345: { uid: "referrer" } };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(h.stores.chatCredits?.referrer?.balance).toBeGreaterThan(0);
    expect(h.stores.chatCredits?.u1?.balance).toBeGreaterThan(0);
    expect(h.stores.referrals?.u1).toBeDefined();
  });
});

describe("moyasarWebhook — idempotency, mismatches & errors", () => {
  it("acks a duplicate event without reprocessing", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pass", amount: 4900, currency: "SAR", status: "pending" },
    };
    h.stores.moyasarPayments = { pay_1: { receivedAt: "already-seen" } };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(h.stores.users).toBeUndefined();
  });

  it("does not grant when the paid amount doesn't match the checkout intent", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pro", cadence: "annual", amount: 44900, currency: "SAR", status: "pending" },
    };
    h.payment = { id: "pay_1", status: "paid", amount: 100, currency: "SAR", metadata: { checkoutId: "co_1" } };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(h.stores.users).toBeUndefined();
  });

  it("does not grant a failed payment", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pass", amount: 4900, currency: "SAR", status: "pending" },
    };
    h.payment = { id: "pay_1", status: "failed", amount: 4900, currency: "SAR", metadata: { checkoutId: "co_1" } };
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(h.stores.users).toBeUndefined();
  });

  it("acks without crashing when the checkout intent is missing", async () => {
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(h.stores.users).toBeUndefined();
  });

  it("500s when the Moyasar API call fails", async () => {
    h.getThrows = true;
    const res = mockRes();
    await invoke(signedReq("pay_1"), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
