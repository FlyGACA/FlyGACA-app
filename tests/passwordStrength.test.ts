import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '@/calc/app/passwordStrength';

describe('passwordStrength', () => {
  it('scores an empty password as 0', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: 'weak' });
  });

  it('treats a too-short password as the weakest bucket regardless of variety', () => {
    // Has upper/lower/digit/symbol but is below the Firebase minimum.
    expect(passwordStrength('Aa1!')).toEqual({ score: 1, label: 'weak' });
    expect('Aa1!'.length).toBeLessThan(MIN_PASSWORD_LENGTH);
  });

  it('scores a bare minimum-length password as weak', () => {
    expect(passwordStrength('abcdef')).toEqual({ score: 1, label: 'weak' });
  });

  it('rewards character-class variety at a moderate length', () => {
    // 8 chars (<10), mixed case + a digit, no symbol → 3 points → good.
    expect(passwordStrength('Abcdef12').label).toBe('good');
  });

  it('reaches strong once length and digits stack up', () => {
    // 10 chars, mixed case, digits → 4 points → strong.
    expect(passwordStrength('Abcdef1234').label).toBe('strong');
  });

  it('reaches strong with length, mixed case, digits and a symbol', () => {
    expect(passwordStrength('Abcdefgh1!23')).toEqual({ score: 4, label: 'strong' });
  });

  it('never exceeds the 4-segment ceiling', () => {
    expect(passwordStrength('Abcdefghijklmnop1!2@3#').score).toBe(4);
  });
});
