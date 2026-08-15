import { describe, expect, it } from 'vitest';
import { getSafeRedirectUrl } from '@/calc/app/redirectUrl';

describe('getSafeRedirectUrl', () => {
  it('returns fallback for null, undefined, or empty string', () => {
    expect(getSafeRedirectUrl(null)).toBe('/account');
    expect(getSafeRedirectUrl(undefined)).toBe('/account');
    expect(getSafeRedirectUrl('')).toBe('/account');
    expect(getSafeRedirectUrl('   ')).toBe('/account');
  });

  it('accepts valid relative paths', () => {
    expect(getSafeRedirectUrl('/captain-adel')).toBe('/captain-adel');
    expect(getSafeRedirectUrl('/checkout?plan=annual')).toBe('/checkout?plan=annual');
    expect(getSafeRedirectUrl('/learn#flashcards')).toBe('/learn#flashcards');
  });

  it('custom fallback', () => {
    expect(getSafeRedirectUrl(null, '/home')).toBe('/home');
    expect(getSafeRedirectUrl('invalid', '/home')).toBe('/home');
  });

  it('rejects protocol-relative URLs and open redirect attempts', () => {
    expect(getSafeRedirectUrl('//evil.com')).toBe('/account');
    expect(getSafeRedirectUrl('/\\evil.com')).toBe('/account');
    expect(getSafeRedirectUrl('https://evil.com')).toBe('/account');
    expect(getSafeRedirectUrl('http://evil.com/path')).toBe('/account');
  });

  it('rejects scheme specs prefixed with slash', () => {
    expect(getSafeRedirectUrl('/javascript:alert(1)')).toBe('/account');
    expect(getSafeRedirectUrl('/data:text/html,abc')).toBe('/account');
  });
});
