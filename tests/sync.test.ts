import { describe, expect, it } from 'vitest';
import {
  profileFromDoc,
  profileToDoc,
  flightFromDoc,
  flightToDoc,
  entitlementFromDoc,
} from '../src/lib/sync';
import type { Profile, Flight } from '../src/lib/account';

const profile: Profile = {
  email: 'pilot@example.com',
  displayName: 'Sara',
  homeBase: 'OERK',
  licenceType: 'PPL',
  medicalExpiry: '2027-01-01',
  lastFlightReview: '2026-01-01',
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
  remarks: 'nav',
};

describe('profile mappers', () => {
  it('round-trips and never serializes an entitlement', () => {
    const doc = profileToDoc(profile);
    expect(doc).not.toHaveProperty('entitlement');
    expect(profileFromDoc(doc)).toEqual(profile);
  });

  it('ignores unknown / non-string fields from the doc', () => {
    const out = profileFromDoc({ email: 'x@y.z', entitlement: { plan: 'pro' }, homeBase: 42 });
    expect(out.email).toBe('x@y.z');
    expect(out.homeBase).toBe('');
    expect(out).not.toHaveProperty('entitlement');
  });
});

describe('flight mappers', () => {
  it('round-trips without the id in the doc body', () => {
    const doc = flightToDoc(flight);
    expect(doc).not.toHaveProperty('id');
    expect(flightFromDoc('f1', doc)).toEqual(flight);
  });
});

describe('entitlementFromDoc', () => {
  it('reads a valid server entitlement', () => {
    expect(
      entitlementFromDoc({ entitlement: { plan: 'pro', expiresAt: '2027-01-01', source: 'stripe' } }),
    ).toEqual({ plan: 'pro', expiresAt: '2027-01-01', source: 'stripe' });
  });

  it('returns null for missing or invalid plans', () => {
    expect(entitlementFromDoc(undefined)).toBeNull();
    expect(entitlementFromDoc({})).toBeNull();
    expect(entitlementFromDoc({ entitlement: { plan: 'gold' } })).toBeNull();
  });
});
