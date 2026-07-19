import { describe, expect, it } from 'vitest';
import { hasPackAccess, ownsPack } from '../src/lib/packEntitlements';
import { FREE_FOR_EVERYONE, type Entitlement } from '../src/lib/entitlements';
import { PACKS_GATED, type Pack } from '../src/lib/prepCatalog';

// hasPackAccess is the paywall for the exam-prep product line. Its contract:
// free packs (and everything when the gate is off) are open; a paid pack unlocks
// only when OWNED or when a paid plan is active. Crucially it is PROMO-IMMUNE — it
// must NOT open a paid pack just because FREE_FOR_EVERYONE is on (that promo only
// affects the presentational uiPlan/useFeature reads, never pack ownership).

const NOW = new Date('2026-07-19T00:00:00Z');

const paidPack: Pack = {
  id: 'medical',
  kind: 'subject',
  status: 'live',
  access: 'paid',
  bankIds: ['medical'],
};
const freePack: Pack = {
  id: 'airspace-vfr',
  kind: 'subject',
  status: 'live',
  access: 'free',
  bankIds: ['airspace'],
};

const activePro: Entitlement = { plan: 'pro', expiresAt: '2026-12-31T00:00:00Z', source: 'stripe' };
const lapsedPro: Entitlement = { plan: 'pro', expiresAt: '2026-01-01T00:00:00Z', source: 'stripe' };
const school: Entitlement = { plan: 'school', source: 'school' };

describe('hasPackAccess', () => {
  it('opens a free pack for everyone (even anonymous)', () => {
    expect(hasPackAccess(freePack, null, [], NOW)).toBe(true);
    expect(hasPackAccess(freePack, { plan: 'free' }, [], NOW)).toBe(true);
  });

  it('locks a paid pack for a free/anonymous user who does not own it', () => {
    expect(hasPackAccess(paidPack, null, [], NOW)).toBe(false);
    expect(hasPackAccess(paidPack, { plan: 'free' }, [], NOW)).toBe(false);
  });

  it('is PROMO-IMMUNE — a paid unowned pack stays locked even under FREE_FOR_EVERYONE', () => {
    // Guard: this test only proves immunity while the promo is actually on. The
    // predicate must never consult FREE_FOR_EVERYONE, so a free-plan user is locked.
    expect(FREE_FOR_EVERYONE).toBe(true);
    expect(hasPackAccess(paidPack, { plan: 'free' }, [], NOW)).toBe(false);
  });

  it('unlocks a paid pack the user owns (permanent, plan-independent)', () => {
    expect(hasPackAccess(paidPack, null, ['medical'], NOW)).toBe(true);
    expect(hasPackAccess(paidPack, { plan: 'free' }, ['medical'], NOW)).toBe(true);
    // Ownership survives a lapsed plan.
    expect(hasPackAccess(paidPack, lapsedPro, ['medical'], NOW)).toBe(true);
  });

  it('includes a paid pack with any active paid plan (Pro/School)', () => {
    expect(hasPackAccess(paidPack, activePro, [], NOW)).toBe(true);
    expect(hasPackAccess(paidPack, school, [], NOW)).toBe(true);
  });

  it('locks a paid pack once the plan lapses and it is not owned', () => {
    expect(hasPackAccess(paidPack, lapsedPro, [], NOW)).toBe(false);
  });

  it('respects the PACKS_GATED kill-switch', () => {
    // Documents current behaviour: with the gate ON, a paid unowned pack is locked.
    expect(PACKS_GATED).toBe(true);
    expect(hasPackAccess(paidPack, { plan: 'free' }, [], NOW)).toBe(false);
  });
});

describe('ownsPack', () => {
  it('is true only when the pack id is in the owned set', () => {
    expect(ownsPack(paidPack, ['medical'])).toBe(true);
    expect(ownsPack(paidPack, ['aip'])).toBe(false);
    expect(ownsPack(paidPack, [])).toBe(false);
  });

  it('distinguishes ownership from plan-included access', () => {
    // A Pro user who never bought this pack has access but does NOT "own" it —
    // drives the "Included in Pro" vs "Owned" badge.
    expect(hasPackAccess(paidPack, activePro, [], NOW)).toBe(true);
    expect(ownsPack(paidPack, [])).toBe(false);
  });
});
