import { describe, expect, it } from 'vitest';
import {
  airspaceStatus,
  densityPct,
  inCircle,
  pointInPolygon,
  sectorOccupancy,
  sectorReport,
} from '@/calc/hud/sectors';
import { DEFAULT_SEED, buildScenario } from '@/calc/hud/scenario';
import { stateAll } from '@/calc/hud/kinematics';
import type { FlightState, Sector } from '@/calc/hud/types';

// A rough box around the Jeddah final-director area, as [lat, lon] pairs.
const RING: [number, number][] = [
  [22.3, 38.9],
  [22.4, 39.16],
  [21.78, 39.4],
  [21.68, 39.15],
  [22.3, 38.9],
];

describe('pointInPolygon', () => {
  it('accepts an interior point and rejects an exterior one', () => {
    expect(pointInPolygon({ lat: 22.0, lon: 39.15 }, RING)).toBe(true);
    expect(pointInPolygon({ lat: 24.9, lon: 46.7 }, RING)).toBe(false);
  });
  it('rejects degenerate rings and garbage points', () => {
    expect(pointInPolygon({ lat: 22, lon: 39 }, RING.slice(0, 2))).toBe(false);
    expect(pointInPolygon({ lat: NaN, lon: 39 }, RING)).toBe(false);
  });
});

describe('inCircle', () => {
  const center = { lat: 24.9576, lon: 46.6988 };
  it('contains the centre and near points, excludes far ones', () => {
    expect(inCircle(center, center, 8)).toBe(true);
    expect(inCircle({ lat: 25.05, lon: 46.7 }, center, 8)).toBe(true); // ~5.5 NM
    expect(inCircle({ lat: 26.5, lon: 46.7 }, center, 8)).toBe(false);
  });
});

const mkState = (lat: number, lon: number): FlightState => ({
  id: 'x',
  callsign: 'FALCON-01',
  kind: 'jet',
  typeDesignator: 'A20N',
  squawk: '4211',
  phase: 'cruise',
  lat,
  lon,
  trackDeg: 90,
  altFt: 36_000,
  gsKt: 450,
  vsFpm: 0,
  pitchDeg: 1,
  bankDeg: 0,
  fromCode: 'OERK',
  toCode: 'OEJN',
  progress: 0.5,
});

const sectors: Sector[] = [
  { id: 'a', center: { lat: 25, lon: 47 }, radiusNm: 60, capacity: 2, flBandLo: 280, flBandHi: 410 },
  { id: 'b', center: { lat: 21, lon: 39 }, radiusNm: 60, capacity: 4, flBandLo: 280, flBandHi: 410 },
];

describe('occupancy, density and status', () => {
  it('counts flights per sector circle', () => {
    const states = [mkState(25.1, 47.1), mkState(25.2, 46.9), mkState(21.1, 39.1)];
    const occ = sectorOccupancy(states, sectors);
    expect(occ.a).toBe(2);
    expect(occ.b).toBe(1);
  });
  it('density is the peak load, clamped to 0–100', () => {
    expect(densityPct({ a: 1, b: 1 }, sectors)).toBe(50);
    expect(densityPct({ a: 4, b: 0 }, sectors)).toBe(100);
    expect(densityPct({}, sectors)).toBe(0);
  });
  it('status flips to busy only above capacity', () => {
    expect(airspaceStatus({ a: 2, b: 4 }, sectors)).toBe('safe');
    expect(airspaceStatus({ a: 3, b: 0 }, sectors)).toBe('busy');
  });
  it('sectorReport agrees with its parts on the real scenario', () => {
    const scenario = buildScenario(DEFAULT_SEED);
    const states = stateAll(scenario, 3_600_000);
    const report = sectorReport(scenario, states);
    expect(report.densityPct).toBeGreaterThanOrEqual(0);
    expect(report.densityPct).toBeLessThanOrEqual(100);
    expect(['safe', 'busy']).toContain(report.status);
    expect(Object.keys(report.occupancy).sort()).toEqual(
      scenario.sectors.map((s) => s.id).sort(),
    );
  });
});
