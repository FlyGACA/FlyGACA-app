/**
 * Pure helpers for the saved-conversations archive — Captain Adel keeps a small
 * list of recent threads instead of a single transcript. No DOM imports; the page
 * owns localStorage and id generation, these own the list maths so they stay
 * unit-testable.
 */

/** A stored turn as far as the archive cares (structural subset of the page's Message). */
export interface ArchivedMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface Conversation<M extends ArchivedMessage = ArchivedMessage> {
  id: string;
  title: string;
  messages: M[];
  /** Epoch millis of the last settled turn; drives newest-first ordering. */
  updatedAt: number;
}

/** Default cap on how many conversations the archive keeps. */
export const MAX_CONVERSATIONS = 20;

/**
 * A short title from the first user message (collapsed whitespace, trimmed to
 * `max` chars with an ellipsis). Empty when there is no user turn yet, so the
 * caller can fall back to a localized "untitled" label.
 */
export function conversationTitle(messages: ArchivedMessage[], max = 48): string {
  const first = messages.find((m) => m.role === 'user' && m.text.trim());
  if (!first) return '';
  const text = first.text.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

/**
 * Insert or replace `conv` in `list` (matched by id), then return a new list
 * sorted newest-first and pruned to `max`. Pure — never mutates `list`.
 */
export function upsertConversation<M extends ArchivedMessage>(
  list: Conversation<M>[],
  conv: Conversation<M>,
  max = MAX_CONVERSATIONS,
): Conversation<M>[] {
  const without = list.filter((c) => c.id !== conv.id);
  return [conv, ...without].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, max);
}

/** Drop the conversation with `id` (pure). */
export function removeConversation<M extends ArchivedMessage>(
  list: Conversation<M>[],
  id: string,
): Conversation<M>[] {
  return list.filter((c) => c.id !== id);
}

/**
 * Defensively parse whatever was in localStorage into a clean conversation list:
 * skips malformed entries, coerces fields, and sorts newest-first. Anything
 * unparseable yields an empty list.
 */
export function normalizeConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  const out: Conversation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<Conversation>;
    if (typeof c.id !== 'string' || !Array.isArray(c.messages)) continue;
    const messages = c.messages.filter(
      (m): m is ArchivedMessage =>
        !!m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof (m as ArchivedMessage).text === 'string',
    );
    out.push({
      id: c.id,
      title: typeof c.title === 'string' ? c.title : '',
      messages,
      updatedAt: typeof c.updatedAt === 'number' && c.updatedAt >= 0 ? c.updatedAt : 0,
    });
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}
