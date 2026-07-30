/**
 * Waitlist / notify-me capture. Appends {email, topic} to the write-only `waitlist`
 * Firestore collection (see firestore.rules — creatable by anyone, never readable
 * from the client, so addresses stay private). Best-effort and Firebase-gated: a
 * no-op in the local-first build. `topic` records what the person is waiting for —
 * e.g. a `soon` exam-prep pack id.
 */
import { getDb } from '@/lib/services/firebase';

export async function notifyWaitlist(email: string, topic?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('unavailable');
  const { collection, addDoc } = await import('firebase/firestore');
  const payload: { email: string; topic?: string } = { email };
  if (topic) payload.topic = topic;
  await addDoc(collection(db, 'waitlist'), payload);
}
