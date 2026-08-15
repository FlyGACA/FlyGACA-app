export interface AircraftPreset {
  name: string;
  psi: number;
}

export const AIRCRAFT_PRESETS: AircraftPreset[] = [
  { name: 'Cessna 172S', psi: 29 },
  { name: 'Diamond DA40', psi: 36 },
  { name: 'Piper Archer PA28', psi: 24 },
  { name: 'Cirrus SR22', psi: 35 },
  { name: 'Commercial Jet / B737', psi: 200 },
];

/**
 * Dynamic hydroplaning speed from tyre pressure (NASA/Horne relation).
 * Vp ≈ 9·√P (kt, P in psi).
 */
export function dynamicHydroplaningSpeed(tyrePsi: number): number | null {
  if (!Number.isFinite(tyrePsi) || tyrePsi <= 0) return null;
  return 9 * Math.sqrt(tyrePsi);
}

/**
 * Viscous hydroplaning speed from tyre pressure.
 * Vp ≈ 7.7·√P (kt).
 */
export function viscousHydroplaningSpeed(tyrePsi: number): number | null {
  if (!Number.isFinite(tyrePsi) || tyrePsi <= 0) return null;
  return 7.7 * Math.sqrt(tyrePsi);
}
