/**
 * Local-first Library personalization: bookmarks (document- and section-level),
 * recently-viewed documents, saved searches and per-document highlights/notes.
 * Persisted to localStorage and exposed via useSyncExternalStore so the library
 * hub and reader re-render on change. Mirrors src/lib/guidePrefs.ts; the list
 * transforms are pure (and unit-tested).
 */
import { useSyncExternalStore } from 'react';

export type LibraryKind = 'regulations' | 'reference' | 'handbook';

export interface LibDoc {
  kind: LibraryKind;
  slug: string;
  title: string;
}
/** A bookmark; when `anchor` is set it points at a specific section heading. */
export interface LibBookmark extends LibDoc {
  anchor?: string;
  anchorText?: string;
}
export interface SavedSearch {
  kind: LibraryKind;
  category: string;
  query: string;
}
export interface LibNote {
  id: string;
  /** Nearest heading id, used to re-anchor the highlight within its section. */
  sectionId: string;
  quote: string;
  note: string;
  created: string;
}

const BM_KEY = 'flygaca:library-bookmarks';
const RECENT_KEY = 'flygaca:library-recents';
const SEARCH_KEY = 'flygaca:library-searches';
const NOTES_KEY = 'flygaca:library-notes';
const RECENT_MAX = 12;
const SEARCH_MAX = 8;

// ── Pure keys + transforms (unit-tested) ──
export const docKey = (d: { kind: string; slug: string }): string => `${d.kind}:${d.slug}`;
export const bookmarkKey = (b: { kind: string; slug: string; anchor?: string }): string =>
  `${b.kind}:${b.slug}${b.anchor ? '#' + b.anchor : ''}`;
export const searchKey = (s: SavedSearch): string =>
  `${s.kind}|${s.category}|${s.query.trim().toLowerCase()}`;

/** Toggle membership of `item` (by key) in `list`. */
export function toggleBy<T>(list: T[], item: T, key: (x: T) => string): T[] {
  const k = key(item);
  return list.some((x) => key(x) === k) ? list.filter((x) => key(x) !== k) : [...list, item];
}
/** Most-recent-first, de-duplicated by key, capped at `max`. */
export function addRecentBy<T>(list: T[], item: T, key: (x: T) => string, max: number): T[] {
  const k = key(item);
  return [item, ...list.filter((x) => key(x) !== k)].slice(0, max);
}

export interface LibraryPrefs {
  bookmarks: LibBookmark[];
  recents: LibDoc[];
  searches: SavedSearch[];
  notes: Record<string, LibNote[]>;
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

let state: LibraryPrefs = {
  bookmarks: readJson<LibBookmark[]>(BM_KEY, []),
  recents: readJson<LibDoc[]>(RECENT_KEY, []),
  searches: readJson<SavedSearch[]>(SEARCH_KEY, []),
  notes: readJson<Record<string, LibNote[]>>(NOTES_KEY, {}),
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function useLibraryPrefs(): LibraryPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** True when a document (or a specific section, if `anchor` given) is bookmarked. */
export function isBookmarked(
  prefs: LibraryPrefs,
  kind: string,
  slug: string,
  anchor?: string,
): boolean {
  const k = bookmarkKey({ kind, slug, anchor });
  return prefs.bookmarks.some((b) => bookmarkKey(b) === k);
}

export function toggleBookmark(b: LibBookmark): void {
  state = { ...state, bookmarks: toggleBy(state.bookmarks, b, bookmarkKey) };
  save(BM_KEY, state.bookmarks);
  emit();
}

export function recordView(d: LibDoc): void {
  const next = addRecentBy(state.recents, d, docKey, RECENT_MAX);
  state = { ...state, recents: next };
  save(RECENT_KEY, state.recents);
  emit();
}

export function saveSearch(s: SavedSearch): void {
  state = { ...state, searches: addRecentBy(state.searches, s, searchKey, SEARCH_MAX) };
  save(SEARCH_KEY, state.searches);
  emit();
}

export function removeSearch(key: string): void {
  state = { ...state, searches: state.searches.filter((s) => searchKey(s) !== key) };
  save(SEARCH_KEY, state.searches);
  emit();
}

export function addNote(dk: string, note: LibNote): void {
  const list = [...(state.notes[dk] ?? []), note];
  state = { ...state, notes: { ...state.notes, [dk]: list } };
  save(NOTES_KEY, state.notes);
  emit();
}

export function removeNote(dk: string, id: string): void {
  const list = (state.notes[dk] ?? []).filter((n) => n.id !== id);
  const notes = { ...state.notes };
  if (list.length) notes[dk] = list;
  else delete notes[dk];
  state = { ...state, notes };
  save(NOTES_KEY, state.notes);
  emit();
}
