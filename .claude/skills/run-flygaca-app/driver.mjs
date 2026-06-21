#!/usr/bin/env node
// Run-skill driver for the Fly GACA frontend (Vite + React SPA).
//
// `chromium-cli` is not available in this environment, so this drives the
// running app with Playwright's bundled chromium instead. It navigates one or
// more routes, waits for the SPA to render real content, writes a screenshot
// per route, and reports console / page errors.
//
// Each route runs in its own browser context: a few library documents render
// enormous DOMs (a full GACAR Part is ~13k nodes / ~500 KB of text), and
// reusing one long-lived page lets that weight degrade — and eventually hang —
// later navigations. A fresh context per route keeps them independent.
//
// Screenshotting is best-effort and never aborts the run: a full-page shot of a
// giant document can exceed the timeout, so we fall back to a clipped top-of-
// page shot, and finally to skipping the image (the DOM is still verified). The
// route only "fails" if it cannot navigate/mount or throws a page error.
//
// Usage:
//   node driver.mjs [route ...]                 # default route: /
//   BASE_URL=http://localhost:4173 node driver.mjs / /tools /chat
//
// Screenshots → /tmp/shots/<slug>.png
// Exit code   → non-zero if any route fails to load/mount or throws a page error.

import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS_DIR ?? '/tmp/shots';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];

// Browser downloads are blocked in this container, so resolve the pre-installed
// Playwright chromium under PLAYWRIGHT_BROWSERS_PATH and launch it directly
// (its revision won't match what Playwright 1.61 expects, so we bypass the
// revision lookup with an explicit executablePath).
function resolveChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(root)) {
    const dir = readdirSync(root).find((d) => /^chromium-\d/.test(d));
    if (dir) {
      const p = join(root, dir, 'chrome-linux', 'chrome');
      if (existsSync(p)) return p;
    }
  }
  return undefined; // let Playwright resolve its own download if present
}

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\/+/, '').replace(/[^\w.-]+/g, '-') || 'home');

mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: resolveChrome(),
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

let failures = 0;
for (const route of routes) {
  // Fresh context per route so a giant-DOM page can't degrade later navigations.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const url = BASE_URL + route;
  let renderNote = '';
  try {
    // `domcontentloaded` (not `networkidle`): a sandboxed external CDN keeps
    // failing its TLS check, so the network never goes fully idle.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the SPA shell to mount into #root.
    await page.waitForFunction(
      () => {
        const r = document.querySelector('#root');
        return r && r.children.length > 0;
      },
      { timeout: 30000 },
    );
    // Then wait for the lazy route chunk to render real content past the
    // Suspense fallback — an <h1> is the universal signal across these pages.
    // (Auth-gated pages render a sign-in prompt with no <h1>; that's expected.)
    try {
      await page.waitForSelector('h1', { timeout: 10000 });
    } catch {
      renderNote = '  (no <h1> — shell/gate)';
    }
  } catch (e) {
    console.error(`✗ ${route}  FAILED: ${String(e.message).split('\n')[0]}`);
    failures++;
    await context.close();
    continue;
  }

  const title = await page.title();
  const shot = join(SHOTS, `${slug(route)}.png`);
  let shotNote = '';
  try {
    await page.screenshot({ path: shot, fullPage: true, timeout: 12000, animations: 'disabled' });
  } catch {
    try {
      // Giant DOM (e.g. a full GACAR Part) — clip to the top of the page.
      await page.screenshot({
        path: shot,
        clip: { x: 0, y: 0, width: 1280, height: 900 },
        timeout: 12000,
        animations: 'disabled',
      });
      shotNote = ' (clipped — page too tall for full-page shot)';
    } catch {
      shotNote = ' (screenshot skipped — page mounted, DOM verified)';
    }
  }

  let status = `✓ ${route}  "${title}"  → ${shot}${shotNote}${renderNote}`;
  if (pageErrors.length) {
    status += `\n    ✗ ${pageErrors.length} page error(s): ${pageErrors[0]}`;
    failures++;
  }
  if (consoleErrors.length) {
    status += `\n    ⚠ ${consoleErrors.length} console error(s): ${consoleErrors[0]}`;
  } else if (!pageErrors.length) {
    status += `\n    ✓ no console/page errors`;
  }
  console.log(status);
  await context.close();
}

await browser.close();
process.exit(failures ? 1 : 0);
