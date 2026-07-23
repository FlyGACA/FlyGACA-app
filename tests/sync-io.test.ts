/**
 * The Firestore I/O helpers in sync.ts (loadAccount + the write-throughs). The
 * pure mappers are covered in sync.test.ts; here we mock getDb() and the
 * dynamically-imported `firebase/firestore` module to exercise the read/merge/
 * write paths that decide what the client persists — including the load-bearing
 * invariant that a profile write NEVER carries the server-only `entitlement`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Profile, Flight, PilotRecord } from '@/lib/account';

const h = vi.hoisted(() => ({
  db: null as unknown,
  userData: undefined as Record<string, unknown> | undefined,
  logbookDocs: [] as { id: string; data: () => Record<string, unknown> }[],
  recordDocs: [] as { id: string; data: () => Record<string, unknown> }[],
  creditData: undefined as Record<string, unknown> | undefined,
  calls: [] as { fn: string; path: string; data?: unknown; opts?: unknown }[],
}));

vi.mock('@/lib/firebase', () => ({
  getDb: () => Promise.resolve(h.db),
}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ kind: 'doc', path: segs.join('/') }),
  collection: (_db: unknown, ...segs: string[]) => ({ kind: 'collection', path: segs.join('/') }),
  getDoc: (ref: { path: string }) =>
    Promise.resolve({
      data: () => (ref.path.startsWith('chatCredits/') ? h.creditData : h.userData),
    }),
  getDocs: (ref: { path: string }) =>
    Promise.resolve({ docs: ref.path.endsWith('/logbook') ? h.logbookDocs : h.recordDocs }),
  setDoc: (ref: { path: string }, data: unknown, opts?: unknown) => {
    h.calls.push({ fn: 'setDoc', path: ref.path, data, opts });
    return Promise.resolve();
  },
  deleteDoc: (ref: { path: string }) => {
    h.calls.push({ fn: 'deleteDoc', path: ref.path });
    return Promise.resolve();
  },
}));

import {
  loadAccount,
  saveProfileDoc,
  addFlightDoc,
  updateFlightDoc,
  deleteFlightDoc,
  addRecordDoc,
  deleteRecordDoc,
} from '@/lib/sync';

const profile: Profile = {
  email: 'pilot@example.com',
  displayName: 'Sara',
  homeBase: 'OERK',
  licenceType: 'PPL',
  medicalExpiry: '2027-01-01',
  lastFlightReview: '2026-01-01',
  role: 'pilot',
};

const flight: Flight = {
  id: 'f1',
  date: '2026-06-01',
  type: 'C172',
  reg: 'HZ-ABC',
  from: 'OERK',
  to: 'OEDF',
  total: '1.5',
  pic: '1.5',
  night: '0',
  ifr: '0',
  ldg: '1',
  nightLdg: '0',
  appr: '0',
  remarks: 'nav',
};

const record: PilotRecord = {
  id: 'r1',
  category: 'rating',
  title: 'Instrument Rating',
  ref: 'IR-2024',
  issued: '2024-01-01',
  expires: '2026-01-01',
  remarks: '',
};

beforeEach(() => {
  h.db = {};
  h.userData = undefined;
  h.logbookDocs = [];
  h.recordDocs = [];
  h.creditData = undefined;
  h.calls = [];
});

describe('loadAccount', () => {
  it('returns null when Firebase is not configured', async () => {
    h.db = null;
    expect(await loadAccount('u1')).toBeNull();
  });

  it('hydrates profile, logbook, records, entitlement and credits', async () => {
    h.userData = {
      email: 'cap@example.com',
      displayName: 'Cap',
      entitlement: { plan: 'pro', expiresAt: '2027-01-01', source: 'stripe' },
    };
    h.logbookDocs = [{ id: 'f1', data: () => ({ date: '2026-06-01', type: 'C172', ldg: '1' }) }];
    h.recordDocs = [{ id: 'r1', data: () => ({ category: 'rating', title: 'IR' }) }];
    h.creditData = { balance: 12.9 };

    const acct = await loadAccount('u1');
    expect(acct).not.toBeNull();
    expect(acct?.profile.email).toBe('cap@example.com');
    expect(acct?.flights).toHaveLength(1);
    expect(acct?.flights[0]).toMatchObject({ id: 'f1', type: 'C172', ldg: '1' });
    expect(acct?.records).toHaveLength(1);
    expect(acct?.records?.[0]).toMatchObject({ id: 'r1', title: 'IR' });
    expect(acct?.entitlement).toEqual({ plan: 'pro', expiresAt: '2027-01-01', source: 'stripe' });
    // 12.9 floors to 12 whole credits.
    expect(acct?.chatCredits).toBe(12);
  });

  it('clamps a missing, negative or non-numeric credit balance to 0', async () => {
    h.creditData = undefined;
    expect((await loadAccount('u1'))?.chatCredits).toBe(0);
    h.creditData = { balance: -5 };
    expect((await loadAccount('u1'))?.chatCredits).toBe(0);
    h.creditData = { balance: 'lots' };
    expect((await loadAccount('u1'))?.chatCredits).toBe(0);
  });

  it('reads no entitlement as null without throwing', async () => {
    h.userData = { email: 'cap@example.com' };
    expect((await loadAccount('u1'))?.entitlement).toBeNull();
  });
});

describe('write-throughs', () => {
  it('no-op (resolve, no writes) when Firebase is not configured', async () => {
    h.db = null;
    await expect(saveProfileDoc('u1', profile)).resolves.toBeUndefined();
    await expect(addFlightDoc('u1', flight)).resolves.toBeUndefined();
    await expect(deleteFlightDoc('u1', 'f1')).resolves.toBeUndefined();
    expect(h.calls).toHaveLength(0);
  });

  it('saveProfileDoc merges into users/{uid} and never writes entitlement', async () => {
    // Even if the local profile were somehow tainted, the serializer must drop it.
    await saveProfileDoc('u1', { ...profile, entitlement: { plan: 'pro' } } as unknown as Profile);
    expect(h.calls).toHaveLength(1);
    const [call] = h.calls;
    expect(call).toMatchObject({ fn: 'setDoc', path: 'users/u1', opts: { merge: true } });
    expect(call.data).not.toHaveProperty('entitlement');
    expect(call.data).toMatchObject({ email: 'pilot@example.com', role: 'pilot' });
  });

  it('addFlightDoc writes the flight into the logbook subcollection by id', async () => {
    await addFlightDoc('u1', flight);
    expect(h.calls[0]).toMatchObject({ fn: 'setDoc', path: 'users/u1/logbook/f1' });
    expect(h.calls[0].data).not.toHaveProperty('id');
  });

  it('updateFlightDoc merges; deleteFlightDoc removes by id', async () => {
    await updateFlightDoc('u1', 'f1', flight);
    expect(h.calls[0]).toMatchObject({
      fn: 'setDoc',
      path: 'users/u1/logbook/f1',
      opts: { merge: true },
    });
    h.calls = [];
    await deleteFlightDoc('u1', 'f1');
    expect(h.calls[0]).toEqual({ fn: 'deleteDoc', path: 'users/u1/logbook/f1' });
  });

  it('record write-throughs target the records subcollection', async () => {
    await addRecordDoc('u1', record);
    expect(h.calls[0]).toMatchObject({ fn: 'setDoc', path: 'users/u1/records/r1' });
    h.calls = [];
    await deleteRecordDoc('u1', 'r1');
    expect(h.calls[0]).toEqual({ fn: 'deleteDoc', path: 'users/u1/records/r1' });
  });
});
