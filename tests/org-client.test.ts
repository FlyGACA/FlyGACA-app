/**
 * B2B org-admin client (`src/lib/org.ts`): a thin typed wrapper over the
 * `getMyOrgs` / `getCohortReadiness` / `provisionSeats` callables. Its
 * load-bearing contract is that it NEVER throws — when Firebase isn't
 * configured, isn't deployed, or the caller isn't authorised, each call
 * resolves to a safe empty result so `/business/admin` renders a "no access"
 * state instead of crashing. This pins that contract and the request shaping.
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

vi.mock('../src/lib/firebase', () => ({
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

import { getMyOrgs, getCohortReadiness, provisionSeats } from '../src/lib/org';

beforeEach(() => {
  h.configured = true;
  h.fns = {};
  h.callableResult = { data: {} };
  h.callableThrows = false;
  h.lastName = '';
  h.lastPayload = undefined;
});

describe('when Firebase is not configured (local-first build)', () => {
  beforeEach(() => {
    h.configured = false;
  });

  it('getMyOrgs resolves to an empty list', async () => {
    await expect(getMyOrgs()).resolves.toEqual([]);
  });

  it('getCohortReadiness resolves to null', async () => {
    await expect(getCohortReadiness('acme')).resolves.toBeNull();
  });

  it('provisionSeats resolves to null', async () => {
    await expect(provisionSeats('acme', ['a@b.com'])).resolves.toBeNull();
  });
});

describe('when a call fails (offline / not authorised)', () => {
  beforeEach(() => {
    h.callableThrows = true;
  });

  it('getMyOrgs swallows the error and returns []', async () => {
    await expect(getMyOrgs()).resolves.toEqual([]);
  });

  it('getCohortReadiness swallows the error and returns null', async () => {
    await expect(getCohortReadiness('acme')).resolves.toBeNull();
  });
});

describe('request shaping and response passthrough', () => {
  it('getMyOrgs unwraps the { orgs } envelope', async () => {
    const orgs = [{ id: 'acme', name: 'Acme', seatLimit: 10, seatsUsed: 3 }];
    h.callableResult = { data: { orgs } };
    await expect(getMyOrgs()).resolves.toEqual(orgs);
    expect(h.lastName).toBe('getMyOrgs');
    expect(h.lastPayload).toEqual({});
  });

  it('getMyOrgs returns [] when the envelope has no orgs', async () => {
    h.callableResult = { data: {} };
    await expect(getMyOrgs()).resolves.toEqual([]);
  });

  it('getCohortReadiness passes the orgId through and returns the readiness payload', async () => {
    const readiness = {
      orgId: 'acme',
      name: 'Acme',
      threshold: 75,
      banks: ['aip-ais'],
      counts: { total: 1, active: 1, ready: 0 },
      rows: [],
    };
    h.callableResult = { data: readiness };
    await expect(getCohortReadiness('acme')).resolves.toEqual(readiness);
    expect(h.lastName).toBe('getCohortReadiness');
    expect(h.lastPayload).toEqual({ orgId: 'acme' });
  });

  it('provisionSeats forwards orgId, emails, and expiresAt', async () => {
    h.callableResult = { data: { results: [{ email: 'a@b.com', success: true }] } };
    const res = await provisionSeats('acme', ['a@b.com'], '2027-01-01');
    expect(res).toEqual({ results: [{ email: 'a@b.com', success: true }] });
    expect(h.lastName).toBe('provisionSeats');
    expect(h.lastPayload).toEqual({ orgId: 'acme', emails: ['a@b.com'], expiresAt: '2027-01-01' });
  });
});
