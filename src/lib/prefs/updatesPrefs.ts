/**
 * Local-first state for the regulatory change-tracking feature: the user's
 * last-seen fingerprint snapshot (so we can show "what changed since you last
 * looked") and the set of source ids they're watching. Persisted to localStorage
 * and exposed via useSyncExternalStore so the Updates page re-renders on change.
 * Mirrors src/lib/libraryPrefs.ts.
 */
import { useSyncExternalStore } from 'react';
import type { SeenMap } from '@/calc/library/changeTracking';

const SEEN_KEY = 'flygaca:updates-seen';
const WATCH_KEY = 'flygaca:updates-watch';

export interface UpdatesPrefs {
  /** id → last-seen fingerprint. */
  seen: SeenMap;
  /** Watched source ids. */
  watch: string[];
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage unavailable — keep in-memory */
  }
}

let state: UpdatesPrefs = {
  seen: readJson<SeenMap>(SEEN_KEY, {}),
  watch: readJson<string[]>(WATCH_KEY, []),
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function useUpdatesPrefs(): UpdatesPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Record the current fingerprints as seen (the "mark all read" action / baseline). */
export function markAllSeen(seen: SeenMap): void {
  state = { ...state, seen };
  save(SEEN_KEY, state.seen);
  emit();
}

/** Add or remove a source id from the watchlist. */
export function toggleWatch(id: string): void {
  const watching = state.watch.includes(id);
  state = {
    ...state,
    watch: watching ? state.watch.filter((x) => x !== id) : [...state.watch, id],
  };
  save(WATCH_KEY, state.watch);
  emit();
}

/** True when the user has never set a baseline (first-ever visit). */
export function hasBaseline(prefs: UpdatesPrefs): boolean {
  return Object.keys(prefs.seen).length > 0;
}
