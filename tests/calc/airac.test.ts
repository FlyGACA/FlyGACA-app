import { describe, expect, it } from 'vitest';
import { cycleProgress } from '@/calc/airac';

// AIRAC 2001 was effective 02 Jan 2020 (UTC) — the anchor every cycle counts from.
describe('cycleProgress', () => {
  it('is day 1 at 0% on a cycle boundary', () => {
    const p = cycleProgress(new Date('2020-01-02T00:00:00Z'));
    expect(p.dayInCycle).toBe(1);
    expect(p.fraction).toBe(0);
  });

  it('is halfway through on day 15', () => {
    const p = cycleProgress(new Date('2020-01-16T00:00:00Z')); // +14 days
    expect(p.dayInCycle).toBe(15);
    expect(p.fraction).toBeCloseTo(0.5, 5);
  });

  it('reaches day 28 just before the next cycle', () => {
    const p = cycleProgress(new Date('2020-01-29T12:00:00Z')); // +27.5 days
    expect(p.dayInCycle).toBe(28);
    expect(p.fraction).toBeCloseTo(27.5 / 28, 5);
  });
});
