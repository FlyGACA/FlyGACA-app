/**
 * Client trigger for the `claimFoundingAccess` gateway callable
 * (src/lib/services/founding.ts). Mirrors the mocking style of referral.test.ts —
 * firebase is mocked so no network/emulator is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  configured: true,
  fns: {} as unknown,
  callableResult: { data: { granted: true } } as unknown,
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

import { claimFoundingAccessIfEligible } from '@/lib/services/founding';

beforeEach(() => {
  h.configured = true;
  h.fns = {};
  h.callableResult = { data: { granted: true } };
  h.callableThrows = false;
  h.lastCallableName = '';
});

describe('claimFoundingAccessIfEligible', () => {
  it('no-ops for an unverified email (no call attempted)', async () => {
    expect(await claimFoundingAccessIfEligible(false)).toBe(false);
    expect(h.lastCallableName).toBe('');
  });

  it('returns false when Firebase is not configured (local-first build)', async () => {
    h.configured = false;
    expect(await claimFoundingAccessIfEligible(true)).toBe(false);
    expect(h.lastCallableName).toBe('');
  });

  it('returns false when the functions client is unavailable', async () => {
    h.fns = null;
    expect(await claimFoundingAccessIfEligible(true)).toBe(false);
  });

  it('calls claimFoundingAccess and returns true when a grant was written', async () => {
    expect(await claimFoundingAccessIfEligible(true)).toBe(true);
    expect(h.lastCallableName).toBe('claimFoundingAccess');
  });

  it('returns false when the callable resolves without granted:true (already entitled/ineligible)', async () => {
    h.callableResult = { data: { granted: false } };
    expect(await claimFoundingAccessIfEligible(true)).toBe(false);
  });

  it('returns false when the callable resolves with no data at all', async () => {
    h.callableResult = { data: undefined };
    expect(await claimFoundingAccessIfEligible(true)).toBe(false);
  });

  it('swallows a callable error (offline / not deployed yet) and returns false', async () => {
    h.callableThrows = true;
    expect(await claimFoundingAccessIfEligible(true)).toBe(false);
  });
});
