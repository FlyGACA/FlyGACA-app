import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MAX_RENEWAL_ATTEMPTS,
  PASS_DAYS,
  RENEWAL_LEAD_DAYS,
  SELLABLE_PACK_IDS,
  amountForCheckout,
  cadenceDays,
  effectivePlan,
  entitlementFromCheckout,
  entitlementFromPass,
  extendExpiry,
  isPaidActive,
  isRecurringKind,
  nextChargeAt,
  sarToHalalas,
  sellablePackId,
  verifyMoyasarSignature,
  type PriceEnv,
} from "../src/billing-core.js";

const env: PriceEnv = {
  proMonthly: "59",
  proAnnual: "449",
  studentMonthly: "39",
  studentAnnual: "299",
  pass: "149",
  credits: "19",
  prepPack: "39",
};

describe("sarToHalalas", () => {
  it("converts a SAR major-unit string to integer halalas", () => {
    expect(sarToHalalas("59")).toBe(5900);
    expect(sarToHalalas("449.00")).toBe(44900);
    expect(sarToHalalas("39.5")).toBe(3950);
  });

  it("throws on a missing, zero, negative or non-numeric price", () => {
    expect(() => sarToHalalas(undefined)).toThrow();
    expect(() => sarToHalalas("")).toThrow();
    expect(() => sarToHalalas("0")).toThrow();
    expect(() => sarToHalalas("-5")).toThrow();
    expect(() => sarToHalalas("nope")).toThrow();
  });
});

describe("amountForCheckout", () => {
  it("prices Pro by cadence", () => {
    expect(amountForCheckout("pro", "monthly", env)).toBe(5900);
    expect(amountForCheckout("pro", "annual", env)).toBe(44900);
  });

  it("prices the discounted student rate by cadence", () => {
    expect(amountForCheckout("student", "monthly", env)).toBe(3900);
    expect(amountForCheckout("student", "annual", env)).toBe(29900);
  });

  it("prices the one-time SKUs regardless of cadence", () => {
    expect(amountForCheckout("pass", undefined, env)).toBe(14900);
    expect(amountForCheckout("credits", undefined, env)).toBe(1900);
    expect(amountForCheckout("pack", undefined, env)).toBe(3900);
  });
});

describe("isRecurringKind", () => {
  it("is true only for pro/student", () => {
    expect(isRecurringKind("pro")).toBe(true);
    expect(isRecurringKind("student")).toBe(true);
    expect(isRecurringKind("pass")).toBe(false);
    expect(isRecurringKind("credits")).toBe(false);
    expect(isRecurringKind("pack")).toBe(false);
  });
});

describe("effectivePlan", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const future = new Date("2026-08-01T00:00:00Z").toISOString();
  const past = new Date("2026-07-01T00:00:00Z").toISOString();

  it("treats a null/undefined or free entitlement as free", () => {
    expect(effectivePlan(null, now)).toBe("free");
    expect(effectivePlan(undefined, now)).toBe("free");
    expect(effectivePlan({ plan: "free" }, now)).toBe("free");
  });

  it("keeps a paid plan whose expiry is in the future", () => {
    expect(effectivePlan({ plan: "pro", expiresAt: future, source: "moyasar" }, now)).toBe("pro");
    expect(effectivePlan({ plan: "school", expiresAt: future, source: "school" }, now)).toBe(
      "school",
    );
  });

  it("collapses a paid plan whose expiry has passed to free", () => {
    expect(effectivePlan({ plan: "pro", expiresAt: past, source: "moyasar" }, now)).toBe("free");
  });

  it("keeps a non-expiring grant (no expiresAt) — e.g. school/staff", () => {
    expect(effectivePlan({ plan: "school", source: "school" }, now)).toBe("school");
    expect(effectivePlan({ plan: "pro", source: "staff" }, now)).toBe("pro");
  });
});

describe("isPaidActive", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const future = new Date("2026-08-01T00:00:00Z").toISOString();
  const past = new Date("2026-07-01T00:00:00Z").toISOString();

  it("is false for free / null / lapsed entitlements", () => {
    expect(isPaidActive(null, now)).toBe(false);
    expect(isPaidActive({ plan: "free" }, now)).toBe(false);
    expect(isPaidActive({ plan: "pro", expiresAt: past, source: "moyasar" }, now)).toBe(false);
  });

  it("is true for an active or non-expiring paid entitlement", () => {
    expect(isPaidActive({ plan: "pro", expiresAt: future, source: "moyasar" }, now)).toBe(true);
    expect(isPaidActive({ plan: "school", source: "school" }, now)).toBe(true);
  });
});

describe("sellablePackId", () => {
  it("accepts every sellable pack id", () => {
    for (const id of SELLABLE_PACK_IDS) expect(sellablePackId(id)).toBe(id);
  });

  it("rejects a 'soon' / free / unknown pack id", () => {
    expect(sellablePackId("airspace-vfr")).toBeNull();
    expect(sellablePackId("foi")).toBeNull();
    expect(sellablePackId("nope")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(sellablePackId(undefined)).toBeNull();
    expect(sellablePackId(null)).toBeNull();
    expect(sellablePackId(42)).toBeNull();
    expect(sellablePackId({ id: "ppl-exam" })).toBeNull();
  });

  it("mirrors the paid+live packs (guards against catalog drift)", () => {
    expect([...SELLABLE_PACK_IDS]).toEqual([
      "ppl-exam",
      "medical",
      "aip",
      "elp",
      "conversion",
      "cpl",
      "ir",
      "atpl",
    ]);
  });
});

describe("entitlementFromPass", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const passExpiry = new Date(now.getTime() + PASS_DAYS * 24 * 60 * 60 * 1000).toISOString();

  it("grants PASS_DAYS of Pro from now for a new/free buyer", () => {
    expect(entitlementFromPass(now)).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: passExpiry,
    });
    expect(entitlementFromPass(now, { plan: "free" })).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: passExpiry,
    });
  });

  it("extends a paid plan that expires sooner than the pass window", () => {
    const soon = new Date("2026-07-20T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: soon, source: "moyasar" }).expiresAt,
    ).toBe(passExpiry);
  });

  it("never shortens a later existing expiry", () => {
    const later = new Date("2027-01-01T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: later, source: "moyasar" }).expiresAt,
    ).toBe(later);
  });

  it("preserves an active school tier", () => {
    const later = new Date("2027-01-01T00:00:00Z").toISOString();
    expect(entitlementFromPass(now, { plan: "school", expiresAt: later, source: "school" })).toEqual(
      { plan: "school", source: "moyasar", expiresAt: later },
    );
  });

  it("treats a lapsed paid plan as free (fresh 90-day pass)", () => {
    const past = new Date("2026-01-01T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: past, source: "moyasar" }).expiresAt,
    ).toBe(passExpiry);
  });
});

describe("cadence/renewal math", () => {
  it("cadenceDays: 30 for monthly, 365 for annual", () => {
    expect(cadenceDays("monthly")).toBe(30);
    expect(cadenceDays("annual")).toBe(365);
  });

  it("extendExpiry adds one cadence period FROM the given date, not from now", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    expect(extendExpiry(base, "monthly").toISOString()).toBe(
      new Date("2026-01-31T00:00:00Z").toISOString(),
    );
    expect(extendExpiry(base, "annual").toISOString()).toBe(
      new Date("2027-01-01T00:00:00Z").toISOString(),
    );
  });

  it("nextChargeAt is RENEWAL_LEAD_DAYS before expiry by default", () => {
    const expiry = new Date("2026-02-01T00:00:00Z");
    expect(nextChargeAt(expiry).toISOString()).toBe(
      new Date(expiry.getTime() - RENEWAL_LEAD_DAYS * 86400000).toISOString(),
    );
    expect(nextChargeAt(expiry, 7).toISOString()).toBe(
      new Date(expiry.getTime() - 7 * 86400000).toISOString(),
    );
  });

  it("entitlementFromCheckout grants pro, extended from the given base date", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    expect(entitlementFromCheckout("monthly", base)).toEqual({
      plan: "pro",
      source: "moyasar",
      expiresAt: extendExpiry(base, "monthly").toISOString(),
    });
  });

  it("MAX_RENEWAL_ATTEMPTS is a small positive retry budget", () => {
    expect(MAX_RENEWAL_ATTEMPTS).toBeGreaterThan(0);
    expect(MAX_RENEWAL_ATTEMPTS).toBeLessThanOrEqual(RENEWAL_LEAD_DAYS + 3);
  });
});

describe("verifyMoyasarSignature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "payment_paid" });
  const validSig = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a correctly-signed body", () => {
    expect(verifyMoyasarSignature(body, validSig, secret)).toBe(true);
  });

  it("rejects a missing, wrong, or malformed signature", () => {
    expect(verifyMoyasarSignature(body, undefined, secret)).toBe(false);
    expect(verifyMoyasarSignature(body, "deadbeef", secret)).toBe(false);
    expect(verifyMoyasarSignature(body, [validSig], secret)).toBe(false);
  });

  it("rejects a valid signature for a different body (tamper detection)", () => {
    expect(verifyMoyasarSignature(body + "x", validSig, secret)).toBe(false);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const wrongSig = createHmac("sha256", "other-secret").update(body).digest("hex");
    expect(verifyMoyasarSignature(body, wrongSig, secret)).toBe(false);
  });
});
