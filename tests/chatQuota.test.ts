import { describe, expect, it } from 'vitest';
import {
  FREE_DAILY_LIMIT,
  consume,
  currentUsage,
  dayKey,
  isExhausted,
  remaining,
} from '@/calc/chatQuota';

const now = new Date('2026-06-20T09:00:00Z');

describe('currentUsage', () => {
  it('keeps today’s count', () => {
    expect(currentUsage({ day: dayKey(now), count: 2 }, now)).toEqual({
      day: '2026-06-20',
      count: 2,
    });
  });

  it('resets a record from a previous day', () => {
    expect(currentUsage({ day: '2026-06-19', count: 5 }, now)).toEqual({
      day: '2026-06-20',
      count: 0,
    });
  });

  it('resets across a UTC midnight boundary', () => {
    const beforeMidnight = new Date('2026-06-20T23:59:59Z');
    const afterMidnight = new Date('2026-06-21T00:00:01Z');
    const used = consume(currentUsage(null, beforeMidnight));
    expect(currentUsage(used, afterMidnight).count).toBe(0);
  });

  it('coerces malformed records to a fresh count', () => {
    expect(currentUsage(undefined, now).count).toBe(0);
    expect(currentUsage({ day: '2026-06-20', count: -3 }, now).count).toBe(0);
  });
});

describe('remaining / isExhausted / consume', () => {
  it('counts down from the free limit', () => {
    const u0 = currentUsage(null, now);
    expect(remaining(u0)).toBe(FREE_DAILY_LIMIT);
    expect(isExhausted(u0)).toBe(false);
  });

  it('is exhausted exactly at the limit', () => {
    let u = currentUsage(null, now);
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) u = consume(u);
    expect(remaining(u)).toBe(0);
    expect(isExhausted(u)).toBe(true);
  });

  it('never reports negative remaining past the limit', () => {
    let u = currentUsage(null, now);
    for (let i = 0; i < FREE_DAILY_LIMIT + 3; i++) u = consume(u);
    expect(remaining(u)).toBe(0);
  });
});
