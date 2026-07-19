/**
 * Firestore security-rules tests — the highest-risk untested surface.
 *
 * `firestore.rules` encodes two load-bearing invariants that the app relies on
 * (CLAUDE.md: "the `entitlement` record is server-only; the app reads it only to
 * gate UI, never to grant"):
 *   1. A client can never introduce or change the server-only `entitlement` field.
 *   2. Strict per-user isolation — no client can read another user's profile or
 *      logbook.
 * Plus the field-shape guards (email/displayName/hours/remarks bounds) and the
 * write-only `waitlist` / fully-denied `stripeCustomers` collections.
 *
 * Runs against the Firestore emulator under its own config — see
 * `vitest.rules.config.ts` and the `test:rules` script (which wraps this in
 * `firebase emulators:exec`).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, type Firestore } from 'firebase/firestore';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(HERE, '../../firestore.rules'), 'utf8');

const ALICE = 'alice';
const BOB = 'bob';

/** A profile doc the rules accept (valid email, no entitlement on create). */
const validProfile = {
  email: 'alice@example.com',
  displayName: 'Alice',
  homeBase: 'OERK',
};

/** A logbook entry the rules accept — total is the STRING the client writes. */
const validFlight = { date: '2026-01-01', total: '1.5', remarks: 'circuits' };

/** A pilot record the rules accept. */
const validRecord = { category: 'rating', title: 'Instrument Rating', ref: 'IR', remarks: '' };

let testEnv: RulesTestEnvironment;

/** Firestore handle for a signed-in user. */
function dbFor(uid: string): Firestore {
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

/** Firestore handle for an unauthenticated client. */
function anonDb(): Firestore {
  return testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'flygaca-rules-test',
    firestore: { rules: RULES },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Seed a doc with the rules disabled, so tests can exercise read/update paths. */
async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data);
  });
}

describe('users/{uid} — ownership & entitlement', () => {
  it('lets an owner create their own profile without an entitlement', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), `users/${ALICE}`), validProfile));
  });

  it('lets an owner read their own profile', async () => {
    await seed(`users/${ALICE}`, validProfile);
    await assertSucceeds(getDoc(doc(dbFor(ALICE), `users/${ALICE}`)));
  });

  it("denies reading another user's profile", async () => {
    await seed(`users/${ALICE}`, validProfile);
    await assertFails(getDoc(doc(dbFor(BOB), `users/${ALICE}`)));
  });

  it("denies writing to another user's profile", async () => {
    await assertFails(setDoc(doc(dbFor(BOB), `users/${ALICE}`), validProfile));
  });

  it('denies an anonymous client reading any profile', async () => {
    await seed(`users/${ALICE}`, validProfile);
    await assertFails(getDoc(doc(anonDb(), `users/${ALICE}`)));
  });

  it('denies creating a profile that ships an entitlement (self-grant)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), {
        ...validProfile,
        entitlement: { plan: 'pro', source: 'stripe' },
      }),
    );
  });

  it('denies adding an entitlement on update', async () => {
    await seed(`users/${ALICE}`, validProfile);
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), {
        ...validProfile,
        entitlement: { plan: 'pro' },
      }),
    );
  });

  it('denies altering a server-set entitlement on update', async () => {
    await seed(`users/${ALICE}`, { ...validProfile, entitlement: { plan: 'free' } });
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), {
        ...validProfile,
        entitlement: { plan: 'pro' },
      }),
    );
  });

  it('allows an update that leaves a server-set entitlement byte-identical', async () => {
    const ent = { plan: 'pro', source: 'stripe' };
    await seed(`users/${ALICE}`, { ...validProfile, entitlement: ent });
    await assertSucceeds(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), {
        ...validProfile,
        displayName: 'Alice Renamed',
        entitlement: ent,
      }),
    );
  });

  it('denies dropping a server-set entitlement on update', async () => {
    await seed(`users/${ALICE}`, { ...validProfile, entitlement: { plan: 'pro' } });
    await assertFails(setDoc(doc(dbFor(ALICE), `users/${ALICE}`), validProfile));
  });

  it('rejects a profile with a malformed email', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), { ...validProfile, email: 'not-an-email' }),
    );
  });

  it('rejects a profile with an over-long displayName', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), {
        ...validProfile,
        displayName: 'x'.repeat(121),
      }),
    );
  });

  it('lets an owner delete their own profile', async () => {
    await seed(`users/${ALICE}`, validProfile);
    await assertSucceeds(deleteDoc(doc(dbFor(ALICE), `users/${ALICE}`)));
  });

  it('accepts the known role field on create and update', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), { ...validProfile, role: 'student' }),
    );
    await assertSucceeds(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), { ...validProfile, role: 'instructor' }),
    );
  });

  it('rejects a profile carrying an unknown field (pinned key set)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}`), { ...validProfile, hacked: true }),
    );
  });
});

describe('users/{uid}/logbook — isolation & field bounds', () => {
  it('lets an owner create a valid flight', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), validFlight));
  });

  it("denies reading another user's logbook", async () => {
    await seed(`users/${ALICE}/logbook/f1`, validFlight);
    await assertFails(getDoc(doc(dbFor(BOB), `users/${ALICE}/logbook/f1`)));
  });

  it('rejects a negative total (not a valid hours string)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), { ...validFlight, total: '-1' }),
    );
  });

  it('rejects an absurdly large total (over 5 integer digits)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), { ...validFlight, total: '100001' }),
    );
  });

  it('rejects a non-string total (the client always writes a string)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), { ...validFlight, total: 1.5 }),
    );
  });

  it('rejects over-long remarks', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), {
        ...validFlight,
        remarks: 'x'.repeat(2001),
      }),
    );
  });

  it('rejects a malformed (non-ISO) date', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), {
        ...validFlight,
        date: 'xxxxxxxxxxxx',
      }),
    );
  });

  it('rejects a flight carrying an unknown field (pinned key set)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/logbook/f1`), { ...validFlight, hacked: true }),
    );
  });
});

describe('users/{uid}/records — isolation & field bounds', () => {
  it('lets an owner create a valid record', async () => {
    await assertSucceeds(setDoc(doc(dbFor(ALICE), `users/${ALICE}/records/r1`), validRecord));
  });

  it("denies reading another user's records", async () => {
    await seed(`users/${ALICE}/records/r1`, validRecord);
    await assertFails(getDoc(doc(dbFor(BOB), `users/${ALICE}/records/r1`)));
  });

  it('lets an owner delete their own record', async () => {
    await seed(`users/${ALICE}/records/r1`, validRecord);
    await assertSucceeds(deleteDoc(doc(dbFor(ALICE), `users/${ALICE}/records/r1`)));
  });

  it('rejects an unknown record category', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/records/r1`), { ...validRecord, category: 'nope' }),
    );
  });

  it('rejects an over-long record title', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/records/r1`), {
        ...validRecord,
        title: 'x'.repeat(201),
      }),
    );
  });
});

describe('users/{uid}/progress — readiness projection', () => {
  const validSummary = {
    quizBest: { 'aip-ais': 80 },
    exam: { pct: 72, passed: false, date: '2026-07-16' },
    examBest: 88,
    examCount: 2,
    gsDone: { 'air-law': true },
    updatedAt: '2026-07-17T12:00:00.000Z',
  };

  it('lets an owner write their progress summary', async () => {
    await assertSucceeds(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/progress/summary`), validSummary),
    );
  });

  it("denies reading another user's progress", async () => {
    await seed(`users/${ALICE}/progress/summary`, validSummary);
    await assertFails(getDoc(doc(dbFor(BOB), `users/${ALICE}/progress/summary`)));
  });

  it("denies writing another user's progress", async () => {
    await assertFails(setDoc(doc(dbFor(BOB), `users/${ALICE}/progress/summary`), validSummary));
  });

  it('rejects an unexpected key (e.g. syncing answers)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/progress/summary`), {
        ...validSummary,
        answers: { 'aip-ais': [1, 2, 3] },
      }),
    );
  });

  it('rejects an out-of-range examBest', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/progress/summary`), {
        ...validSummary,
        examBest: 140,
      }),
    );
  });

  it('rejects an oversized quizBest map', async () => {
    const quizBest: Record<string, number> = {};
    for (let i = 0; i < 101; i += 1) quizBest[`bank-${i}`] = 50;
    await assertFails(
      setDoc(doc(dbFor(ALICE), `users/${ALICE}/progress/summary`), { ...validSummary, quizBest }),
    );
  });
});

describe('waitlist — write-only', () => {
  it('lets anyone submit a valid email', async () => {
    await assertSucceeds(setDoc(doc(anonDb(), 'waitlist/e1'), { email: 'lead@example.com' }));
  });

  it('lets a submission carry an optional topic (a soon-pack id)', async () => {
    await assertSucceeds(
      setDoc(doc(anonDb(), 'waitlist/e1'), { email: 'lead@example.com', topic: 'cpl' }),
    );
  });

  it('rejects a malformed waitlist email', async () => {
    await assertFails(setDoc(doc(anonDb(), 'waitlist/e1'), { email: 'nope' }));
  });

  it('rejects an over-long topic', async () => {
    await assertFails(
      setDoc(doc(anonDb(), 'waitlist/e1'), { email: 'lead@example.com', topic: 'x'.repeat(41) }),
    );
  });

  it('rejects a submission carrying an unknown field (pinned key set)', async () => {
    await assertFails(
      setDoc(doc(anonDb(), 'waitlist/e1'), { email: 'lead@example.com', hacked: true }),
    );
  });

  it('denies reading the waitlist', async () => {
    await seed('waitlist/e1', { email: 'lead@example.com' });
    await assertFails(getDoc(doc(anonDb(), 'waitlist/e1')));
  });
});

describe('stripeCustomers & default-deny', () => {
  it('denies a client reading the stripe-customer mapping', async () => {
    await seed(`stripeCustomers/${ALICE}`, { customerId: 'cus_x' });
    await assertFails(getDoc(doc(dbFor(ALICE), `stripeCustomers/${ALICE}`)));
  });

  it('denies a client writing the stripe-customer mapping', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `stripeCustomers/${ALICE}`), { customerId: 'cus_x' }),
    );
  });

  it('denies a client reading the stripe-events idempotency markers', async () => {
    await seed('stripeEvents/evt_1', { type: 'checkout.session.completed' });
    await assertFails(getDoc(doc(dbFor(ALICE), 'stripeEvents/evt_1')));
  });

  it('denies a client writing a stripe-events marker', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'stripeEvents/evt_1'), { type: 'x' }));
  });

  it('denies a client reading the school-invite roster', async () => {
    await seed('schoolInvites/cadet@academy.edu.sa', { email: 'cadet@academy.edu.sa' });
    await assertFails(getDoc(doc(dbFor(ALICE), 'schoolInvites/cadet@academy.edu.sa')));
  });

  it('denies a client writing a school invite (self-forging a seat)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'schoolInvites/cadet@academy.edu.sa'), {
        email: 'cadet@academy.edu.sa',
      }),
    );
  });

  it('denies a client reading an org record (cohort enumeration)', async () => {
    await seed('orgs/riyadh-flight', { name: 'Riyadh Flight', ownerUids: [ALICE] });
    await assertFails(getDoc(doc(dbFor(ALICE), 'orgs/riyadh-flight')));
  });

  it('denies a client writing an org record (self-appointing as owner)', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), 'orgs/riyadh-flight'), { name: 'x', ownerUids: [ALICE] }),
    );
  });

  it('denies a client reading the org member index', async () => {
    await seed(`orgs/riyadh-flight/members/${BOB}`, { email: 'bob@academy.edu.sa' });
    await assertFails(getDoc(doc(dbFor(ALICE), `orgs/riyadh-flight/members/${BOB}`)));
  });

  it('denies a client writing an org member record', async () => {
    await assertFails(
      setDoc(doc(dbFor(ALICE), `orgs/riyadh-flight/members/${ALICE}`), { email: 'a@x.com' }),
    );
  });

  it('denies access to any unlisted server-only collection', async () => {
    await seed('serverOnly/x', { count: 1 });
    await assertFails(getDoc(doc(dbFor(ALICE), 'serverOnly/x')));
  });
});

describe('chatCredits — owner-readable, server-only writes', () => {
  it('lets an owner read their own purchased credit balance', async () => {
    await seed(`chatCredits/${ALICE}`, { balance: 50 });
    await assertSucceeds(getDoc(doc(dbFor(ALICE), `chatCredits/${ALICE}`)));
  });

  it("denies reading another user's credit balance", async () => {
    await seed(`chatCredits/${ALICE}`, { balance: 50 });
    await assertFails(getDoc(doc(dbFor(BOB), `chatCredits/${ALICE}`)));
  });

  it('denies a client writing its own credit balance (no self-grant)', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), `chatCredits/${ALICE}`), { balance: 999 }));
  });
});

describe('packEntitlements — owner-readable, server-only writes', () => {
  const owned = { packs: { medical: { purchasedAt: '2026-07-19T00:00:00.000Z', source: 'stripe' } } };

  it('lets an owner read their own purchased packs', async () => {
    await seed(`packEntitlements/${ALICE}`, owned);
    await assertSucceeds(getDoc(doc(dbFor(ALICE), `packEntitlements/${ALICE}`)));
  });

  it("denies reading another user's purchased packs", async () => {
    await seed(`packEntitlements/${ALICE}`, owned);
    await assertFails(getDoc(doc(dbFor(BOB), `packEntitlements/${ALICE}`)));
  });

  it('denies a client writing its own pack ownership (no self-grant)', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), `packEntitlements/${ALICE}`), owned));
  });

  it('denies deleting a server-set pack ownership doc', async () => {
    await seed(`packEntitlements/${ALICE}`, owned);
    await assertFails(deleteDoc(doc(dbFor(ALICE), `packEntitlements/${ALICE}`)));
  });
});

describe('referral bookkeeping — fully server-only', () => {
  it('denies a client reading the code → referrer mapping', async () => {
    await seed('referralCodes/ABCDEFGH', { uid: ALICE });
    await assertFails(getDoc(doc(dbFor(ALICE), 'referralCodes/ABCDEFGH')));
  });

  it('denies a client writing a referral code mapping', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'referralCodes/ABCDEFGH'), { uid: ALICE }));
  });

  it('denies a client reading or writing a referral reward marker', async () => {
    await seed(`referrals/${BOB}`, { referrerUid: ALICE });
    await assertFails(getDoc(doc(dbFor(BOB), `referrals/${BOB}`)));
    await assertFails(setDoc(doc(dbFor(BOB), `referrals/${BOB}`), { referrerUid: ALICE }));
  });
});

describe('licensed-API keys — fully server-only', () => {
  it('denies a client reading an API key hash or its usage meter', async () => {
    await seed('apiKeys/deadbeef', { active: true, label: 'Acme' });
    await seed('apiUsage/deadbeef', { count: 5 });
    await assertFails(getDoc(doc(dbFor(ALICE), 'apiKeys/deadbeef')));
    await assertFails(getDoc(doc(dbFor(ALICE), 'apiUsage/deadbeef')));
  });

  it('denies a client minting or metering a key', async () => {
    await assertFails(setDoc(doc(dbFor(ALICE), 'apiKeys/deadbeef'), { active: true }));
    await assertFails(setDoc(doc(dbFor(ALICE), 'apiUsage/deadbeef'), { count: 999 }));
  });
});
