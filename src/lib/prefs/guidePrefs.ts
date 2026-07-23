/**
 * Local-first guide preferences: bookmarked guides and a read/completed list,
 * persisted to localStorage and exposed via useSyncExternalStore so the guides
 * hub and reader re-render on change. Mirrors src/lib/toolPrefs.ts (and reuses
 * its pure `toggleId` transform) so the two stores stay consistent.
 */
import { useSyncExternalStore } from 'react';
import { toggleId } from '@/lib/prefs/toolPrefs';

const BOOKMARK_KEY = 'flygaca:guide-bookmarks';
const READ_KEY = 'flygaca:guide-read';

/** Add `id` to `list` if absent (idempotent). */
export function addId(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export interface GuidePrefs {
  bookmarks: string[];
  read: string[];
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

let state: GuidePrefs = { bookmarks: read(BOOKMARK_KEY), read: read(READ_KEY) };

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function persist(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep in-memory */
  }
}

export function useGuidePrefs(): GuidePrefs {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function toggleBookmark(slug: string): void {
  state = { ...state, bookmarks: toggleId(state.bookmarks, slug) };
  persist(BOOKMARK_KEY, state.bookmarks);
  emit();
}

export function toggleRead(slug: string): void {
  state = { ...state, read: toggleId(state.read, slug) };
  persist(READ_KEY, state.read);
  emit();
}

/** Idempotent — used to auto-mark a guide read when the reader reaches the end. */
export function markRead(slug: string): void {
  const next = addId(state.read, slug);
  if (next === state.read) return;
  state = { ...state, read: next };
  persist(READ_KEY, state.read);
  emit();
}
