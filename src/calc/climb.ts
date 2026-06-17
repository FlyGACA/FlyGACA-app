/**
 * Climb-gradient conversions: ft per NM ↔ percent ↔ degrees, and the required
 * feet-per-minute at a given groundspeed. Useful for SID/missed-approach
 * minimum gradients. Pure planning aid.
 */
const FT_PER_NM = 6076.12;

export interface ClimbResult {
  ftPerNm: number;
  percent: number;
  degrees: number;
  /** Required rate at the given groundspeed, ft/min (null if GS not given). */
  fpm: number | null;
}

/** From a gradient in ft/NM (and optional groundspeed) derive the others. */
export function climbFromFtPerNm(ftPerNm: number, groundSpeedKt?: number): ClimbResult | null {
  if (!Number.isFinite(ftPerNm)) return null;
  const percent = (ftPerNm / FT_PER_NM) * 100;
  const degrees = (Math.atan(ftPerNm / FT_PER_NM) * 180) / Math.PI;
  const fpm =
    groundSpeedKt != null && Number.isFinite(groundSpeedKt) ? (ftPerNm * groundSpeedKt) / 60 : null;
  return { ftPerNm, percent, degrees, fpm };
}

/** Convert a percentage gradient to ft/NM (then use climbFromFtPerNm). */
export function ftPerNmFromPercent(percent: number): number | null {
  return Number.isFinite(percent) ? (percent / 100) * FT_PER_NM : null;
}
