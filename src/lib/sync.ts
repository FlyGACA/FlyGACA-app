/**
 * Firestore sync for the account store. Pure mappers (Firestore doc ⇄ Profile /
 * Flight / Entitlement) are unit-tested; the I/O helpers are best-effort and
 * guarded by `getDb()` so they no-op when Firebase isn't configured.
 *
 * Per `firestore.rules`, the client may write the profile fields and its own
 * logbook, but NEVER the server-only `entitlement` field — so `profileToDoc`
 * deliberately omits it.
 */
import type { Profile, Flight, PilotRecord } from './account';
import type { Entitlement, Plan } from './entitlements';
import { getDb } from './firebase';

const PROFILE_FIELDS: (keyof Profile)[] = [
  'email',
  'displayName',
  'homeBase',
  'licenceType',
  'medicalExpiry',
  'lastFlightReview',
];

const FLIGHT_FIELDS: (keyof Omit<Flight, 'id'>)[] = [
  'date',
  'type',
  'reg',
  'from',
  'to',
  'total',
  'pic',
  'night',
  'ifr',
  'ldg',
  'nightLdg',
  'appr',
  'remarks',
];

type Doc = Record<string, unknown> | undefined;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Pick the known profile string fields out of a user doc. */
export function profileFromDoc(d: Doc): Partial<Profile> {
  const out: Partial<Profile> = {};
  if (!d) return out;
  for (const f of PROFILE_FIELDS) if (d[f] !== undefined) out[f] = str(d[f]);
  return out;
}

/** Serialize the profile for Firestore — never includes the server-only entitlement. */
export function profileToDoc(p: Profile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) out[f] = str(p[f]);
  return out;
}

export function flightToDoc(f: Flight): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of FLIGHT_FIELDS) out[k] = str(f[k]);
  return out;
}

export function flightFromDoc(id: string, d: Record<string, unknown>): Flight {
  const out = { id } as Flight;
  for (const k of FLIGHT_FIELDS) out[k] = str(d[k]);
  return out;
}

const RECORD_FIELDS: (keyof Omit<PilotRecord, 'id'>)[] = [
  'category',
  'title',
  'ref',
  'issued',
  'expires',
  'remarks',
];

export function recordToDoc(r: PilotRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of RECORD_FIELDS) out[k] = str(r[k]);
  return out;
}

export function recordFromDoc(id: string, d: Record<string, unknown>): PilotRecord {
  const out = { id } as PilotRecord;
  for (const k of RECORD_FIELDS) out[k] = str(d[k]) as never;
  return out;
}

const PLANS: Plan[] = ['free', 'pro', 'school'];

/** Read the server-written entitlement from a user doc (read-only here). */
export function entitlementFromDoc(d: Doc): Entitlement | null {
  const e = d?.entitlement;
  if (!e || typeof e !== 'object') return null;
  const rec = e as Record<string, unknown>;
  const plan = rec.plan;
  if (typeof plan !== 'string' || !PLANS.includes(plan as Plan)) return null;
  return {
    plan: plan as Plan,
    expiresAt: typeof rec.expiresAt === 'string' ? rec.expiresAt : undefined,
    source: rec.source as Entitlement['source'],
  };
}

export interface LoadedAccount {
  profile: Partial<Profile>;
  flights: Flight[];
  records: PilotRecord[];
  entitlement: Entitlement | null;
}

/** One-time hydration of the user's profile, logbook, records and entitlement. */
export async function loadAccount(uid: string): Promise<LoadedAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
  const userSnap = await getDoc(doc(db, 'users', uid));
  const data = userSnap.data();
  const lbSnap = await getDocs(collection(db, 'users', uid, 'logbook'));
  const recSnap = await getDocs(collection(db, 'users', uid, 'records'));
  return {
    profile: profileFromDoc(data),
    flights: lbSnap.docs.map((d) => flightFromDoc(d.id, d.data())),
    records: recSnap.docs.map((d) => recordFromDoc(d.id, d.data())),
    entitlement: entitlementFromDoc(data),
  };
}

export async function saveProfileDoc(uid: string, profile: Profile): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), profileToDoc(profile), { merge: true });
}

export async function addFlightDoc(uid: string, flight: Flight): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid, 'logbook', flight.id), flightToDoc(flight));
}

export async function updateFlightDoc(uid: string, id: string, flight: Flight): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid, 'logbook', id), flightToDoc(flight), { merge: true });
}

export async function deleteFlightDoc(uid: string, id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'users', uid, 'logbook', id));
}

export async function addRecordDoc(uid: string, record: PilotRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid, 'records', record.id), recordToDoc(record));
}

export async function updateRecordDoc(uid: string, id: string, record: PilotRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid, 'records', id), recordToDoc(record), { merge: true });
}

export async function deleteRecordDoc(uid: string, id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'users', uid, 'records', id));
}
