/**
 * Wrapper-level tests for the money-moving Moyasar callables + the scheduled renewal
 * engine in functions/src/billing.ts — the layers billing-core.test.ts (pure policy)
 * and billing-webhook.test.ts (the fulfilment backstop) don't reach:
 *
 *   - createCheckoutConfig  (validate + server-side price + persist a checkout intent)
 *   - confirmPayment        (browser-redirect fulfilment + the payment-is-yours guard)
 *   - cancelAutoRenew       (turn the renewal engine off)
 *   - getReferralCode       (mint + persist the caller's referral code)
 *   - renewMoyasarSubscriptions (the daily token-recharge sweep: renewOne / the
 *                                recordRenewalFailure retry+give-up ladder)
 *
 * Callables run via the CallableFunction `.run(request)` escape hatch and the schedule
 * via its `.run()` — both bypass HTTP/App Check/CORS. firebase-admin + the Moyasar REST
 * API are mocked behind a small in-memory Firestore (get/set/create + a `where`-query
 * for the due-subscriptions sweep) and a per-test `fetch` stub. Mirrors billing-webhook.test.ts.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallableRequest } from "firebase-functions/https";
import { MAX_RENEWAL_ATTEMPTS } from "../src/billing-core.js";

const h = vi.hoisted(() => ({
  stores: {} as Record<string, Record<string, Record<string, unknown> | undefined>>,
  // Per-test fetch behaviour for the mocked Moyasar REST client. GET = fetch a payment
  // (confirmPayment); POST = charge a saved token (the renewal engine).
  fetchImpl: (async () => ({ ok: true, status: 200, json: async () => ({}) })) as (
    url: string,
    init?: { method?: string },
  ) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>,
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
  };
}
function collectionRef(coll: string) {
  // The renewal sweep filters with `.where(...).where(...).where(...).get()`; the mock
  // ignores the predicates and returns every doc in the collection — tests seed only
  // the rows they intend to be "due".
  const query = {
    where: () => query,
    get: () =>
      Promise.resolve({
        docs: Object.entries(h.stores[coll] ?? {})
          .filter(([, data]) => data !== undefined)
          .map(([id, data]) => ({ id, data: () => data })),
      }),
  };
  return { doc: (id: string) => makeDoc(coll, id), where: () => query };
}

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: (c: string) => collectionRef(c) }),
  FieldValue: { increment: (n: number) => ({ __inc: n }), serverTimestamp: () => ({ __ts: true }) },
}));
vi.mock("firebase-functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase-functions")>()),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

let createCheckoutConfig: (
  request: CallableRequest<Record<string, unknown> | undefined>,
) => Promise<Record<string, unknown>>;
let confirmPayment: (
  request: CallableRequest<Record<string, unknown> | undefined>,
) => Promise<{ redirectTo: string }>;
let cancelAutoRenew: (
  request: CallableRequest<unknown>,
) => Promise<{ ok: boolean }>;
let getReferralCode: (request: CallableRequest<unknown>) => Promise<{ code: string }>;
let renewMoyasarSubscriptions: (event: unknown) => Promise<void>;

beforeAll(async () => {
  Object.assign(process.env, {
    MOYASAR_SECRET_KEY: "sk_test",
    MOYASAR_WEBHOOK_SECRET: "whsec_test",
    MOYASAR_PRICE_PRO_MONTHLY_SAR: "59",
    MOYASAR_PRICE_PRO_ANNUAL_SAR: "449",
    MOYASAR_PRICE_STUDENT_MONTHLY_SAR: "39",
    MOYASAR_PRICE_STUDENT_ANNUAL_SAR: "299",
    MOYASAR_PRICE_PASS_SAR: "149",
    MOYASAR_PRICE_CREDITS_SAR: "19",
    MOYASAR_PRICE_PREP_PACK_SAR: "39",
    MOYASAR_PRICE_PREP_PACK_CERT_SAR: "59",
    MOYASAR_PRICE_PREP_PACK_SUBJECT_SAR: "29",
    MOYASAR_PRICE_BUNDLE_SAR: "199",
    MOYASAR_PRICE_COHORT_SAR: "2499",
    APP_ORIGIN: "https://flygaca.com",
  });
  const mod = await import("../src/billing.js");
  createCheckoutConfig = (request) => mod.createCheckoutConfig.run(request);
  confirmPayment = (request) => mod.confirmPayment.run(request);
  cancelAutoRenew = (request) => mod.cancelAutoRenew.run(request);
  getReferralCode = (request) => mod.getReferralCode.run(request);
  renewMoyasarSubscriptions = (event) => mod.renewMoyasarSubscriptions.run(event);
});

beforeEach(() => {
  h.stores = {};
  h.fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: { method?: string }) => h.fetchImpl(url, init)),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Minimal CallableRequest — only the fields billing.ts actually reads. */
function req(
  auth?: { uid: string; email?: string; emailVerified?: boolean },
  data?: Record<string, unknown>,
): CallableRequest<Record<string, unknown> | undefined> {
  return {
    data,
    auth: auth
      ? {
        uid: auth.uid,
        token: { email: auth.email, email_verified: auth.emailVerified } as never,
        rawToken: "raw",
      }
      : undefined,
    rawRequest: {} as never,
    acceptsStreaming: false,
  };
}

// ---- createCheckoutConfig -------------------------------------------------------

describe("createCheckoutConfig — validation guards", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(createCheckoutConfig(req(undefined, { kind: "pro" }))).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects an unknown checkout kind", async () => {
    await expect(
      createCheckoutConfig(req({ uid: "u1" }, { kind: "free-lunch" })),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejects a pack checkout with an unknown/unsellable packId", async () => {
    await expect(
      createCheckoutConfig(req({ uid: "u1" }, { kind: "pack", packId: "not-a-pack" })),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejects a cohort checkout with no org name", async () => {
    await expect(
      createCheckoutConfig(req({ uid: "u1" }, { kind: "cohort", orgName: "   " })),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("rejects a student checkout without a verified academic email", async () => {
    await expect(
      createCheckoutConfig(
        req({ uid: "u1", email: "someone@gmail.com", emailVerified: true }, { kind: "student" }),
      ),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });
});

describe("createCheckoutConfig — pricing & intent persistence", () => {
  it("persists a pending pro intent and returns a recurring-checkout config", async () => {
    const cfg = await createCheckoutConfig(req({ uid: "u1" }, { kind: "pro", cadence: "annual" }));
    expect(cfg.currency).toBe("SAR");
    expect(typeof cfg.amount).toBe("number");
    expect(cfg.amount as number).toBeGreaterThan(0);
    // No promo → the charge equals the list price.
    expect(cfg.amount).toBe(cfg.listAmount);
    expect(cfg.promoApplied).toBeNull();
    // Recurring plans force a saved card and card-only methods.
    expect(cfg.saveCard).toBe(true);
    expect(cfg.methods).toEqual(["creditcard"]);

    const intents = Object.values(h.stores.checkoutIntents ?? {});
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({ uid: "u1", kind: "pro", cadence: "annual", status: "pending" });
  });

  it("applies a server-validated promo code to the first charge only", async () => {
    h.stores.promoCodes = { SAVE10: { type: "percent", value: 10, active: true } };
    const cfg = await createCheckoutConfig(
      req({ uid: "u1" }, { kind: "pass", promo: "save10" }),
    );
    // The discount is applied server-side; the client only passed the code string.
    expect(cfg.promoApplied).toBe("SAVE10");
    expect(cfg.amount as number).toBeLessThan(cfg.listAmount as number);
    const intents = Object.values(h.stores.checkoutIntents ?? {});
    expect(intents[0]).toMatchObject({ kind: "pass", promo: "SAVE10" });
  });

  it("ignores an inactive promo code and charges the list price", async () => {
    h.stores.promoCodes = { OFF: { type: "percent", value: 50, active: false } };
    const cfg = await createCheckoutConfig(req({ uid: "u1" }, { kind: "pass", promo: "OFF" }));
    expect(cfg.promoApplied).toBeNull();
    expect(cfg.amount).toBe(cfg.listAmount);
  });
});

describe("createCheckoutConfig — accepted kinds", () => {
  it("offers every method and no saved card for a one-time pass", async () => {
    const cfg = await createCheckoutConfig(req({ uid: "u1" }, { kind: "pass" }));
    expect(cfg.saveCard).toBe(false);
    expect(cfg.methods).toEqual(["creditcard", "applepay", "stcpay"]);
    expect(cfg.description).toBe("Fly GACA Exam Season Pass");
  });

  it("prices the discounted student rate for a verified academic email", async () => {
    const cfg = await createCheckoutConfig(
      req({ uid: "u1", email: "student@ksu.edu.sa", emailVerified: true }, { kind: "student" }),
    );
    // Student is a recurring plan → saved card, card-only methods.
    expect(cfg.saveCard).toBe(true);
    expect(cfg.methods).toEqual(["creditcard"]);
    const intents = Object.values(h.stores.checkoutIntents ?? {});
    expect(intents[0]).toMatchObject({ kind: "student", status: "pending" });
  });

  it("accepts a valid exam-prep pack purchase", async () => {
    const cfg = await createCheckoutConfig(req({ uid: "u1" }, { kind: "pack", packId: "medical" }));
    expect(cfg.description).toBe("Fly GACA Exam Prep Pack — medical");
    expect(Object.values(h.stores.checkoutIntents ?? {})[0]).toMatchObject({
      kind: "pack",
      packId: "medical",
    });
  });

  it("accepts a cohort purchase carrying a trimmed org name", async () => {
    const cfg = await createCheckoutConfig(
      req({ uid: "u1" }, { kind: "cohort", orgName: "  Acme Flight School  " }),
    );
    expect(cfg.description).toContain("Cohort");
    expect(Object.values(h.stores.checkoutIntents ?? {})[0]).toMatchObject({
      kind: "cohort",
      orgName: "Acme Flight School",
    });
  });

  it("accepts a credit-pack top-up", async () => {
    const cfg = await createCheckoutConfig(req({ uid: "u1" }, { kind: "credits" }));
    expect(cfg.description).toContain("credit pack");
    expect(cfg.saveCard).toBe(false);
  });
});

// ---- confirmPayment -------------------------------------------------------------

/** A Moyasar `GET /payments/{id}` stub returning a paid payment for `checkoutId`. */
function stubPaidPayment(payment: Record<string, unknown>) {
  h.fetchImpl = async () => ({ ok: true, status: 200, json: async () => payment });
}

describe("confirmPayment — guards", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(confirmPayment(req(undefined, { id: "pay_1" }))).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects a call with no payment id", async () => {
    await expect(confirmPayment(req({ uid: "u1" }, {}))).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("confirmPayment — fulfilment & ownership", () => {
  it("fulfils the caller's own paid checkout and returns its success redirect", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pass", amount: 14900, currency: "SAR", status: "pending" },
    };
    stubPaidPayment({
      id: "pay_1",
      status: "paid",
      amount: 14900,
      currency: "SAR",
      metadata: { checkoutId: "co_1" },
    });
    const result = await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(result).toEqual({ redirectTo: "/account?checkout=success" });
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("pro");
    expect(h.stores.checkoutIntents?.co_1?.status).toBe("fulfilled");
  });

  it("refuses to confirm a payment that belongs to another user", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pass", amount: 14900, currency: "SAR", status: "pending" },
    };
    stubPaidPayment({
      id: "pay_1",
      status: "paid",
      amount: 14900,
      currency: "SAR",
      metadata: { checkoutId: "co_1" },
    });
    await expect(confirmPayment(req({ uid: "u2" }, { id: "pay_1" }))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("does not grant when the paid amount doesn't match the stored intent", async () => {
    h.stores.checkoutIntents = {
      co_1: { uid: "u1", kind: "pro", cadence: "annual", amount: 44900, currency: "SAR", status: "pending" },
    };
    stubPaidPayment({
      id: "pay_1",
      status: "paid",
      amount: 100, // tampered / wrong
      currency: "SAR",
      metadata: { checkoutId: "co_1" },
    });
    const result = await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(result.redirectTo).toBe("/pricing?checkout=cancel");
    expect(h.stores.users).toBeUndefined();
  });
});

describe("confirmPayment — fulfilment across checkout kinds", () => {
  function seedIntentAndPayment(intent: Record<string, unknown>, payment: Record<string, unknown> = {}) {
    h.stores.checkoutIntents = { co_1: { currency: "SAR", status: "pending", ...intent } };
    stubPaidPayment({
      id: "pay_1",
      status: "paid",
      amount: intent.amount,
      currency: "SAR",
      metadata: { checkoutId: "co_1" },
      ...payment,
    });
  }

  it("grants Pro, saves the card token and opens a subscription for a recurring plan", async () => {
    seedIntentAndPayment(
      { uid: "u1", kind: "pro", cadence: "annual", amount: 44900 },
      { source: { type: "creditcard", token: "tok_abc", company: "visa", last_four: "4242" } },
    );
    const result = await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(result.redirectTo).toBe("/account?checkout=success");
    expect((h.stores.users?.u1?.entitlement as { plan: string }).plan).toBe("pro");
    expect(h.stores.moyasarCustomers?.u1?.token).toBe("tok_abc");
    expect(h.stores.subscriptions?.u1).toMatchObject({ autoRenew: true, status: "active" });
  });

  it("grants every sellable pack for an All-Access bundle purchase", async () => {
    seedIntentAndPayment({ uid: "u1", kind: "bundle", amount: 19900 });
    const result = await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(result.redirectTo).toBe("/study/packs?checkout=success");
    const packs = h.stores.packEntitlements?.u1?.packs as Record<string, unknown>;
    expect(Object.keys(packs).length).toBeGreaterThan(1);
  });

  it("provisions a cohort org for a cohort purchase", async () => {
    seedIntentAndPayment({ uid: "u1", kind: "cohort", orgName: "Acme", amount: 249900 });
    const result = await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(result.redirectTo).toBe("/business/admin?checkout=success");
    expect(Object.keys(h.stores.orgs ?? {})).toHaveLength(1);
  });

  it("tops up credits for a credit-pack purchase", async () => {
    seedIntentAndPayment({ uid: "u1", kind: "credits", amount: 1900 });
    await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(Number(h.stores.chatCredits?.u1?.balance)).toBeGreaterThan(0);
  });

  it("records pack ownership for a single-pack purchase", async () => {
    seedIntentAndPayment({ uid: "u1", kind: "pack", packId: "medical", amount: 3900 });
    const result = await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(result.redirectTo).toBe("/study/packs/medical?checkout=success");
    const packs = h.stores.packEntitlements?.u1?.packs as Record<string, unknown>;
    expect(packs?.medical).toMatchObject({ source: "moyasar" });
  });

  it("counts a promo redemption once on the fulfilled charge", async () => {
    h.stores.promoCodes = { SAVE10: { type: "percent", value: 10, active: true, redeemed: 0 } };
    seedIntentAndPayment({ uid: "u1", kind: "pass", promo: "SAVE10", amount: 13410 });
    await confirmPayment(req({ uid: "u1" }, { id: "pay_1" }));
    expect(h.stores.promoCodes?.SAVE10?.redeemed).toBe(1);
  });
});

// ---- cancelAutoRenew ------------------------------------------------------------

describe("cancelAutoRenew", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(cancelAutoRenew(req())).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("turns off auto-renew for the caller's subscription", async () => {
    h.stores.subscriptions = { u1: { autoRenew: true, status: "active" } };
    const result = await cancelAutoRenew(req({ uid: "u1" }));
    expect(result).toEqual({ ok: true });
    expect(h.stores.subscriptions?.u1?.autoRenew).toBe(false);
  });
});

// ---- getReferralCode ------------------------------------------------------------

describe("getReferralCode", () => {
  it("rejects an unauthenticated call", async () => {
    await expect(getReferralCode(req())).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("mints and persists a code mapped back to the caller", async () => {
    const result = await getReferralCode(req({ uid: "u1" }));
    expect(typeof result.code).toBe("string");
    expect(result.code.length).toBeGreaterThan(0);
    expect(h.stores.referralCodes?.[result.code]).toEqual({ uid: "u1" });
  });
});

// ---- renewMoyasarSubscriptions (the daily token-recharge sweep) ------------------

/** Seed a due subscriber with a saved card token and an existing (near-expiry) plan. */
function seedDueSubscriber(
  uid: string,
  opts: { token?: string; failedAttempts?: number; expiresAt?: string } = {},
) {
  h.stores.subscriptions = {
    ...(h.stores.subscriptions ?? {}),
    [uid]: {
      cadence: "annual",
      autoRenew: true,
      status: "active",
      failedAttempts: opts.failedAttempts ?? 0,
      nextChargeAt: "2000-01-01T00:00:00.000Z", // in the past → due
    },
  };
  if (opts.token !== undefined) {
    h.stores.moyasarCustomers = {
      ...(h.stores.moyasarCustomers ?? {}),
      [uid]: { token: opts.token },
    };
  }
  h.stores.users = {
    ...(h.stores.users ?? {}),
    [uid]: {
      entitlement: {
        plan: "pro",
        source: "moyasar",
        expiresAt: opts.expiresAt ?? "2000-01-03T00:00:00.000Z",
      },
    },
  };
}

describe("renewMoyasarSubscriptions — successful renewal", () => {
  it("re-charges the saved token and extends the entitlement", async () => {
    seedDueSubscriber("u1", { token: "tok_x", expiresAt: "2000-01-03T00:00:00.000Z" });
    h.fetchImpl = async (_url, init) =>
      init?.method === "POST"
        ? { ok: true, status: 200, json: async () => ({ id: "pay_r", status: "paid" }) }
        : { ok: true, status: 200, json: async () => ({}) };

    await renewMoyasarSubscriptions({});

    const ent = h.stores.users?.u1?.entitlement as { expiresAt: string };
    // Extended well past the old near-expiry date.
    expect(Date.parse(ent.expiresAt)).toBeGreaterThan(Date.parse("2000-01-03T00:00:00.000Z"));
    const sub = h.stores.subscriptions?.u1 as { status: string; failedAttempts: number };
    expect(sub.status).toBe("active");
    expect(sub.failedAttempts).toBe(0);
  });
});

describe("renewMoyasarSubscriptions — failure & retry ladder", () => {
  it("cancels a due subscription that has lost its saved card token", async () => {
    seedDueSubscriber("u1"); // no token seeded
    await renewMoyasarSubscriptions({});
    const sub = h.stores.subscriptions?.u1 as { status: string; autoRenew: boolean };
    expect(sub.status).toBe("canceled");
    expect(sub.autoRenew).toBe(false);
  });

  it("marks the subscription past_due and increments attempts when the charge errors", async () => {
    seedDueSubscriber("u1", { token: "tok_x", failedAttempts: 0 });
    h.fetchImpl = async (_url, init) =>
      init?.method === "POST"
        ? { ok: false, status: 402, json: async () => ({ message: "declined" }) }
        : { ok: true, status: 200, json: async () => ({}) };

    await renewMoyasarSubscriptions({});

    const sub = h.stores.subscriptions?.u1 as { status: string; failedAttempts: number };
    expect(sub.status).toBe("past_due");
    expect(sub.failedAttempts).toBe(1);
  });

  it("gives up and cancels after the final attempt is exhausted", async () => {
    // One away from the cap: the next failure crosses MAX_RENEWAL_ATTEMPTS.
    seedDueSubscriber("u1", { token: "tok_x", failedAttempts: MAX_RENEWAL_ATTEMPTS - 1 });
    h.fetchImpl = async (_url, init) =>
      init?.method === "POST"
        ? { ok: false, status: 402, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({}) };

    await renewMoyasarSubscriptions({});

    const sub = h.stores.subscriptions?.u1 as { status: string; autoRenew: boolean; failedAttempts: number };
    expect(sub.status).toBe("canceled");
    expect(sub.autoRenew).toBe(false);
    expect(sub.failedAttempts).toBe(MAX_RENEWAL_ATTEMPTS);
  });

  it("treats a non-paid charge result as a renewal failure", async () => {
    seedDueSubscriber("u1", { token: "tok_x", failedAttempts: 0 });
    h.fetchImpl = async (_url, init) =>
      init?.method === "POST"
        ? { ok: true, status: 200, json: async () => ({ id: "pay_r", status: "failed" }) }
        : { ok: true, status: 200, json: async () => ({}) };

    await renewMoyasarSubscriptions({});

    const sub = h.stores.subscriptions?.u1 as { status: string; failedAttempts: number };
    expect(sub.status).toBe("past_due");
    expect(sub.failedAttempts).toBe(1);
  });
});
