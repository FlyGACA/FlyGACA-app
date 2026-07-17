/**
 * The Stripe webhook — the ONLY writer of users/{uid}.entitlement. The pure
 * derivation lives in billing-core.ts (tested there); this covers the wiring:
 * signature verification, at-least-once idempotency (the stripeEvents marker),
 * event-type routing, and the roll-back-and-500 on a handler error. Stripe and
 * firebase-admin are mocked with a small in-memory Firestore that honours the
 * create()/delete() semantics the idempotency guard relies on.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CREDIT_PACK_SIZE } from "../src/chat-quota-core.js";

const FUTURE = Math.floor(Date.now() / 1000) + 30 * 86400;

const h = vi.hoisted(() => ({
  constructThrows: false,
  event: undefined as unknown,
  subscription: undefined as unknown,
  customer: undefined as unknown,
  subRetrieveThrows: false,
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
}));

function writeDoc(coll: string, id: string, val: Record<string, unknown>, opts?: { merge?: boolean }) {
  h.stores[coll] ??= {};
  const cur = opts?.merge ? (h.stores[coll][id] ?? {}) : {};
  const next: Record<string, unknown> = { ...cur };
  for (const [k, v] of Object.entries(val)) {
    if (v && typeof v === "object" && "__inc" in (v as object)) {
      next[k] = Number((cur as Record<string, unknown>)[k] ?? 0) + (v as { __inc: number }).__inc;
    } else {
      next[k] = v;
    }
  }
  h.stores[coll][id] = next;
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

vi.mock("stripe", () => ({
  default: class {
    webhooks = {
      constructEvent: () => {
        if (h.constructThrows) throw new Error("bad signature");
        return h.event;
      },
    };
    subscriptions = {
      retrieve: () => {
        if (h.subRetrieveThrows) return Promise.reject(new Error("stripe down"));
        return Promise.resolve(h.subscription);
      },
    };
    customers = {
      retrieve: () => Promise.resolve(h.customer),
      create: () => Promise.resolve({ id: "cus_new" }),
    };
  },
}));

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => ({ doc: (id: string) => makeDoc(c, id) }) }),
  FieldValue: { increment: (n: number) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) },
}));
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

let stripeWebhook: (req: unknown, res: unknown) => Promise<void> | void;

beforeAll(async () => {
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
    STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
    STRIPE_PRICE_STUDENT_MONTHLY: "price_student_monthly",
    STRIPE_PRICE_STUDENT_ANNUAL: "price_student_annual",
    STRIPE_PRICE_PASS: "price_pass",
    STRIPE_PRICE_CREDITS: "price_credits",
    APP_ORIGIN: "https://flygaca.com",
  });
  stripeWebhook = (await import("../src/billing.js")).stripeWebhook as typeof stripeWebhook;
});

function mockRes() {
  const res = { statusCode: 0, status: vi.fn(), send: vi.fn(), json: vi.fn() };
  res.status.mockImplementation((c: number) => {
    res.statusCode = c;
    return res;
  });
  return res;
}

const req = { headers: { "stripe-signature": "sig" }, rawBody: Buffer.from("{}") };

async function invoke(res: ReturnType<typeof mockRes>) {
  await stripeWebhook(req, res);
}

beforeEach(() => {
  h.stores = {};
  h.constructThrows = false;
  h.subRetrieveThrows = false;
  h.subscription = {
    status: "active",
    items: { data: [{ price: { id: "price_pro_monthly" } }] },
    current_period_end: FUTURE,
  };
  h.customer = { deleted: false, metadata: { uid: "u1" } };
});

afterEach(() => vi.clearAllMocks());

describe("stripeWebhook — signature & idempotency", () => {
  it("400s when the signature fails to verify", async () => {
    h.constructThrows = true;
    const res = mockRes();
    await invoke(res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("acks a duplicate event without reprocessing", async () => {
    h.event = { id: "evt_dup", type: "checkout.session.completed", data: { object: {} } };
    h.stores.stripeEvents = { evt_dup: { type: "checkout.session.completed" } }; // already seen
    const res = mockRes();
    await invoke(res);
    expect(res.json).toHaveBeenCalledWith({ received: true, duplicate: true });
    // No entitlement written on a replay.
    expect(h.stores.users).toBeUndefined();
  });
});

describe("stripeWebhook — checkout.session.completed", () => {
  it("writes a Pro entitlement for a completed subscription checkout", async () => {
    h.event = {
      id: "evt_sub",
      type: "checkout.session.completed",
      data: {
        object: { client_reference_id: "u1", mode: "subscription", subscription: "sub_1", metadata: {} },
      },
    };
    const res = mockRes();
    await invoke(res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("pro");
  });

  it("grants an Exam Season Pass for a paid one-time 'pass' checkout", async () => {
    h.event = {
      id: "evt_pass",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "u1",
          mode: "payment",
          payment_status: "paid",
          metadata: { kind: "pass" },
        },
      },
    };
    const res = mockRes();
    await invoke(res);
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("pro");
  });

  it("tops up the credit balance for a paid 'credits' checkout", async () => {
    h.event = {
      id: "evt_credits",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "u1",
          mode: "payment",
          payment_status: "paid",
          metadata: { kind: "credits" },
        },
      },
    };
    const res = mockRes();
    await invoke(res);
    expect(h.stores.chatCredits?.u1?.balance).toBe(CREDIT_PACK_SIZE);
  });

  it("rewards a valid referral on both sides", async () => {
    h.stores.referralCodes = { ABCD2345: { uid: "referrer" } };
    h.event = {
      id: "evt_ref",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "u1",
          mode: "subscription",
          subscription: "sub_1",
          metadata: { ref: "ABCD2345" },
        },
      },
    };
    const res = mockRes();
    await invoke(res);
    expect(h.stores.chatCredits?.referrer?.balance).toBeGreaterThan(0);
    expect(h.stores.chatCredits?.u1?.balance).toBeGreaterThan(0);
    expect(h.stores.referrals?.u1).toBeDefined(); // one-time marker
  });
});

describe("stripeWebhook — subscription lifecycle & errors", () => {
  it("downgrades to free on customer.subscription.deleted", async () => {
    h.subscription = undefined;
    h.event = {
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: {
        object: {
          status: "canceled",
          customer: "cus_1",
          items: { data: [{ price: { id: "price_pro_monthly" } }] },
          current_period_end: FUTURE,
        },
      },
    };
    const res = mockRes();
    await invoke(res);
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("free");
  });

  it("rolls back the idempotency marker and 500s when the handler throws", async () => {
    h.subRetrieveThrows = true; // subscriptions.retrieve rejects mid-handler
    h.event = {
      id: "evt_err",
      type: "checkout.session.completed",
      data: {
        object: { client_reference_id: "u1", mode: "subscription", subscription: "sub_1", metadata: {} },
      },
    };
    const res = mockRes();
    await invoke(res);
    expect(res.status).toHaveBeenCalledWith(500);
    // The marker was deleted so Stripe's retry can reprocess.
    expect(h.stores.stripeEvents?.evt_err).toBeUndefined();
  });
});
