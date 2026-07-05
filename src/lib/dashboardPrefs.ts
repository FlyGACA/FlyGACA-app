/**
 * Local-first dashboard preferences: hidden-widget ids and the one-shot
 * dismissal of the role-picker card, persisted to localStorage and exposed via
 * useSyncExternalStore so the dashboard re-renders on change. List transforms
 * reuse the pure helpers from toolPrefs.
 */
import { useSyncExternalStore } from 'react';
import { toggleId } from './toolPrefs';

const HIDDEN_KEY = 'flygaca:dashboard-hidden';
const ROLE_DISMISS_KEY = 'flygaca:dashboard-role-dismissed';

export interface DashboardPrefs {
  /** Widget ids the user has hidden via the Customize row. */
  hidden: string[];
  /** True once the role-picker card has been dismissed without choosing. */
  roleDismissed: boolean;
}

function readHidden(): string[] {
  try {
    const v = localStorage.getItem(HIDDEN_KEY);
    const parsed = v ? (JSON.parse(v) as unknown) : [];
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === 'string') as string[]) : [];
  } catch {
    return [];
  }
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(ROLE_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

let state: DashboardPrefs = { hidden: readHidden(), roleDismissed: readDismissed() };

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDashboardPrefs(): DashboardPrefs {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function toggleWidget(id: string): void {
  state = { ...state, hidden: toggleId(state.hidden, id) };
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(state.hidden));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  emit();
}

export function dismissRolePrompt(): void {
  state = { ...state, roleDismissed: true };
  try {
    localStorage.setItem(ROLE_DISMISS_KEY, '1');
  } catch {
    /* storage unavailable — keep in-memory */
  }
  emit();
}
