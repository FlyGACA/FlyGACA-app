import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the corpus's semantic shape (see src/lib/content.ts · toSearchRef and
 * scripts/migrate-search-index.mjs). Frontend corpus pointers must be semantic
 * `{ kind, id, anchor }` fields — never the legacy `document.html?type=…&id=…#…`
 * routing URL. If an upstream sync re-introduces the legacy shape in a migrated
 * file, this fails — run `npm run data:normalize` to heal it (and land the
 * builder patch upstream so it stops recurring).
 *
 * A few files legitimately still carry legacy URLs, each for a specific reason.
 * They're allow-listed here; anything else with a `document.html?` URL fails.
 * The allow-list is self-checking: a file that no longer needs the exemption
 * must be removed from it (otherwise the "still needs exemption" test fails).
 */
const LEGACY_URL_ALLOWED = new Map<string, string>([
  ['rag-chunks.json', 'backend BM25 retriever contract (functions/src/corpus.ts) reads `u`'],
  ['paths-index.json', 'heterogeneous step.url (corpus + guides/tools/quiz links) — pending link-model migration'],
  ['groundschool.json', 'heterogeneous read.url (corpus + tools/guides links) — pending link-model migration'],
  ['quiz.json', 'latent citeUrl field — pending migration to a semantic cite ref'],
]);

const DATA_DIR = join(process.cwd(), 'public/data');
const read = (name: string) => readFileSync(join(DATA_DIR, name), 'utf8');
const jsonFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

describe('corpus data shape', () => {
  it('has JSON data files to check', () => {
    expect(jsonFiles.length).toBeGreaterThan(0);
  });

  it('no un-allow-listed file carries a legacy document.html routing URL', () => {
    const offenders = jsonFiles.filter(
      (f) => !LEGACY_URL_ALLOWED.has(f) && read(f).includes('document.html?'),
    );
    expect(offenders, `legacy routing URLs found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('every allow-listed file still needs its exemption', () => {
    const stale = [...LEGACY_URL_ALLOWED.keys()].filter(
      (f) => jsonFiles.includes(f) && !read(f).includes('document.html?'),
    );
    expect(stale, `remove from the allow-list (already clean): ${stale.join(', ')}`).toEqual([]);
  });

  it('library-search entries are semantic (kind + id, no legacy u)', () => {
    const idx = JSON.parse(read('library-search.json')) as {
      entries: Array<{ kind?: string; id?: string; u?: string }>;
    };
    expect(idx.entries.length).toBeGreaterThan(0);
    const bad = idx.entries.filter((e) => e.u != null || !e.kind || !e.id);
    expect(bad.length, `${bad.length} entries still legacy/incomplete`).toBe(0);
  });

  it('definitions index carries no dead url field', () => {
    const idx = JSON.parse(read('definitions-index.json')) as {
      terms: Array<Record<string, unknown>>;
    };
    expect(idx.terms.every((t) => !('url' in t))).toBe(true);
  });
});
