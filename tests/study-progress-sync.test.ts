/**
 * Upload-only study-progress backup (src/lib/services/studyProgressSync.ts). The local
 * store stays the source of truth; this writes a compact projection to
 * `users/{uid}/progress/summary` for the B2B cohort readiness report. Best-effort: a
 * no-op with no uid or when Firebase isn't configured, and it swallows write failures.
 * Pins the no-op paths, the initial-upload payload/path, and the debounced re-write.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  configured: true,
  db: {} as unknown,
  setDocCalls: [] as Array<{ path: string; data: unknown; opts: unknown }>,
  progressCb: null as null | (() => void),
  unsubscribe: vi.fn(),
  summary: { exams: { part91: { pct: 84 } } } as unknown,
}));

vi.mock('@/lib/services/firebase', () => ({
  isFirebaseConfigured: () => h.configured,
  getDb: () => Promise.resolve(h.db),
}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join('/') }),
  setDoc: (ref: { path: string }, data: unknown, opts: unknown) => {
    h.setDocCalls.push({ path: ref.path, data, opts });
    return Promise.resolve();
  },
}));

vi.mock('@/lib/studyProgress', () => ({
  subscribeStudyProgress: (cb: () => void) => {
    h.progressCb = cb;
    return h.unsubscribe;
  },
  getStudyState: () => ({}),
  toProgressSummary: () => h.summary,
}));

import { startStudyProgressSync } from '@/lib/services/studyProgressSync';

beforeEach(() => {
  h.configured = true;
  h.db = {};
  h.setDocCalls = [];
  h.progressCb = null;
  h.unsubscribe = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startStudyProgressSync — no-op paths', () => {
  it('returns a noop and writes nothing when uid is null', async () => {
    const stop = startStudyProgressSync(null);
    await Promise.resolve();
    expect(h.setDocCalls).toHaveLength(0);
    expect(h.progressCb).toBeNull();
    expect(() => stop()).not.toThrow();
  });

  it('returns a noop when Firebase is not configured', async () => {
    h.configured = false;
    startStudyProgressSync('u1');
    await Promise.resolve();
    expect(h.setDocCalls).toHaveLength(0);
    expect(h.progressCb).toBeNull();
  });
});

describe('startStudyProgressSync — active sync', () => {
  it('uploads the summary to users/{uid}/progress/summary with merge on start', async () => {
    startStudyProgressSync('u1');
    await vi.waitFor(() => expect(h.setDocCalls).toHaveLength(1));
    expect(h.setDocCalls[0]).toEqual({
      path: 'users/u1/progress/summary',
      data: h.summary,
      opts: { merge: true },
    });
  });

  it('unsubscribes from the progress store when the returned stop() is called', async () => {
    const stop = startStudyProgressSync('u1');
    await vi.waitFor(() => expect(h.setDocCalls).toHaveLength(1));
    stop();
    expect(h.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('debounces a progress change into a second upload', async () => {
    vi.useFakeTimers();
    startStudyProgressSync('u1');
    // Initial upload is fire-and-forget; let its microtasks settle.
    await vi.advanceTimersByTimeAsync(0);
    expect(h.setDocCalls).toHaveLength(1);

    // A progress change should not write until the debounce window elapses.
    h.progressCb?.();
    await vi.advanceTimersByTimeAsync(4000);
    expect(h.setDocCalls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(h.setDocCalls).toHaveLength(2);
  });
});
