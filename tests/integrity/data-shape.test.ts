import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the corpus's semantic shape (see src/lib/contentLinks.ts · toSearchRef /
 * linkHref and scripts/normalize-corpus-data.mjs). Frontend links must be
 * semantic — corpus `{ kind, id, anchor }` pointers or `{ route }` app paths —
 * never a legacy `document.html?type=…&id=…#…` URL. If an upstream sync
 * re-introduces the legacy shape in a migrated file, this fails — run
 * `npm run data:normalize` to heal it (and land the builder patch upstream so it
 * stops recurring).
 *
 * Any file under public/data carrying a `document.html?` URL fails. The
 * allow-list is self-checking: a file that no longer needs its exemption must be
 * removed from it (otherwise the "still needs exemption" test fails).
 *
 * It is empty today. `rag-chunks.json` used to be the one exemption — it keeps
 * legacy `u` values on purpose as the backend BM25 contract — but it is a
 * retriever input rather than a web asset and now lives at `data/` outside
 * `public/`, so it is out of this scan's scope entirely. See the separate
 * relocation guard below.
 */
const LEGACY_URL_ALLOWED = new Map<string, string>();

const DATA_DIR = join(process.cwd(), 'public/data');
const read = (name: string) => readFileSync(join(DATA_DIR, name), 'utf8');
const jsonFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

// These checks synchronously scan the full corpus (~130 MB of JSON), which can
// exceed the default 5 s per-test timeout under parallel-worker I/O contention.
describe('corpus data shape', { timeout: 30_000 }, () => {
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

  it('curated content links are semantic (no legacy url/citeUrl fields)', () => {
    const paths = JSON.parse(read('paths-index.json')) as {
      paths: Array<{ steps: Array<{ url?: string; kind?: string; route?: string }> }>;
    };
    const steps = paths.paths.flatMap((p) => p.steps);
    expect(
      steps.some((s) => 'url' in s),
      'paths-index has legacy step.url',
    ).toBe(false);
    expect(steps.every((s) => s.kind != null || s.route != null)).toBe(true);

    const gs = JSON.parse(read('groundschool.json')) as {
      modules: Array<{ lessons: Array<{ read?: { url?: string } }> }>;
    };
    const reads = gs.modules.flatMap((m) => m.lessons.map((l) => l.read).filter(Boolean));
    expect(
      reads.some((r) => r && 'url' in r),
      'groundschool has legacy read.url',
    ).toBe(false);

    const quiz = JSON.parse(read('quiz.json')) as {
      banks: Array<{ questions: Array<{ citeUrl?: string; cite?: unknown; citeRef?: unknown }> }>;
    };
    const qs = quiz.banks.flatMap((b) => b.questions);
    expect(
      qs.some((q) => 'citeUrl' in q),
      'quiz has legacy citeUrl',
    ).toBe(false);
    // `cite` is the human-readable label; the semantic link lives in `citeRef`.
    // Guards against a migration clobbering the label with a ref object.
    expect(qs.every((q) => q.cite === undefined || typeof q.cite === 'string')).toBe(true);
  });
  /**
   * rag-chunks.json is a backend retriever input, not a web asset: no client code
   * reads it, and the gateway's CORPUS_URL points at library-search.json. Serving
   * it from Hosting and mirroring it into the public data bucket cost 14 MB raw /
   * 1.7 MB gz for nothing, so it lives at `data/` outside `public/`. This pins
   * that split — and pins the legacy `u` field it keeps on purpose, which is the
   * shape functions/src/corpus.ts ingests.
   */
  it('rag-chunks.json stays out of public/ and keeps its backend `u` contract', () => {
    expect(
      jsonFiles.includes('rag-chunks.json'),
      'rag-chunks.json is a backend input — it must not be served from public/data',
    ).toBe(false);
    const backendPath = join(process.cwd(), 'data/rag-chunks.json');
    expect(existsSync(backendPath), 'expected data/rag-chunks.json').toBe(true);
    const idx = JSON.parse(readFileSync(backendPath, 'utf8')) as {
      entries: Array<{ u?: string; x?: string }>;
    };
    expect(idx.entries.length).toBeGreaterThan(0);
    expect(idx.entries.every((e) => typeof e.u === 'string')).toBe(true);
  });
});
