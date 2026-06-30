/**
 * Local-first onboarding state: whether the first-run welcome tour has been
 * seen, persisted to localStorage and exposed via useSyncExternalStore so the
 * tour mount re-renders when it's dismissed or replayed. Mirrors the store
 * shape in src/lib/guidePrefs.ts.
 *
 * We store the tour *version* the user dismissed rather than a bare boolean, so
 * a future material change to the tour can re-introduce it by bumping
 * TOUR_VERSION without stranding everyone on the old "seen" flag.
 */
import { useSyncExternalStore } from 'react';

const SEEN_KEY = 'flygaca:onboarding-seen';

/** Bump when the tour changes materially enough to re-show returning users. */
export const TOUR_VERSION = '1';

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

let state: string | null = readSeen();

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** True once the current tour version has been dismissed. During prerender
 *  (no localStorage) this is false, so the markup never assumes "seen". */
export function useOnboardingSeen(): boolean {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  return snapshot === TOUR_VERSION;
}

/** Record the current tour version as seen — every dismissal path calls this. */
export function markOnboardingSeen(): void {
  if (state === TOUR_VERSION) return;
  state = TOUR_VERSION;
  try {
    localStorage.setItem(SEEN_KEY, TOUR_VERSION);
  } catch {
    /* storage unavailable — keep in-memory */
  }
  emit();
}

/** Clear the seen flag so the tour shows again (the Settings "replay" escape hatch). */
export function replayOnboarding(): void {
  state = null;
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch {
    /* storage unavailable — keep in-memory */
  }
  emit();
}
