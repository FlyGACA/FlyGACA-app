/**
 * Referral client helpers: normalize a code, capture an inbound `?ref=` into
 * localStorage, carry it into a shareable pricing link, and fetch the signed-in
 * user's own code from the gateway. A regression here silently drops referral
 * attribution, so the transport is worth pinning. The server validates + grants;
 * this module only moves the token.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  configured: true,
  fns: {} as unknown,
  callableResult: { data: { code: 'FLY123' } } as unknown,
  callableThrows: false,
  lastCallableName: '' as string,
}));

vi.mock('@/lib/services/firebase', () => ({
  isFirebaseConfigured: () => h.configured,
  getFns: () => Promise.resolve(h.fns),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (_fns: unknown, name: string) => {
    h.lastCallableName = name;
    return () => {
      if (h.callableThrows) return Promise.reject(new Error('offline'));
      return Promise.resolve(h.callableResult);
    };
  },
}));

import {
  normalizeRef,
  captureRefFromUrl,
  getStoredRef,
  referralLink,
  fetchReferralCode,
} from '@/lib/services/referral';

const REF_KEY = 'flygaca:ref';
const origHref = window.location.href;

beforeEach(() => {
  localStorage.clear();
  h.configured = true;
  h.fns = {};
  h.callableResult = { data: { code: 'FLY123' } };
  h.callableThrows = false;
});

afterEach(() => {
  window.history.replaceState({}, '', origHref);
});

describe('normalizeRef', () => {
  it('upper-cases, strips non-alphanumerics and caps at 8 chars', () => {
    expect(normalizeRef('fly-123')).toBe('FLY123');
    expect(normalizeRef('a1b2c3d4e5f6')).toBe('A1B2C3D4');
    expect(normalizeRef('  hi!there  ')).toBe('HITHERE');
  });

  it('returns empty string for nullish or empty input', () => {
    expect(normalizeRef(null)).toBe('');
    expect(normalizeRef(undefined)).toBe('');
    expect(normalizeRef('')).toBe('');
  });
});

describe('captureRefFromUrl / getStoredRef', () => {
  it('captures and normalizes a ?ref= from the URL into localStorage', () => {
    window.history.replaceState({}, '', '/pricing?ref=fly-123');
    captureRefFromUrl();
    expect(localStorage.getItem(REF_KEY)).toBe('FLY123');
    expect(getStoredRef()).toBe('FLY123');
  });

  it('stores nothing when there is no ref param', () => {
    window.history.replaceState({}, '', '/pricing');
    captureRefFromUrl();
    expect(localStorage.getItem(REF_KEY)).toBeNull();
    expect(getStoredRef()).toBeUndefined();
  });
});

describe('referralLink', () => {
  it('builds a shareable pricing link carrying the code', () => {
    expect(referralLink('ABC123')).toBe(`${window.location.origin}/pricing?ref=ABC123`);
  });
});

describe('fetchReferralCode', () => {
  it('returns null when Firebase is not configured (no call attempted)', async () => {
    h.configured = false;
    expect(await fetchReferralCode()).toBeNull();
  });

  it('returns null when the functions client is unavailable', async () => {
    h.fns = null;
    expect(await fetchReferralCode()).toBeNull();
  });

  it('calls getReferralCode and returns the code on success', async () => {
    expect(await fetchReferralCode()).toBe('FLY123');
    expect(h.lastCallableName).toBe('getReferralCode');
  });

  it('returns null when the callable resolves without a code', async () => {
    h.callableResult = { data: {} };
    expect(await fetchReferralCode()).toBeNull();
  });

  it('swallows a callable error and returns null (card just hides)', async () => {
    h.callableThrows = true;
    expect(await fetchReferralCode()).toBeNull();
  });
});
