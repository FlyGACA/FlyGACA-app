/**
 * Unified study progress: quiz best scores, ground-school completion, flashcard
 * mastery, the last mock-exam result and a daily study streak. Local-first
 * (localStorage) and exposed via useSyncExternalStore so the study hub reflects
 * progress live. Backward compatible: quiz best scores and ground-school
 * completion keep their original per-key storage (`flygaca:quiz:*`,
 * `flygaca:gs:*`) so existing data carries over. Date/streak logic is pure.
 */
import { useSyncExternalStore } from 'react';

const Q_PREFIX = 'flygaca:quiz:';
const GS_PREFIX = 'flygaca:gs:';
const FC_KEY = 'flygaca:study:flashcards';
const STREAK_KEY = 'flygaca:study:streak';
const EXAM_KEY = 'flygaca:study:exam';

export interface Streak {
  /** ISO yyyy-mm-dd of the most recent study day. */
  day: string;
  count: number;
}
export interface ExamResult {
  pct: number;
  passed: boolean;
  date: string;
}
export interface StudyState {
  quizBest: Record<string, number>;
  gsDone: Record<string, boolean>;
  /** bankId → list of mastered card keys. */
  fcKnown: Record<string, string[]>;
  streak: Streak;
  exam: ExamResult | null;
}

// ── Pure helpers (unit-tested) ──
export function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Advance a streak for a study event today: same day = unchanged, consecutive = +1, gap = reset. */
export function nextStreak(prev: Streak, today: string, yesterday: string): Streak {
  if (prev.day === today) return prev;
  if (prev.day === yesterday) return { day: today, count: prev.count + 1 };
  return { day: today, count: 1 };
}

function scanKeys(prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
  } catch {
    /* storage unavailable */
  }
  return keys;
}
function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* storage unavailable */
  }
}
function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function load(): StudyState {
  const quizBest: Record<string, number> = {};
  for (const k of scanKeys(Q_PREFIX)) {
    const n = Number(localStorage.getItem(k));
    if (Number.isFinite(n)) quizBest[k.slice(Q_PREFIX.length)] = n;
  }
  const gsDone: Record<string, boolean> = {};
  for (const k of scanKeys(GS_PREFIX)) {
    if (localStorage.getItem(k) === '1') gsDone[k.slice(GS_PREFIX.length)] = true;
  }
  return {
    quizBest,
    gsDone,
    fcKnown: readJson<Record<string, string[]>>(FC_KEY, {}),
    streak: readJson<Streak>(STREAK_KEY, { day: '', count: 0 }),
    exam: readJson<ExamResult | null>(EXAM_KEY, null),
  };
}

let state: StudyState = load();
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function commit(next: StudyState) {
  state = next;
  emit();
}

export function useStudyProgress(): StudyState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function recordStudyDay(now: Date = new Date()): void {
  const today = dayStr(now);
  const yesterday = dayStr(new Date(now.getTime() - 86400000));
  const streak = nextStreak(state.streak, today, yesterday);
  if (streak === state.streak) return;
  save(STREAK_KEY, JSON.stringify(streak));
  commit({ ...state, streak });
}

export function setQuizBest(bankId: string, pct: number): void {
  recordStudyDay();
  if (pct <= (state.quizBest[bankId] ?? 0)) return;
  save(Q_PREFIX + bankId, String(pct));
  commit({ ...state, quizBest: { ...state.quizBest, [bankId]: pct } });
}

export function toggleLesson(id: string): void {
  const done = !state.gsDone[id];
  const gsDone = { ...state.gsDone };
  if (done) {
    save(GS_PREFIX + id, '1');
    gsDone[id] = true;
    recordStudyDay();
  } else {
    remove(GS_PREFIX + id);
    delete gsDone[id];
  }
  commit({ ...state, gsDone });
}

export function setCardKnown(bankId: string, cardKey: string, known: boolean): void {
  recordStudyDay();
  const cur = new Set(state.fcKnown[bankId] ?? []);
  if (known) cur.add(cardKey);
  else cur.delete(cardKey);
  const fcKnown = { ...state.fcKnown, [bankId]: [...cur] };
  save(FC_KEY, JSON.stringify(fcKnown));
  commit({ ...state, fcKnown });
}

export function setExamResult(result: ExamResult): void {
  recordStudyDay();
  save(EXAM_KEY, JSON.stringify(result));
  commit({ ...state, exam: result });
}
