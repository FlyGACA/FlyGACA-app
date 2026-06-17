import { describe, expect, it } from 'vitest';
import { altimeter, flightLevel, qfeToQnh, qnhToQfe } from '../src/calc/altimetry';

describe('flightLevel', () => {
  it('rounds pressure altitude to the nearest 100 ft', () => {
    expect(flightLevel(35000)).toBe(350);
    expect(flightLevel(8250)).toBe(83);
  });
});

describe('QNH/QFE conversion', () => {
  it('QFE is lower than QNH by ~1 hPa per 27.3 ft of elevation', () => {
    expect(qnhToQfe(1013, 273)).toBeCloseTo(1003, 0);
  });
  it('round-trips QNH → QFE → QNH', () => {
    const qfe = qnhToQfe(1008, 500)!;
    expect(qfeToQnh(qfe, 500)).toBeCloseTo(1008, 6);
  });
});

describe('altimeter', () => {
  it('returns QFE and pressure altitude together', () => {
    const r = altimeter(1013.25, 2000);
    expect(r).not.toBeNull();
    expect(r!.pressureAltitude).toBeCloseTo(2000, 5);
    expect(r!.qfe).toBeLessThan(1013.25);
  });
});
