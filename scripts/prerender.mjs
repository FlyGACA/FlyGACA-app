/**
 * Static prerender: boots `vite preview` over the built dist/, drives Playwright's
 * Chromium to each route, waits for the real app to render, and writes the
 * rendered HTML to dist/<route>/index.html. Hosts then serve that snapshot
 * (content + per-route meta/canonical/hreflang/JSON-LD paint at CSS-load time,
 * no JS) and the bundle still hydrates over it for interactivity.
 *
 * This is the OPTIONAL full-body enhancement layer that overwrites the head-only
 * snapshots from scripts/prerender-head.mjs (which `npm run build` always runs)
 * with hydrated HTML, on hosts that have a browser — the Vercel buildCommand and
 * `npm run deploy`. It is **non-fatal**: any failure (Chromium missing and
 * un-installable, a route timing out) logs a warning and exits 0, leaving the
 * head-prerendered HTML in place, so it can never break a deploy. It is NOT in
 * `npm run build` on purpose — Firebase App Hosting's buildpack can't run
 * headless Chromium, and the e2e webServer build must not wait on it. Set
 * SKIP_PRERENDER=1 to opt out explicitly.
 *
 * Route set mirrors scripts/build-sitemap.mjs: static router paths + guide slugs
 * (always), plus the dynamic library reader corpus (GACAR parts / reference /
 * handbook) up to PRERENDER_MAX snapshots (default 500; 0 = the whole corpus).
 * Any coverage gap (cap trim, failed route, whole-run skip) is still non-fatal
 * but warns loudly — as a GitHub Actions annotation in CI — so corpus growth
 * can never silently outrun the cap.
 */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { get } from 'node:http';

if (process.env.SKIP_PRERENDER) {
  console.log('prerender: skipped (SKIP_PRERENDER set)');
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PRERENDER_PORT ?? 4181);
const BASE = `http://localhost:${PORT}`;

const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// Loud but non-fatal: warn on stderr, and in CI also emit a GitHub Actions
// annotation so coverage gaps show on the run summary, not just the step log.
function warn(msg) {
  console.warn(`prerender: ${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=prerender::${msg}`);
}

// --- Route list (same source of truth as the sitemap) --------------------------
const PRIVATE = new Set([
  '/account',
  '/dashboard',
  '/currency',
  '/logbook',
  '/records',
  '/settings',
]);
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
const guideSlugs = [
  ...read('src/pages/guides/guides.ts')
    .match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1]
    .matchAll(/'([^']+)'/g),
].map((m) => m[1]);

// High-value, finite landing routes — always prerendered.
const baseRoutes = new Set(['/']);
for (const p of routerPaths) {
  if (p.includes(':') || p === '*') continue; // skip dynamic + catch-all
  const norm = p === '/' ? '/' : `/${p.replace(/^\//, '')}`;
  if (!PRIVATE.has(norm)) baseRoutes.add(norm);
}
for (const slug of guideSlugs) baseRoutes.add(`/guides/${slug}`);

// The dynamic reader corpus, enumerated from the same indexes the sitemap uses.
// Ordered parts → reference → handbook so the highest-value docs win the budget.
const corpus = [];
for (const [seg, file] of [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
]) {
  for (const d of readJson(file).documents) corpus.push(`${seg}/${d.slug}`);
}

// Cap total snapshots so the build stays bounded; base routes are never dropped,
// the cap only trims the corpus tail (which the sitemap + head snapshots still
// cover). A trim warns loudly (annotated in CI) — when it fires, raise
// PRERENDER_MAX or set it to 0 to prerender the whole corpus.
const MAX = Number(process.env.PRERENDER_MAX ?? 500);
const baseList = [...baseRoutes];
const budget = MAX === 0 ? corpus.length : Math.max(0, MAX - baseList.length);
const corpusIncluded = corpus.slice(0, budget);
const skipped = corpus.length - corpusIncluded.length;
if (skipped > 0) {
  const dropped = corpus.slice(budget, budget + 5).join(', ');
  warn(
    `corpus capped at PRERENDER_MAX=${MAX} — ${corpusIncluded.length}/${corpus.length} reader pages prerendered; ${skipped} dropped to head-only HTML (${dropped}${skipped > 5 ? ', …' : ''}). Raise PRERENDER_MAX or set 0 for the whole corpus.`,
  );
}
const routeList = [...new Set([...baseList, ...corpusIncluded])].sort();

// --- Helpers -------------------------------------------------------------------
function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const ping = () => {
      get(`${BASE}/`, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() > deadline) reject(new Error('vite preview did not start'));
        else setTimeout(ping, 250);
      });
    };
    ping();
  });
}

function outPath(route) {
  return route === '/'
    ? join(root, 'dist/index.html')
    : join(root, 'dist', route.replace(/^\//, ''), 'index.html');
}

// Launch Chromium; on a fresh CI image the browser binary may be absent, so try
// a one-off `playwright install chromium` and retry once. A still-failing launch
// throws up to the non-fatal catch, which ships the SPA/shell HTML as before.
async function launchChromium(chromium) {
  try {
    return await chromium.launch();
  } catch (err) {
    console.warn(`prerender: chromium launch failed (${err.message}); installing browser…`);
    await new Promise((resolve) => {
      const inst = spawn('npx', ['playwright', 'install', 'chromium'], { cwd: root, stdio: 'ignore' });
      inst.on('exit', resolve);
      inst.on('error', resolve);
    });
    return chromium.launch();
  }
}

// --- Main (non-fatal) ----------------------------------------------------------
let preview;
let browser;
try {
  const { chromium } = await import('@playwright/test');

  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  await waitForServer();

  browser = await launchChromium(chromium);
  const page = await browser.newPage();
  let done = 0;
  for (const route of routeList) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      // Wait for a real-app element the static shell never contains.
      await page.waitForSelector('footer', { timeout: 15000 });
      const html = `<!doctype html>\n${await page.evaluate(() => document.documentElement.outerHTML)}`;
      const file = outPath(route);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
      done++;
    } catch (err) {
      console.warn(`  prerender: skipped ${route} — ${err.message}`);
    }
  }
  if (done < routeList.length) {
    warn(
      `wrote ${done}/${routeList.length} routes — ${routeList.length - done} failed and kept their head-only HTML`,
    );
  } else {
    console.log(`prerender: wrote ${done}/${routeList.length} routes`);
  }
} catch (err) {
  warn(`skipped (non-fatal) — ${err.message}`);
} finally {
  await browser?.close().catch(() => {});
  preview?.kill();
}

process.exit(0);
