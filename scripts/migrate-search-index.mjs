/**
 * migrate-search-index — rewrite the committed corpus indexes from the legacy
 * `document.html?type=…&id=…#…` URL shape to semantic `kind`/`id`/`anchor`
 * fields, so routing lives in the frontend rather than the data (see
 * src/lib/content.ts · searchHref/toSearchRef). Two files:
 *
 *   • public/data/library-search.json — entry `u` → `{ kind, id, anchor? }`
 *   • public/data/definitions-index.json — drop the dead `url` (unused by the UI)
 *
 * Idempotent and lossless: already-migrated entries are left untouched, and any
 * entry whose `u` can't be parsed keeps its original `u` (and is reported) so no
 * hit is silently dropped. Re-run after a legacy corpus sync until the upstream
 * builders emit the semantic shape natively.
 *
 *   node scripts/migrate-search-index.mjs [--dry]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/** Legacy `type=` token → corpus kind (mirrors src/lib/content.ts). */
const TYPE_TO_KIND = { regulations: 'regulations', reference: 'reference', handbooks: 'handbook' };

/** Parse a legacy `document.html?type=…&id=…#…` URL into `{ kind, id, anchor? }`. */
function parseUrl(u) {
  const type = /[?&]type=([^&#]+)/.exec(u)?.[1];
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  const kind = type ? TYPE_TO_KIND[type] : undefined;
  if (!id || !kind) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return anchor ? { kind, id, anchor } : { kind, id };
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;

async function migrateLibrarySearch() {
  const path = resolve(ROOT, 'public/data/library-search.json');
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw);
  let migrated = 0;
  let already = 0;
  let skipped = 0;

  data.entries = data.entries.map((e) => {
    if (e.u == null) {
      already++;
      return e; // already semantic
    }
    const ref = parseUrl(e.u);
    if (!ref) {
      skipped++;
      return e; // keep legacy `u` rather than lose the hit
    }
    migrated++;
    const { u: _drop, ...rest } = e;
    return { ...rest, ...ref };
  });

  const out = JSON.stringify(data);
  if (!DRY) await writeFile(path, out, 'utf8');
  console.log(
    `library-search.json: ${migrated} migrated, ${already} already semantic, ` +
      `${skipped} unparsable (kept as-is) · ${kb(raw.length)} → ${kb(out.length)}` +
      (DRY ? ' [dry-run, not written]' : ''),
  );
}

async function migrateDefinitions() {
  const path = resolve(ROOT, 'public/data/definitions-index.json');
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw);
  let stripped = 0;

  data.terms = data.terms.map((t) => {
    if (!('url' in t)) return t;
    stripped++;
    const { url: _drop, ...rest } = t;
    return rest;
  });

  const out = JSON.stringify(data);
  if (!DRY) await writeFile(path, out, 'utf8');
  console.log(
    `definitions-index.json: ${stripped} dead \`url\` fields dropped · ` +
      `${kb(raw.length)} → ${kb(out.length)}` +
      (DRY ? ' [dry-run, not written]' : ''),
  );
}

await migrateLibrarySearch();
await migrateDefinitions();
