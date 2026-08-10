/**
 * Bundle per-app content folders (<App>/Content) for the native iOS app family.
 *
 * The native apps live in ay2m/FlyGACA; this repo stays the source of truth for
 * their CONTENT (the corpus + src/lib/prepCatalog.ts) and generates it here. Each
 * App Store app is one prep pack shipped as its own product, so every app bundles
 * ONLY its module's slice of the shared corpus: quiz banks, ground-school modules
 * and reading paths are filtered by the pack's id lists but the records themselves
 * are copied VERBATIM — the iOS decoders (FlyGACAKit CoreModels) read the exact
 * same schema as the web app, so the corpus can never fork. A `module.json`
 * manifest (the pack serialized, web field names kept) tells the shell which module.
 *
 *   node scripts/build-ios-content.mjs                 # every app (elpt, aip) → scratch
 *   node scripts/build-ios-content.mjs --app elpt      # one app
 *   node scripts/build-ios-content.mjs --out <appsDir> # write into ay2m/FlyGACA's apple/Apps
 *   npm run build:apps-content                         # same, as the CI-gated npm script
 *
 * Output dir: --out <appsDir> or $FG_APPLE_APPS_DIR; defaults to the gitignored
 * .ios-build/Apps scratch dir (there is no local apple/ tree in this repo anymore —
 * the iOS repo's sync-content.sh passes its own apple/Apps).
 *
 * Validates every emitted bank (answer index in range, non-empty prompt/explain)
 * and exits non-zero on any inconsistency so CI can gate on it.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// Where the per-app <dir>/Content folders are written. The native apps live in
// ay2m/FlyGACA now (this repo generates their content, it doesn't build them), so
// there is no local apple/ tree to write into. Default to a gitignored scratch dir
// for local/CI validation; the iOS repo's sync-content.sh passes its own apple/Apps
// via --out (or FG_APPLE_APPS_DIR) to have content written straight into it.
const outArgIdx = process.argv.indexOf('--out');
const appsDir =
  outArgIdx !== -1
    ? process.argv[outArgIdx + 1]
    : process.env.FG_APPLE_APPS_DIR || join(root, '.ios-build', 'Apps');

// App Store product → prep-pack id. Directory name is the Xcode target name.
// The licence-exam apps (ppl/cpl/ir/atpl) are PAUSED — removed 2026-08-10, see
// docs/APPS-FAMILY-ROADMAP.md. Their PACKS entries stay live for the web; only the
// native apps stopped. Future packs (foi/agi/dispatcher…) join here as content lands.
const APPS = {
  elpt: { dir: 'ELPT', packId: 'elp' },
  aip: { dir: 'AIP', packId: 'aip' },
};

// The PACKS array literal is plain data (no TS syntax inside), so evaluate it
// directly instead of duplicating the catalog here — prepCatalog.ts stays the
// single source of truth (same spirit as build-sitemap.mjs's textual read).
const packSrc = read('src/lib/prepCatalog.ts');
const literal = packSrc.match(/export const PACKS: Pack\[\] = (\[[\s\S]*?\n\]);/)?.[1];
if (!literal) throw new Error('build-ios-content: could not locate PACKS in src/lib/prepCatalog.ts');
const PACKS = new Function(`return ${literal}`)();

const quiz = readJson('public/data/quiz.json');
const groundschool = readJson('public/data/groundschool.json');
const pathsIndex = readJson('public/data/paths-index.json');

const bankById = new Map(quiz.banks.map((b) => [b.id, b]));
const gsById = new Map(groundschool.modules.map((m) => [m.id, m]));
const pathById = new Map(pathsIndex.paths.map((p) => [p.id, p]));

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`✗ ${msg}`);
};

function validateBank(bank) {
  bank.questions.forEach((q, i) => {
    const at = `${bank.id}[${i}]`;
    if (!q.q?.trim()) fail(`${at}: empty question`);
    if (!Array.isArray(q.options) || q.options.length < 2) fail(`${at}: needs ≥2 options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
      fail(`${at}: answer index ${q.answer} out of range`);
    if (!q.explain?.trim()) fail(`${at}: empty explanation`);
  });
}

function pick(ids, map, kind, appId) {
  return (ids ?? []).map((id) => {
    const item = map.get(id);
    if (!item) fail(`${appId}: unknown ${kind} id '${id}'`);
    return item;
  });
}

function emit(appId) {
  const app = APPS[appId];
  const pack = PACKS.find((p) => p.id === app.packId);
  if (!pack) return fail(`${appId}: pack '${app.packId}' not found in prepCatalog.ts`);
  if (pack.status !== 'live') return fail(`${appId}: pack '${pack.id}' is not live yet`);

  const banks = pick(pack.bankIds, bankById, 'bank', appId);
  banks.forEach(validateBank);
  const gsModules = pick(pack.moduleIds, gsById, 'ground-school module', appId);
  const paths = pick(pack.pathIds, pathById, 'path', appId);

  const out = join(appsDir, app.dir, 'Content');
  mkdirSync(out, { recursive: true });
  const write = (name, data) => writeFileSync(join(out, name), `${JSON.stringify(data, null, 1)}\n`);

  write('module.json', { contentVersion: quiz.generated, module: pack });
  write('quiz.json', { generated: quiz.generated, note: quiz.note, exam: quiz.exam, banks });
  if (gsModules.length)
    write('groundschool.json', { ...groundschool, modules: gsModules });
  if (paths.length) write('paths-index.json', { ...pathsIndex, paths });

  const nq = banks.reduce((n, b) => n + b.questions.length, 0);
  console.log(
    `✓ ${app.dir}: ${banks.length} banks / ${nq} questions, ${gsModules.length} gs modules, ${paths.length} paths → ${join(appsDir, app.dir, 'Content')}`
  );
}

const only = process.argv.includes('--app')
  ? [process.argv[process.argv.indexOf('--app') + 1]]
  : Object.keys(APPS);
for (const id of only) {
  if (!APPS[id]) fail(`unknown app '${id}' (known: ${Object.keys(APPS).join(', ')})`);
  else emit(id);
}
process.exit(failed ? 1 : 0);
