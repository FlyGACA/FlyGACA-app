/**
 * Local-first tool preferences: pinned favourites and a recently-used list,
 * persisted to localStorage and exposed via useSyncExternalStore so the tools
 * hub re-renders on change. The list transforms are pure (and unit-tested);
 * the store is a thin wrapper over them.
 */
import { useSyncExternalStore } from 'react';

const FAV_KEY = 'flygaca:tool-favorites';
const RECENT_KEY = 'flygaca:tool-recents';
const RECENT_MAX = 6;

/** Most-recent-first, de-duplicated, capped at `max`. */
export function addRecent(list: string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

/** Toggle membership of `id` in `list`. */
export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export interface ToolPrefs {
  favorites: string[];
  recents: string[];
}

function read(key: string): string[] {
  try {
    const v = localStorage.getItem(key);
    const parsed = v ? (JSON.parse(v) as unknown) : [];
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === 'string') as string[]) : [];
  } catch {
    return [];
  }
}

let state: ToolPrefs = { favorites: read(FAV_KEY), recents: read(RECENT_KEY) };

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useToolPrefs(): ToolPrefs {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function toggleFavorite(id: string): void {
  state = { ...state, favorites: toggleId(state.favorites, id) };
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  emit();
}

export function pushRecent(id: string): void {
  state = { ...state, recents: addRecent(state.recents, id) };
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(state.recents));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  emit();
}
