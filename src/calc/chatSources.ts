/**
 * Pure helpers for turning Captain Adel's cited sources into Library links and a
 * conversation-wide digest. No DOM imports so it stays unit-testable; the page
 * passes in the set of valid GACAR Part slugs (from `gacar-index.json`).
 */

/** The citation fields a source can carry (structural subset of `ChatSource`). */
export interface SourceLike {
  citation?: string;
  part?: string;
  section?: string;
  url?: string;
}

/** A message as far as the source helpers care: an assistant turn with sources. */
export interface SourcedMessage {
  role: 'user' | 'assistant';
  sources?: SourceLike[];
}

/**
 * The leading Part number from any of the candidate citation fields, as a Library
 * slug (`part-<n>`) — but only if that slug exists in `valid`. Returns null when
 * no candidate names a known Part.
 */
export function partSlug(valid: Set<string>, ...candidates: (string | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const m = /(\d+)/.exec(c);
    if (!m) continue;
    const slug = `part-${m[1]}`;
    if (valid.has(slug)) return slug;
  }
  return null;
}

export interface DigestPart {
  /** Library slug, e.g. `part-61`. */
  slug: string;
  /** Part number as a string, e.g. `61`. */
  num: string;
  /** How many citations across the conversation resolved to this Part. */
  count: number;
}

/**
 * The unique GACAR Parts cited across every assistant turn, busiest first. Only
 * Parts that resolve to a known Library slug are included, so every chip links.
 */
export function conversationParts(messages: SourcedMessage[], valid: Set<string>): DigestPart[] {
  const by = new Map<string, DigestPart>();
  for (const m of messages) {
    if (m.role !== 'assistant' || !m.sources) continue;
    for (const s of m.sources) {
      const slug = partSlug(valid, s.part, s.section, s.citation);
      if (!slug) continue;
      const existing = by.get(slug);
      if (existing) existing.count += 1;
      else by.set(slug, { slug, num: slug.replace('part-', ''), count: 1 });
    }
  }
  // Busiest first; ties broken by ascending Part number for a stable order.
  return [...by.values()].sort((a, b) => b.count - a.count || Number(a.num) - Number(b.num));
}
