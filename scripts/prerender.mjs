/**
 * Post-build static prerender for the high-value, JS-light landing routes. Boots
 * `vite preview` over the built dist/, drives Playwright's Chromium to each route,
 * waits for the real app to render, and writes the rendered HTML to
 * dist/<route>/index.html. Hosts then serve that snapshot (content paints at
 * CSS-load time, no JS) and the bundle still hydrates over it for interactivity.
 *
 * Deliberately NOT part of `npm run build`: it's wired only into the Vercel
 * buildCommand (the host whose preview we can measure), and it is **non-fatal** —
 * any failure (e.g. the Chromium binary isn't installed) logs a warning and exits
 * 0, leaving Vite's own SPA/shell HTML in place. So it can never break a deploy.
 *
 * Route set mirrors scripts/build-sitemap.mjs (router path literals + guide slugs),
 * minus private routes and the heavy library reader corpus.
 */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { get } from 'node:http';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PRERENDER_PORT ?? 4181);
const BASE = `http://localhost:${PORT}`;

const read = (p) => readFileSync(join(root, p), 'utf8');

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

const routes = new Set(['/']);
for (const p of routerPaths) {
  if (p.includes(':') || p === '*') continue; // skip dynamic + catch-all
  const norm = p === '/' ? '/' : `/${p.replace(/^\//, '')}`;
  if (!PRIVATE.has(norm)) routes.add(norm);
}
for (const slug of guideSlugs) routes.add(`/guides/${slug}`);
const routeList = [...routes].sort();

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

  browser = await chromium.launch();
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
  console.log(`prerender: wrote ${done}/${routeList.length} routes`);
} catch (err) {
  console.warn(`prerender: skipped (non-fatal) — ${err.message}`);
} finally {
  await browser?.close().catch(() => {});
  preview?.kill();
}

process.exit(0);
