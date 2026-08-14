import type { Airport } from '@/lib/content';

export type FuelType = 'JET A-1' | 'AVGAS 100LL';
export type LightingType = 'PAPI' | 'VASI';
export type AerodromeType = 'International' | 'Domestic' | 'Military';

export interface AerodromeFacilities {
  fuel: FuelType[];
  lighting: LightingType[];
}

export const SAUDI_FACILITIES: Record<string, AerodromeFacilities> = {
  OERK: { fuel: ['JET A-1'], lighting: ['PAPI'] },
  OEJN: { fuel: ['JET A-1'], lighting: ['PAPI'] },
  OEDF: { fuel: ['JET A-1'], lighting: ['PAPI'] },
  OETH: { fuel: ['AVGAS 100LL'], lighting: ['PAPI'] },
  OEMA: { fuel: ['JET A-1'], lighting: ['PAPI'] },
  OEAH: { fuel: ['JET A-1'], lighting: ['PAPI'] },
  OABT: { fuel: ['JET A-1'], lighting: ['PAPI'] },
};

export function getAirportType(a: Airport): AerodromeType | undefined {
  const typeService = a.services?.find(s => s.l === 'Aerodrome type')?.v;
  if (typeService?.includes('International')) return 'International';
  if (typeService?.includes('Domestic')) return 'Domestic';
  if (typeService?.includes('Military')) return 'Military';
  return undefined;
}

export function getFacilities(icao: string): AerodromeFacilities | undefined {
  return SAUDI_FACILITIES[icao];
}
