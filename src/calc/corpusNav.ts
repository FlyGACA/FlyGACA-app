/**
 * Pure navigation helpers for the Library reader: given a corpus's document
 * list (the `documents` array of a {@link CorpusIndex}) and the current slug,
 * compute the previous/next document and a few related ones. No DOM — unit-tested.
 */
import type { CorpusDoc } from '../lib/content';

export interface Neighbours {
  prev: CorpusDoc | null;
  next: CorpusDoc | null;
}

/** The documents immediately before/after `slug` in index order. */
export function docNeighbors(docs: CorpusDoc[], slug: string | undefined): Neighbours {
  const i = docs.findIndex((d) => d.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? docs[i - 1] : null,
    next: i < docs.length - 1 ? docs[i + 1] : null,
  };
}

/** Up to `limit` other documents sharing the current doc's category. */
export function relatedDocs(docs: CorpusDoc[], slug: string | undefined, limit = 3): CorpusDoc[] {
  const current = docs.find((d) => d.slug === slug);
  if (!current) return [];
  return docs.filter((d) => d.slug !== slug && d.category === current.category).slice(0, limit);
}
