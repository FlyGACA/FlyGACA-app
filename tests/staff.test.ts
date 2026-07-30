/**
 * Client trigger for the `claimStaffAccess` gateway callable (src/lib/services/staff.ts).
 * The pre-check `looksLikeStaff` is NOT a security boundary — the callable re-verifies
 * email_verified + allowlist server-side — but it must stay in sync with
 * functions/src/staff-core.ts, so this pins the matching rules and the never-throws,
 * only-call-for-eligible-users contract. Uses the org-client.test.ts mock scaffolding.
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

import { claimStaffAccessIfEligible } from '@/lib/services/staff';

beforeEach(() => {
  h.configured = true;
  h.fns = {};
  h.callableResult = { data: { granted: true } };
  h.callableThrows = false;
  h.lastName = '';
  h.lastPayload = undefined;
});

describe('claimStaffAccessIfEligible — client pre-check gates the call', () => {
  it('no-ops (false) for a non-staff email without hitting the callable', async () => {
    await expect(claimStaffAccessIfEligible('student@gmail.com', true)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('no-ops (false) when the email is not verified', async () => {
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', false)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('no-ops (false) for a null email', async () => {
    await expect(claimStaffAccessIfEligible(null, true)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('matches the flygaca.com domain (case-insensitively) and calls claimStaffAccess', async () => {
    await expect(claimStaffAccessIfEligible('Pilot@FlyGACA.com', true)).resolves.toBe(true);
    expect(h.lastName).toBe('claimStaffAccess');
    expect(h.lastPayload).toEqual({});
  });

  it('matches an explicitly allowlisted address', async () => {
    await expect(claimStaffAccessIfEligible('ay2m@hotmail.com', true)).resolves.toBe(true);
    expect(h.lastName).toBe('claimStaffAccess');
  });

  it('does not match a lookalike domain (suffix only)', async () => {
    await expect(claimStaffAccessIfEligible('a@notflygaca.com', true)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });

  it('does not match a malformed address with no local part', async () => {
    await expect(claimStaffAccessIfEligible('@flygaca.com', true)).resolves.toBe(false);
    expect(h.lastName).toBe('');
  });
});

describe('claimStaffAccessIfEligible — server / transport outcomes', () => {
  it('no-ops (false) in the local-first build (Firebase not configured)', async () => {
    h.configured = false;
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('resolves false when getFns() yields no Functions instance', async () => {
    h.fns = null;
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('swallows a callable rejection and resolves false', async () => {
    h.callableThrows = true;
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('resolves false when the server declines to grant', async () => {
    h.callableResult = { data: { granted: false } };
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });

  it('resolves false when the response omits a granted flag', async () => {
    h.callableResult = { data: {} };
    await expect(claimStaffAccessIfEligible('pilot@flygaca.com', true)).resolves.toBe(false);
  });
});
