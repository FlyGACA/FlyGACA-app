/**
 * Waitlist capture (src/lib/services/waitlist.ts): appends {email, topic} to the
 * write-only `waitlist` Firestore collection. Best-effort and Firebase-gated — throws
 * `'unavailable'` in the local-first build so the caller can surface a friendly error.
 * Firestore mock mirrors tests/sync-io.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  db: {} as unknown,
  calls: [] as Array<{ path: string; data: unknown }>,
}));

vi.mock('@/lib/services/firebase', () => ({
  getDb: () => Promise.resolve(h.db),
}));

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...segs: string[]) => ({ kind: 'collection', path: segs.join('/') }),
  addDoc: (ref: { path: string }, data: unknown) => {
    h.calls.push({ path: ref.path, data });
    return Promise.resolve({ id: 'generated-id' });
  },
}));

import { notifyWaitlist } from '@/lib/services/waitlist';

beforeEach(() => {
  h.db = {};
  h.calls = [];
});

describe('notifyWaitlist', () => {
  it('throws "unavailable" when Firebase is not configured (no db)', async () => {
    h.db = null;
    await expect(notifyWaitlist('a@b.com')).rejects.toThrow('unavailable');
    expect(h.calls).toHaveLength(0);
  });

  it('appends { email } to the waitlist collection', async () => {
    await notifyWaitlist('a@b.com');
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]).toEqual({ path: 'waitlist', data: { email: 'a@b.com' } });
  });

  it('includes the topic when one is provided', async () => {
    await notifyWaitlist('a@b.com', 'pack-atpl');
    expect(h.calls[0].data).toEqual({ email: 'a@b.com', topic: 'pack-atpl' });
  });

  it('omits the topic key entirely when it is empty', async () => {
    await notifyWaitlist('a@b.com', '');
    expect(h.calls[0].data).toEqual({ email: 'a@b.com' });
    expect(h.calls[0].data).not.toHaveProperty('topic');
  });
});
