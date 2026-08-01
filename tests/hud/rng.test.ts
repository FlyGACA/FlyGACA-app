import { describe, expect, it } from 'vitest';
import { hash32, intIn, mulberry32, pick } from '@/calc/hud/rng';

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });
  it('yields floats in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('intIn', () => {
  it('stays inside the inclusive bounds', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 500; i += 1) {
      const v = intIn(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
  it('handles a single-value range', () => {
    expect(intIn(mulberry32(1), 5, 5)).toBe(5);
  });
});

describe('pick', () => {
  it('always returns a member of the list', () => {
    const rng = mulberry32(3);
    const list = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i += 1) expect(list).toContain(pick(rng, list));
  });
});

describe('hash32', () => {
  it('is stable and distinguishes strings', () => {
    expect(hash32('OERK')).toBe(hash32('OERK'));
    expect(hash32('OERK')).not.toBe(hash32('OEJN'));
  });
});
