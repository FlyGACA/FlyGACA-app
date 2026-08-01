import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEED,
  DRONE_CORRIDOR,
  HUBS,
  SIM_EPOCH_MS,
  SIM_RATE,
  buildScenario,
  simTimeAt,
} from '@/calc/hud/scenario';

const hubCodes = new Set(HUBS.map((h) => h.code));
const corridorCodes = new Set([DRONE_CORRIDOR.a.code, DRONE_CORRIDOR.b.code]);
const padCodes = /^PAD-/;

describe('simTimeAt', () => {
  it('is linear in the wall clock with the configured compression', () => {
    expect(simTimeAt(SIM_EPOCH_MS)).toBe(0);
    expect(simTimeAt(SIM_EPOCH_MS + 1000)).toBe(1000 * SIM_RATE);
    expect(simTimeAt(SIM_EPOCH_MS + 60_000) - simTimeAt(SIM_EPOCH_MS)).toBe(60_000 * SIM_RATE);
  });
});

describe('buildScenario', () => {
  const scenario = buildScenario(DEFAULT_SEED);

  it('is deterministic for a seed', () => {
    expect(buildScenario(DEFAULT_SEED)).toEqual(scenario);
  });
  it('differs for another seed', () => {
    expect(buildScenario(DEFAULT_SEED + 1)).not.toEqual(scenario);
  });
  it('dispatches the planned fleet mix', () => {
    const byKind = (k: string) => scenario.flights.filter((f) => f.kind === k).length;
    expect(byKind('jet')).toBe(14);
    expect(byKind('ga')).toBe(4);
    expect(byKind('heli')).toBe(3);
    expect(byKind('drone')).toBe(4);
  });
  it('routes every flight between known waypoints', () => {
    for (const f of scenario.flights) {
      for (const end of [f.from, f.to]) {
        const known =
          hubCodes.has(end.code) || corridorCodes.has(end.code) || padCodes.test(end.code);
        expect(known, `${f.id} endpoint ${end.code}`).toBe(true);
      }
      expect(f.from.code).not.toBe(f.to.code);
    }
  });
  it('keeps cycles and offsets sane', () => {
    for (const f of scenario.flights) {
      expect(f.legMs).toBeGreaterThan(0);
      expect(f.cycleMs).toBeGreaterThan(f.legMs);
      expect(f.offsetMs).toBeGreaterThanOrEqual(0);
      expect(f.offsetMs).toBeLessThan(f.cycleMs);
      expect(f.cruiseGsKt).toBeGreaterThan(f.approachGsKt);
    }
  });
  it('keeps GA/heli cruise above the higher field elevation', () => {
    for (const f of scenario.flights) {
      if (f.kind === 'ga' || f.kind === 'heli') {
        expect(f.cruiseAltFt).toBeGreaterThan(Math.max(f.from.elevFt, f.to.elevFt));
      }
    }
  });
  it('pins drones to the corridor at 400 ft', () => {
    for (const f of scenario.flights.filter((x) => x.kind === 'drone')) {
      expect(corridorCodes.has(f.from.code)).toBe(true);
      expect(corridorCodes.has(f.to.code)).toBe(true);
      expect(f.cruiseAltFt).toBe(400);
    }
  });
  it('defines well-formed sectors', () => {
    expect(scenario.sectors.length).toBe(3);
    for (const s of scenario.sectors) {
      expect(s.radiusNm).toBeGreaterThan(0);
      expect(s.capacity).toBeGreaterThan(0);
      expect(s.flBandHi).toBeGreaterThan(s.flBandLo);
    }
  });
});
