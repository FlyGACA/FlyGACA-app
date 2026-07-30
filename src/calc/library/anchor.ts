/**
 * Stable DOM ids for document section headings — the shared anchor scheme behind
 * the guides' and legal pages' "on this page" table of contents and copy-link
 * affordances. Pure (no DOM), so it stays unit-testable.
 */

/** Stable DOM id for a section heading at `index` (e.g. `sec-2-fuel-reserves`). */
export function sectionId(index: number, heading: string): string {
  const base = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `sec-${index}-${base || 'section'}`;
}
