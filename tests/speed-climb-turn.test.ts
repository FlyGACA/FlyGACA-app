import { describe, expect, it } from 'vitest';
import { machFromTas, speedOfSound, tasFromMach } from '../src/calc/speed';
import { climbFromFtPerNm, ftPerNmFromPercent } from '../src/calc/climb';
import { standardRateTurn } from '../src/calc/turn';

describe('speed of sound & Mach', () => {
  it('a ≈ 661 kt at ISA sea level (15°C)', () => {
    expect(speedOfSound(15)).toBeCloseTo(661.5, 0);
  });
  it('TAS → Mach and back are consistent', () => {
    const m = machFromTas(300, -45)!;
    expect(m.mach).toBeGreaterThan(0);
    expect(tasFromMach(m.mach, -45)!.tas).toBeCloseTo(300, 6);
  });
});

describe('climb gradient', () => {
  it('318 ft/NM ≈ 3.0° ≈ 5.2%', () => {
    const r = climbFromFtPerNm(318)!;
    expect(r.degrees).toBeCloseTo(3.0, 1);
    expect(r.percent).toBeCloseTo(5.23, 1);
  });
  it('fpm scales with groundspeed', () => {
    expect(climbFromFtPerNm(318, 120)!.fpm).toBeCloseTo(636, 0);
  });
  it('converts percent to ft/NM', () => {
    expect(ftPerNmFromPercent(5)).toBeCloseTo(303.8, 0);
  });
});

describe('standard-rate turn', () => {
  it('~18° bank and ~0.64 NM radius at 120 kt', () => {
    const r = standardRateTurn(120)!;
    expect(r.bankDeg).toBeCloseTo(18.2, 0);
    expect(r.radiusNm).toBeCloseTo(0.64, 1);
    expect(r.ruleOfThumbDeg).toBe(19);
  });
});
