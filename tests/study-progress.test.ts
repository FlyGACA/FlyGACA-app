import { describe, expect, it } from 'vitest';
import { dayStr, nextStreak } from '../src/lib/studyProgress';

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
