import { describe, expect, it } from 'vitest';
import { getSafeRedirectUrl } from '@/calc/app/redirectUrl';

/**
 * `?redirect=` is attacker-controllable — it rides in on a link the user clicks —
 * and is fed straight to `navigate()` / `location.replace()` after sign-in. Only
 * same-site relative paths may survive; everything else falls back.
 */
describe('getSafeRedirectUrl', () => {
  it('keeps a plain relative path', () => {
    expect(getSafeRedirectUrl('/logbook')).toBe('/logbook');
    expect(getSafeRedirectUrl('/study/packs?id=elp')).toBe('/study/packs?id=elp');
  });

  it('trims surrounding whitespace before deciding', () => {
    expect(getSafeRedirectUrl('  /currency  ')).toBe('/currency');
  });

  it('falls back for anything missing or empty', () => {
    expect(getSafeRedirectUrl(null)).toBe('/account');
    expect(getSafeRedirectUrl(undefined)).toBe('/account');
    expect(getSafeRedirectUrl('   ')).toBe('/account');
    expect(getSafeRedirectUrl('', '/somewhere')).toBe('/somewhere');
  });

  it('rejects absolute and protocol-relative targets (open redirect)', () => {
    for (const evil of [
      'https://evil.com',
      'http://evil.com/x',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      '/javascript:alert(1)',
      '/data:text/html,x',
      'logbook',
    ]) {
      expect(getSafeRedirectUrl(evil, '')).toBe('');
    }
  });
});
