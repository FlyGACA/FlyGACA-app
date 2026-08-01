import { describe, expect, it } from 'vitest';
import { greatCircle } from '@/calc/navigation';
import {
  activeCount,
  flightStateAt,
  stateAll,
  trailFor,
  trendPct,
} from '@/calc/hud/kinematics';
import { DEFAULT_SEED, buildScenario } from '@/calc/hud/scenario';
import type { FlightSpec, Phase } from '@/calc/hud/types';

const scenario = buildScenario(DEFAULT_SEED);
const jet = scenario.flights.find((f) => f.kind === 'jet') as FlightSpec;

/** Sim instant at which `spec` is `f` of the way through an OUTBOUND leg. */
const atLegFraction = (spec: FlightSpec, f: number, leg = 0): number =>
  leg * spec.cycleMs + f * spec.legMs - spec.offsetMs;

describe('flightStateAt', () => {
  it('rejects garbage time', () => {
    expect(flightStateAt(jet, NaN)).toBeNull();
  });
  it('is on the ground during the turnaround', () => {
    const t = atLegFraction(jet, 0) + jet.legMs + 1000; // just after landing
    expect(flightStateAt(jet, t)).toBeNull();
  });
  it('starts at the origin and ends at the destination', () => {
    const start = flightStateAt(jet, atLegFraction(jet, 0.0001));
    const end = flightStateAt(jet, atLegFraction(jet, 0.9999));
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    const dStart = greatCircle(start!.lat, start!.lon, jet.from.lat, jet.from.lon)!;
    const dEnd = greatCircle(end!.lat, end!.lon, jet.to.lat, jet.to.lon)!;
    expect(dStart.distanceNm).toBeLessThan(2);
    expect(dEnd.distanceNm).toBeLessThan(2);
    expect(start!.fromCode).toBe(jet.from.code);
    expect(end!.toCode).toBe(jet.to.code);
  });
  it('reverses direction on the next leg', () => {
    const back = flightStateAt(jet, atLegFraction(jet, 0.5, 1));
    expect(back).not.toBeNull();
    expect(back!.fromCode).toBe(jet.to.code);
    expect(back!.toCode).toBe(jet.from.code);
  });
  it('moves monotonically along the route', () => {
    let last = -1;
    for (let f = 0.05; f <= 0.95; f += 0.05) {
      const s = flightStateAt(jet, atLegFraction(jet, f))!;
      expect(s.progress).toBeGreaterThan(last);
      last = s.progress;
    }
  });
  it('walks the phases in order and respects the envelopes', () => {
    const seen: Phase[] = [];
    for (let f = 0.01; f < 1; f += 0.02) {
      const s = flightStateAt(jet, atLegFraction(jet, f))!;
      if (seen[seen.length - 1] !== s.phase) seen.push(s.phase);
      expect(s.gsKt).toBeGreaterThanOrEqual(jet.approachGsKt - 1);
      expect(s.gsKt).toBeLessThanOrEqual(jet.cruiseGsKt + 1);
      expect(s.altFt).toBeLessThanOrEqual(jet.cruiseAltFt + 1);
      expect(Math.abs(s.pitchDeg)).toBeLessThanOrEqual(12);
      expect(Math.abs(s.bankDeg)).toBeLessThanOrEqual(25);
    }
    expect(seen).toEqual(['climb', 'cruise', 'descent', 'approach']);
  });
  it('holds cruise altitude and speed mid-leg', () => {
    const s = flightStateAt(jet, atLegFraction(jet, 0.5))!;
    expect(s.altFt).toBe(jet.cruiseAltFt);
    expect(s.gsKt).toBe(jet.cruiseGsKt);
    expect(s.vsFpm).toBe(0);
    expect(s.phase).toBe('cruise');
  });
  it('climbs early and descends late', () => {
    expect(flightStateAt(jet, atLegFraction(jet, 0.08))!.vsFpm).toBeGreaterThan(0);
    expect(flightStateAt(jet, atLegFraction(jet, 0.85))!.vsFpm).toBeLessThan(0);
  });
});

describe('trailFor', () => {
  it('replays the same closed-form states at earlier instants', () => {
    const now = atLegFraction(jet, 0.6);
    const trail = trailFor(jet, now, 5, 30_000);
    expect(trail.length).toBeGreaterThan(0);
    trail.forEach((p, i) => {
      const direct = flightStateAt(jet, now - (i + 1) * 30_000)!;
      expect(p.lat).toBeCloseTo(direct.lat, 10);
      expect(p.lon).toBeCloseTo(direct.lon, 10);
    });
  });
  it('never crosses back through the turnaround', () => {
    const justAirborne = atLegFraction(jet, 0.005, 2);
    const trail = trailFor(jet, justAirborne, 10, 60_000);
    for (const p of trail) expect(p.fromCode).toBe(jet.from.code);
  });
});

describe('fleet aggregates', () => {
  it('counts only airborne flights', () => {
    const t = atLegFraction(jet, 0.5);
    expect(activeCount(scenario, t)).toBe(stateAll(scenario, t).length);
    expect(activeCount(scenario, t)).toBeGreaterThan(0);
    expect(activeCount(scenario, t)).toBeLessThanOrEqual(scenario.flights.length);
  });
  it('trend is a bounded percentage', () => {
    const t = atLegFraction(jet, 0.5);
    const trend = trendPct(scenario, t);
    expect(Number.isFinite(trend)).toBe(true);
    expect(Math.abs(trend)).toBeLessThanOrEqual(100 * scenario.flights.length);
  });
});
