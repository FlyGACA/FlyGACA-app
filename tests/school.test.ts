/**
 * Client trigger for the `claimSchoolSeat` gateway callable (src/lib/services/school.ts).
 * Unlike staff there is no cheap client filter for the invite path — the caller gates on
 * a free plan — so this service just needs a verified email + a configured, reachable
 * callable. Pins the never-throws, resolves-`granted` contract. Mock scaffolding mirrors
 * tests/org-client.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  configured: true,
  fns: {} as unknown,
  callableResult: { data: {} } as unknown,
  callableThrows: false,
  lastName: '' as string,
  lastPayload: undefined as unknown,
}));

vi.mock('@/lib/services/firebase', () => ({
  isFirebaseConfigured: () => h.configured,
  getFns: () => Promise.resolve(h.fns),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (_fns: unknown, name: string) => {
    h.lastName = name;
    return (payload: unknown) => {
      h.lastPayload = payload;
      if (h.callableThrows) return Promise.reject(new Error('not-authorised'));
      return Promise.resolve(h.callableResult);
    };
  },
}));

import { claimSchoolSeatIfEligible } from '@/lib/services/school';

beforeEach(() => {
  h.configured = true;
  h.fns = {};
  h.callableResult = { data: { granted: true } };
  h.callableThrows = false;
  h.lastName = '';
  h.lastPayload = undefined;
});

describe('claimSchoolSeatIfEligible — eligibility gating', () => {
  it('no-ops (false) when the email is not verified', async () => {
    await expect(claimSchoolSeatIfEligible('student@school.edu', false)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('no-ops (false) for a null email', async () => {
    await expect(claimSchoolSeatIfEligible(null, true)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('no-ops (false) in the local-first build (Firebase not configured)', async () => {
    h.configured = false;
    await expect(claimSchoolSeatIfEligible('student@school.edu', true)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('calls claimSchoolSeat with an empty payload for a verified email', async () => {
    await expect(claimSchoolSeatIfEligible('student@school.edu', true)).resolves.toBe(true);
    expect(h.lastName).toBe('claimSchoolSeat');
    expect(h.lastPayload).toEqual({});
  });
});

describe('claimSchoolSeatIfEligible — server / transport outcomes', () => {
  it('resolves false when getFns() yields no Functions instance', async () => {
    h.fns = null;
    await expect(claimSchoolSeatIfEligible('student@school.edu', true)).resolves.toBe(false);
  });

  it('swallows a callable rejection and resolves false', async () => {
    h.callableThrows = true;
    await expect(claimSchoolSeatIfEligible('student@school.edu', true)).resolves.toBe(false);
  });

  it('resolves false when the server declines to grant', async () => {
    h.callableResult = { data: { granted: false } };
    await expect(claimSchoolSeatIfEligible('student@school.edu', true)).resolves.toBe(false);
  });

  it('resolves false when the response omits a granted flag', async () => {
    h.callableResult = { data: {} };
    await expect(claimSchoolSeatIfEligible('student@school.edu', true)).resolves.toBe(false);
  });
});
