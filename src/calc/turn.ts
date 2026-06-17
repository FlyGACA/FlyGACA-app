/**
 * Standard-rate (rate-one, 3°/s) turn geometry from true airspeed: the bank
 * angle and turn radius, plus the familiar rule-of-thumb bank (TAS/10 + 7).
 * Pure planning aid.
 */
const KT_TO_FTS = 1.68781;
const G = 32.174; // ft/s²
const RATE_ONE = (3 * Math.PI) / 180; // rad/s

export interface TurnResult {
  /** Bank angle for a rate-one turn, degrees. */
  bankDeg: number;
  /** Turn radius, nautical miles. */
  radiusNm: number;
  /** Rule-of-thumb bank: TAS/10 + 7, degrees. */
  ruleOfThumbDeg: number;
}

export function standardRateTurn(tasKt: number): TurnResult | null {
  if (!Number.isFinite(tasKt) || tasKt <= 0) return null;
  const v = tasKt * KT_TO_FTS; // ft/s
  const bankDeg = (Math.atan((v * RATE_ONE) / G) * 180) / Math.PI;
  const radiusFt = v / RATE_ONE;
  return {
    bankDeg,
    radiusNm: radiusFt / 6076.12,
    ruleOfThumbDeg: tasKt / 10 + 7,
  };
}
