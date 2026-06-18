#!/usr/bin/env node
// Run-skill driver for the Fly GACA frontend (Vite + React SPA).
//
// `chromium-cli` is not available in this environment, so this drives the
// running app with Playwright's bundled chromium instead. It navigates one or
// more routes, waits for the SPA to mount, writes a screenshot per route, and
// reports console / page errors.
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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

let failures = 0;
for (const route of routes) {
  const consoleErrors = [];
  const pageErrors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const url = BASE_URL + route;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for the SPA to actually mount content into #root.
    await page.waitForFunction(
      () => {
        const r = document.querySelector('#root');
        return r && r.children.length > 0;
      },
      { timeout: 30000 },
    );
  } catch (e) {
    console.error(`✗ ${route}  FAILED: ${String(e.message).split('\n')[0]}`);
    failures++;
    continue;
  }

  const title = await page.title();
  const shot = join(SHOTS, `${slug(route)}.png`);
  await page.screenshot({ path: shot, fullPage: true });

  let status = `✓ ${route}  "${title}"  → ${shot}`;
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
}

await browser.close();
process.exit(failures ? 1 : 0);
