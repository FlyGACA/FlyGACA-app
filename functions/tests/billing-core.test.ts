import { describe, expect, it } from "vitest";
import {
  PASS_DAYS,
  effectivePlan,
  entitlementFromPass,
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
  it("maps the discounted student prices to pro", () => {
    const withStudent = { ...env, studentMonthly: "price_stu_m", studentAnnual: "price_stu_a" };
    expect(planForPrice("price_stu_m", withStudent)).toBe("pro");
    expect(planForPrice("price_stu_a", withStudent)).toBe("pro");
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

describe("entitlementFromPass", () => {
  const now = new Date("2026-07-12T10:00:00Z");
  const passExpiry = new Date(now.getTime() + PASS_DAYS * 24 * 60 * 60 * 1000).toISOString();

  it("grants PASS_DAYS of Pro from now for a new/free buyer", () => {
    expect(entitlementFromPass(now)).toEqual({
      plan: "pro",
      source: "stripe",
      expiresAt: passExpiry,
    });
    expect(entitlementFromPass(now, { plan: "free" })).toEqual({
      plan: "pro",
      source: "stripe",
      expiresAt: passExpiry,
    });
  });

  it("extends a paid plan that expires sooner than the pass window", () => {
    const soon = new Date("2026-07-20T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: soon, source: "stripe" }).expiresAt,
    ).toBe(passExpiry);
  });

  it("never shortens a later existing expiry", () => {
    const later = new Date("2027-01-01T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: later, source: "stripe" }).expiresAt,
    ).toBe(later);
  });

  it("preserves an active school tier", () => {
    const later = new Date("2027-01-01T00:00:00Z").toISOString();
    expect(entitlementFromPass(now, { plan: "school", expiresAt: later, source: "school" })).toEqual(
      { plan: "school", source: "stripe", expiresAt: later },
    );
  });

  it("treats a lapsed paid plan as free (fresh 90-day pass)", () => {
    const past = new Date("2026-01-01T00:00:00Z").toISOString();
    expect(
      entitlementFromPass(now, { plan: "pro", expiresAt: past, source: "stripe" }).expiresAt,
    ).toBe(passExpiry);
  });
});
