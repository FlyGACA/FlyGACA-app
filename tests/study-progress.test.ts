import { describe, expect, it } from 'vitest';
import {
  dayStr,
  nextStreak,
  pushHistory,
  toggleIndex,
  EXAM_HISTORY_MAX,
  type ExamResult,
} from '../src/lib/studyProgress';

describe('pushHistory', () => {
  const mk = (pct: number): ExamResult => ({ pct, passed: pct >= 75, date: '2026-06-21' });

  it('appends oldest-first', () => {
    expect(pushHistory([mk(80)], mk(60)).map((r) => r.pct)).toEqual([80, 60]);
  });

  it('caps at the max, dropping the oldest', () => {
    const full = Array.from({ length: EXAM_HISTORY_MAX }, (_, i) => mk(i));
    const next = pushHistory(full, mk(99));
    expect(next).toHaveLength(EXAM_HISTORY_MAX);
    expect(next[next.length - 1].pct).toBe(99);
    expect(next[0].pct).toBe(1); // the first (pct 0) was dropped
  });
});

describe('toggleIndex', () => {
  it('adds when absent (kept sorted) and removes when present', () => {
    expect(toggleIndex([2, 5], 3)).toEqual([2, 3, 5]);
    expect(toggleIndex([2, 3, 5], 3)).toEqual([2, 5]);
  });
});

describe('dayStr', () => {
  it('formats a date as ISO yyyy-mm-dd (UTC)', () => {
    expect(dayStr(new Date('2024-06-01T23:30:00Z'))).toBe('2024-06-01');
  });
});

describe('nextStreak', () => {
  const prev = { day: '2024-06-01', count: 3 };

  it('leaves the streak unchanged for a second event on the same day', () => {
    expect(nextStreak(prev, '2024-06-01', '2024-05-31')).toBe(prev);
  });

  it('increments when the previous day was yesterday', () => {
    expect(nextStreak(prev, '2024-06-02', '2024-06-01')).toEqual({ day: '2024-06-02', count: 4 });
  });

  it('resets to 1 after a gap', () => {
    expect(nextStreak(prev, '2024-06-05', '2024-06-04')).toEqual({ day: '2024-06-05', count: 1 });
  });

  it('starts at 1 from an empty streak', () => {
    expect(nextStreak({ day: '', count: 0 }, '2024-06-01', '2024-05-31')).toEqual({
      day: '2024-06-01',
      count: 1,
    });
  });
});
