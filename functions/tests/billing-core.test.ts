import { describe, expect, it } from "vitest";
import {
  effectivePlan,
  entitlementFromSubscription,
  isPaidActive,
  planForPrice,
} from "../src/billing-core.js";

const env = { proMonthly: "price_monthly", proAnnual: "price_annual" };

describe("planForPrice", () => {
  it("maps the configured monthly/annual prices to pro", () => {
    expect(planForPrice("price_monthly", env)).toBe("pro");
    expect(planForPrice("price_annual", env)).toBe("pro");
  });
  it("returns null for unknown or missing prices", () => {
    expect(planForPrice("price_other", env)).toBeNull();
    expect(planForPrice(undefined, env)).toBeNull();
  });
});

describe("entitlementFromSubscription", () => {
  it("grants pro for an active/trialing subscription with a known price", () => {
    expect(
      entitlementFromSubscription({
        status: "active",
        priceId: "price_annual",
        currentPeriodEnd: 1_900_000_000,
        env,
      }),
    ).toEqual({
      plan: "pro",
      source: "stripe",
      expiresAt: new Date(1_900_000_000 * 1000).toISOString(),
    });
    expect(entitlementFromSubscription({ status: "trialing", priceId: "price_monthly", env }).plan).toBe(
      "pro",
    );
  });

  it("collapses to free when canceled, unpaid, or an unknown price", () => {
    expect(
      entitlementFromSubscription({ status: "canceled", priceId: "price_annual", env }),
    ).toEqual({ plan: "free" });
    expect(
      entitlementFromSubscription({ status: "active", priceId: "price_unknown", env }),
    ).toEqual({ plan: "free" });
  });

  it("omits expiresAt when no period end is provided", () => {
    expect(
      entitlementFromSubscription({ status: "active", priceId: "price_monthly", env }).expiresAt,
    ).toBeUndefined();
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
    expect(effectivePlan({ plan: "pro", expiresAt: future, source: "stripe" }, now)).toBe("pro");
    expect(effectivePlan({ plan: "school", expiresAt: future, source: "school" }, now)).toBe(
      "school",
    );
  });

  it("collapses a paid plan whose expiry has passed to free", () => {
    expect(effectivePlan({ plan: "pro", expiresAt: past, source: "stripe" }, now)).toBe("free");
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
    expect(isPaidActive({ plan: "pro", expiresAt: past, source: "stripe" }, now)).toBe(false);
  });

  it("is true for an active or non-expiring paid entitlement", () => {
    expect(isPaidActive({ plan: "pro", expiresAt: future, source: "stripe" }, now)).toBe(true);
    expect(isPaidActive({ plan: "school", source: "school" }, now)).toBe(true);
  });
});
