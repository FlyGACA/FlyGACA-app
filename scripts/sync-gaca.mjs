/**
 * sync-gaca — ingest official-GACA content into the app's data corpus.
 *
 * This is the app-side half of the content-freshness pipeline. The discovery +
 * extraction half is a set of Nimble agents (one per source in
 * public/data/sources.json: gacar, advisory-circulars, aerodromes, charts,
 * airspace, notam). Those agents emit a normalised `records.json`; this script
 * DIFFS those records against the live indexes under public/data/ and reports
 * what is new / changed / unchanged — and (with --apply, Phase 1+) converts and
 * writes the deltas.
 *
 * PHASE 0 (this file): diff + report only. Default mode is a dry run — it never
 * writes. `--apply` is reserved for the convert/write step landed in Phase 1 and
 * currently aborts with a pointer, so the script is strictly read-only today.
 *
 * Usage:
 *   node scripts/sync-gaca.mjs [--input <path>] [--apply] [--limit N]
 *     --input <path>  records bundle to ingest (default: sync-input/records.json,
 *                     falling back to sync-input/records.sample.json)
 *     --apply         write deltas (Phase 1+; not yet implemented)
 *     --limit N       cap per-section listing in the report (default 25)
 *
 * records.json contract (what the Nimble agents hand off):
 *   { "generated": "YYYY-MM-DD",
 *     "records": [ { "kind": "part"|"ac"|"airport"|"airspace"|"chart",
 *                    "sourceUrl": "...", "revision"?: "...",
 *                    "effectiveDate"?: "YYYY-MM-DD", "contentHash"?: "...",
 *                    "body"?: { "format": "pdf"|"eaip-html", "assetPath": "..." },
 *                    ...kind-specific fields mirroring the target index record },
 *                  ... ] }
 *   A bare top-level array is also accepted.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// --- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const APPLY = flag('--apply');
const LIMIT = Number(opt('--limit', '25')) || 25;

const INPUT_CANDIDATES = [
  opt('--input', null),
  'sync-input/records.json',
  'sync-input/records.sample.json',
].filter(Boolean);
const inputPath = INPUT_CANDIDATES.find((p) => existsSync(join(root, p)));

// --- collection config: one entry per content type the agents produce ------
// `diffKey` is the stable identity; `changeKey` is the provenance fingerprint
// used to tell a re-import of the same item apart from a genuine revision.
const COLLECTIONS = {
  part: {
    label: 'GACAR Parts',
    index: 'public/data/gacar-index.json',
    arrayKey: 'documents',
    diffKey: (r) => r.slug ?? (r.partNum != null ? `part-${r.partNum}` : `part-${r.part}`),
    changeKey: (r) => r.contentHash ?? r.revision ?? r.effectiveDate ?? null,
    describe: (r) => `${r.slug ?? `part-${r.partNum ?? r.part}`} — ${r.title ?? ''}`.trim(),
  },
  ac: {
    label: 'Advisory Circulars',
    index: 'public/data/reference-index.json',
    arrayKey: 'documents',
    diffKey: (r) => r.slug,
    changeKey: (r) => r.contentHash ?? r.revision ?? r.effectiveDate ?? r.date ?? null,
    describe: (r) => `${r.slug} — ${r.title ?? ''}`.trim(),
  },
  airport: {
    label: 'Aerodromes (AIP AD 2)',
    index: 'public/data/airports.json',
    arrayKey: 'airports',
    diffKey: (r) => r.icao,
    changeKey: (r) => r.contentHash ?? r.effectiveDate ?? r.airac ?? null,
    describe: (r) => `${r.icao} — ${r.name_en ?? ''}`.trim(),
  },
  airspace: {
    label: 'Airspaces (AIP ENR 2)',
    index: 'public/data/airspaces-index.json',
    arrayKey: 'airspaces',
    diffKey: (r) => r.id,
    changeKey: (r) => r.contentHash ?? r.effectiveDate ?? r.airac ?? null,
    describe: (r) => `${r.id} — ${r.name ?? ''}`.trim(),
  },
  chart: {
    label: 'Visual charts (AIP)',
    index: 'public/data/charts-index.json',
    arrayKey: 'documents',
    diffKey: (r) => r.slug,
    changeKey: (r) => r.date ?? r.airacDate ?? r.effectiveDate ?? r.contentHash ?? null,
    describe: (r) => `${r.slug} — ${r.label ?? ''}`.trim(),
  },
};

// --- load + normalise input ------------------------------------------------
if (!inputPath) {
  console.error(
    'sync-gaca: no records bundle found. Looked for:\n  ' +
      INPUT_CANDIDATES.map((p) => `- ${p}`).join('\n  ') +
      '\nProvide one with --input <path> (see the records.json contract in this file).',
  );
  process.exit(1);
}

const bundle = readJson(inputPath);
const records = Array.isArray(bundle) ? bundle : (bundle.records ?? []);

const byKind = new Map();
const skipped = [];
for (const r of records) {
  if (!r || !COLLECTIONS[r.kind]) {
    skipped.push(r);
    continue;
  }
  if (!COLLECTIONS[r.kind].diffKey(r)) {
    skipped.push(r);
    continue;
  }
  if (!byKind.has(r.kind)) byKind.set(r.kind, []);
  byKind.get(r.kind).push(r);
}

// --- diff each kind against its live index ---------------------------------
function diff(kind, incoming) {
  const cfg = COLLECTIONS[kind];
  const idx = readJson(cfg.index);
  const existing = new Map();
  for (const rec of idx[cfg.arrayKey] ?? []) existing.set(cfg.diffKey(rec), rec);

  const out = { new: [], changed: [], unchanged: [], baseline: existing.size };
  for (const r of incoming) {
    const key = cfg.diffKey(r);
    if (!existing.has(key)) {
      out.new.push(r);
      continue;
    }
    const cur = existing.get(key);
    const curKey = cfg.changeKey(cur);
    const inKey = cfg.changeKey(r);
    // Only call it "changed" when BOTH sides carry a provenance fingerprint and
    // they differ. Absent provenance on the existing record (the common first-
    // run case) is treated as unchanged so we never spuriously re-import.
    if (curKey != null && inKey != null && curKey !== inKey) out.changed.push(r);
    else out.unchanged.push(r);
  }
  return { cfg, ...out };
}

// --- report ----------------------------------------------------------------
const mode = APPLY ? 'APPLY' : 'DRY RUN';
console.log(`\nsync-gaca — ${mode}`);
console.log(`input: ${inputPath}  (${records.length} records, ${byKind.size} kinds)\n`);

let totalNew = 0;
let totalChanged = 0;
const plan = [];

for (const kind of Object.keys(COLLECTIONS)) {
  const incoming = byKind.get(kind);
  if (!incoming || incoming.length === 0) continue;
  const d = diff(kind, incoming);
  plan.push({ kind, d });
  totalNew += d.new.length;
  totalChanged += d.changed.length;

  console.log(
    `■ ${d.cfg.label}  [index has ${d.baseline}]  ` +
      `→ ${d.new.length} new · ${d.changed.length} changed · ${d.unchanged.length} unchanged`,
  );
  const show = (title, list) => {
    if (!list.length) return;
    console.log(`    ${title}:`);
    for (const r of list.slice(0, LIMIT)) console.log(`      + ${d.cfg.describe(r)}`);
    if (list.length > LIMIT) console.log(`      … and ${list.length - LIMIT} more (raise --limit)`);
  };
  show('new', d.new);
  show('changed', d.changed);
  console.log('');
}

if (skipped.length) {
  console.log(`⚠ skipped ${skipped.length} record(s) with unknown kind or missing id.\n`);
}

console.log(`Σ ${totalNew} new + ${totalChanged} changed across ${plan.length} content type(s).`);

if (APPLY) {
  console.error(
    '\nsync-gaca: --apply (convert + write) is not implemented yet — that lands in ' +
      'Phase 1 (PDF/eAIP → sanitized HTML, index patch, search/related/sitemap rebuild). ' +
      'Re-run without --apply for the dry-run diff.',
  );
  process.exit(2);
}

console.log('\nDry run only — nothing written. Re-run with --apply once Phase 1 lands.\n');
