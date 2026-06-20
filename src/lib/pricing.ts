/** Annual-billing savings, as a whole percentage off 12× the monthly price. */
export function annualSavingsPct(monthly: number, annual: number): number {
  if (monthly <= 0) return 0;
  return Math.round((1 - annual / (monthly * 12)) * 100);
}

/** The monthly-equivalent cost of an annual price, rounded. */
export function monthlyEquivalent(annual: number): number {
  return Math.round(annual / 12);
}
