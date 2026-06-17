/**
 * Local-first account store: profile, logbook and a lightweight "session", all
 * persisted to localStorage. This stands in for the Firebase Auth + Firestore
 * service layer (Stage 3) so the account surfaces are fully functional offline;
 * the same component API will map onto Firestore when the backend is wired.
 *
 * Exposed via useSyncExternalStore so components re-render on any change.
 */
import { useSyncExternalStore } from 'react';

export interface Profile {
  email: string;
  displayName: string;
  homeBase: string;
  licenceType: string;
  /** ISO date (YYYY-MM-DD) or ''. */
  medicalExpiry: string;
  lastFlightReview: string;
}

export interface Flight {
  id: string;
  date: string;
  type: string;
  reg: string;
  from: string;
  to: string;
  total: string;
  pic: string;
  night: string;
  ifr: string;
  ldg: string;
  remarks: string;
}

interface State {
  session: string | null;
  profile: Profile;
  flights: Flight[];
}

const K = {
  session: 'flygaca:session',
  profile: 'flygaca:profile',
  logbook: 'flygaca:logbook',
} as const;

const DEFAULT_PROFILE: Profile = {
  email: '',
  displayName: '',
  homeBase: '',
  licenceType: '',
  medicalExpiry: '',
  lastFlightReview: '',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

let state: State = {
  session: localStorage.getItem(K.session),
  profile: readJson(K.profile, DEFAULT_PROFILE),
  flights: readJson(K.logbook, [] as Flight[]),
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function persist() {
  if (state.session) localStorage.setItem(K.session, state.session);
  else localStorage.removeItem(K.session);
  localStorage.setItem(K.profile, JSON.stringify(state.profile));
  localStorage.setItem(K.logbook, JSON.stringify(state.flights));
}

function commit(next: State) {
  state = next;
  persist();
  emit();
}

export function signIn(email: string, name: string): void {
  const displayName = name.trim() || state.profile.displayName || email;
  commit({ ...state, session: email, profile: { ...state.profile, email, displayName } });
}

export function signOut(): void {
  commit({ ...state, session: null });
}

export function saveProfile(patch: Partial<Profile>): void {
  commit({ ...state, profile: { ...state.profile, ...patch } });
}

export function addFlight(f: Omit<Flight, 'id'>): void {
  const flight: Flight = { ...f, id: crypto.randomUUID() };
  commit({ ...state, flights: [flight, ...state.flights] });
}

export function deleteFlight(id: string): void {
  commit({ ...state, flights: state.flights.filter((x) => x.id !== id) });
}

export function exportAll(): string {
  return JSON.stringify({ profile: state.profile, flights: state.flights }, null, 2);
}

export function deleteAllData(): void {
  commit({
    ...state,
    profile: {
      ...DEFAULT_PROFILE,
      email: state.profile.email,
      displayName: state.profile.displayName,
    },
    flights: [],
  });
}

/** Subscribe to the whole account state. */
export function useAccount(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

/** Sum a numeric logbook column across all flights. */
export function sumHours(flights: Flight[], key: keyof Flight): number {
  return flights.reduce((s, f) => s + (parseFloat(String(f[key])) || 0), 0);
}
