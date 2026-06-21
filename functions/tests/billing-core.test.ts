import { describe, expect, it } from "vitest";
import { entitlementFromSubscription, planForPrice } from "../src/billing-core.js";

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
