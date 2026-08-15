export function hydroplaningSpeed(psi: number | undefined): number | null {
  if (psi == null || Number.isNaN(psi) || psi <= 0) return null;
  return 9 * Math.sqrt(psi);
}
