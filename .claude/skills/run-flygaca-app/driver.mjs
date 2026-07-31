#!/usr/bin/env node
// Run-skill driver for the Fly GACA frontend (Vite + React SPA).
//
// `chromium-cli` is not available in this environment, so this drives the
// running app with Playwright's chromium instead. Two modes:
//
//   node driver.mjs [route ...]        screenshot + error-check each route
//   node driver.mjs --flow <name>      drive a real user flow end-to-end
//
// Screenshot mode runs each route in its own browser context: a few library
// documents render enormous DOMs (a full GACAR Part is ~13k nodes / ~500 KB of
// text), and reusing one long-lived page lets that weight degrade — and
// eventually hang — later navigations. A fresh context per route keeps them
// independent. Screenshotting is best-effort and never aborts the run: a
// full-page shot of a giant document can exceed the timeout, so we fall back to
// a clipped top-of-page shot, and finally to skipping the image (the DOM is
// still verified). A route only "fails" if it cannot navigate/mount or throws a
// page error.
//
// Flow mode is the one that proves the app actually *works* rather than merely
// renders: it types into real inputs and asserts the recomputed output, so a
// broken calculator, a broken URL-state hook, or a dead i18n key all fail loudly.
//
// Examples:
//   node driver.mjs / /tools /library
//   BASE_URL=http://localhost:4173 node driver.mjs --flow crosswind
//
// Screenshots → $SHOTS_DIR (default /tmp/shots) as <slug>.png
// Exit code   → non-zero if any route/assertion fails.

import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const SHOTS = process.env.SHOTS_DIR ?? '/tmp/shots';

// Resolve a chromium binary. Playwright normally finds its own download, and
// when it can that is the best answer — but two environments break that:
//   * containers where browser downloads are blocked and a chromium is
//     pre-staged under PLAYWRIGHT_BROWSERS_PATH at a revision Playwright's
//     own lookup rejects;
//   * any host where the installed Playwright expects a newer revision than
//     the cached one.
// In both cases an explicit executablePath bypasses the revision check, which
// is fine for navigate/screenshot/click work. Returning `undefined` lets
// Playwright resolve normally — the healthy path.
function resolveChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/pw-browsers',
    join(homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS
    join(homedir(), '.cache', 'ms-playwright'), // Linux
  ].filter(Boolean);
  // Per-platform layout inside a chromium-<rev> directory.
  const rel = [
    ['chrome-linux', 'chrome'],
    ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
    ['chrome-win', 'chrome.exe'],
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const dirs = readdirSync(root)
      .filter((d) => /^chromium-\d/.test(d))
      .sort();
    for (const dir of dirs) {
      for (const parts of rel) {
        const p = join(root, dir, ...parts);
        if (existsSync(p)) return p;
      }
    }
  }
  return undefined; // let Playwright resolve its own download
}

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\/+/, '').replace(/[^\w.-]+/g, '-') || 'home');

/** Wait for the SPA shell to mount and the lazy route chunk to paint. */
async function waitForApp(page) {
  await page.waitForFunction(
    () => {
      const r = document.querySelector('#root');
      return r && r.children.length > 0;
    },
    { timeout: 30000 },
  );
  try {
    // An <h1> is the universal "real content rendered" signal across these
    // pages. Auth-gated pages render a sign-in prompt with no <h1>; expected.
    await page.waitForSelector('h1', { timeout: 10000 });
    return '';
  } catch {
    return '  (no <h1> — shell/gate)';
  }
}

/**
 * Read a calculator output by its label. Results render as <dt>label</dt>
 * <dd><bdi>value</bdi><span>sub</span></dd> inside an <dl> (see ResultStat).
 */
async function readStat(page, label) {
  const dd = page.locator('dt', { hasText: label }).first().locator('xpath=following-sibling::dd[1]');
  return (await dd.locator('bdi').first().innerText()).trim();
}

// ---------------------------------------------------------------------------
// Flows — real user journeys. Each returns a list of {name, got, want} checks.
// ---------------------------------------------------------------------------

const flows = {
  /**
   * Crosswind is the reference calculator every other tool follows. Typing
   * runway 34 / wind 290° / 18 kt must resolve to a 340° heading, 13.8 kt of
   * crosswind from the left, 11.6 kt of headwind, at a 50° wind angle — and
   * because calculator state rides the URL, the querystring must pick the
   * inputs up too (that is the useNumericInputs contract, `nums.<key>`).
   */
  async crosswind(page) {
    await page.goto(`${BASE_URL}/tools/crosswind`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitForApp(page);

    await page.getByLabel('Runway (designator or heading)').fill('34');
    await page.getByLabel('Wind direction (°true)').fill('290');
    await page.getByLabel('Wind speed (kt)').fill('18');

    // The outputs recompute synchronously on change; wait for the headline
    // stat to leave its em-dash placeholder rather than racing it.
    await page.waitForFunction(
      () => !document.body.innerText.includes('—\n') || /\d\.\d kt/.test(document.body.innerText),
      { timeout: 10000 },
    );

    const checks = [
      { name: 'runway heading', got: await readStat(page, 'Runway heading'), want: '340°' },
      { name: 'crosswind', got: await readStat(page, 'Crosswind'), want: '13.8 kt' },
      { name: 'headwind', got: await readStat(page, 'Headwind'), want: '11.6 kt' },
      { name: 'wind angle', got: await readStat(page, 'Wind angle'), want: '50°' },
    ];

    // Inputs ride the URL so a setup is shareable. useUrlState writes the raw
    // input keys (`?rwy=34&wdir=290&wspd=18`) — `nums.<key>` is the hook's
    // parsed-number accessor, NOT the query-param name. Assert the state
    // actually landed in the URL, not just in React state...
    const url = page.url();
    checks.push({
      name: 'inputs in URL',
      got: /[?&]rwy=34/.test(url) && /[&]wspd=18/.test(url) ? 'yes' : `no (${url})`,
      want: 'yes',
    });

    // ...then prove the round-trip: a cold load of that URL must rebuild the
    // same answer. This is what "shareable setup" actually promises.
    await page.goto(`${BASE_URL}/tools/crosswind?rwy=34&wdir=290&wspd=18`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitForApp(page);
    checks.push({
      name: 'crosswind restored from URL',
      got: await readStat(page, 'Crosswind'),
      want: '13.8 kt',
    });

    // The not-affiliated disclaimer is load-bearing product copy — it must be
    // on every calculator page.
    const body = await page.locator('body').innerText();
    checks.push({
      name: 'disclaimer present',
      got: body.includes('not affiliated') || body.includes('Not affiliated') ? 'yes' : 'no',
      want: 'yes',
    });

    return checks;
  },

  /**
   * Language toggle → the whole document must flip to Arabic and RTL. This is
   * the one cross-cutting behaviour that a screenshot alone will not catch.
   */
  async rtl(page) {
    await page.goto(`${BASE_URL}/tools/crosswind`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitForApp(page);

    const before = await page.evaluate(() => document.documentElement.dir || 'ltr');
    // LangToggle renders the *other* language's glyph ("ع") as its text but
    // carries aria-label="Switch language" — and aria-label wins for the
    // accessible name, so matching on the glyph never resolves. There are two
    // toggles (header + footer); either works, take the first.
    await page.getByRole('button', { name: 'Switch language' }).first().click();
    await page.waitForFunction(() => document.documentElement.dir === 'rtl', { timeout: 10000 });

    return [
      { name: 'dir before toggle', got: before, want: 'ltr' },
      {
        name: 'dir after toggle',
        got: await page.evaluate(() => document.documentElement.dir),
        want: 'rtl',
      },
      {
        name: 'lang after toggle',
        got: await page.evaluate(() => document.documentElement.lang),
        want: 'ar',
      },
    ];
  },
};

// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flowIdx = argv.findIndex((a) => a === '--flow');
const flowName = flowIdx >= 0 ? argv[flowIdx + 1] : null;
const routes = argv.filter((a, i) => i !== flowIdx && i !== flowIdx + 1);

mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: resolveChrome(),
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

let failures = 0;

if (flowName) {
  const flow = flows[flowName];
  if (!flow) {
    console.error(`✗ unknown flow "${flowName}". Available: ${Object.keys(flows).join(', ')}`);
    await browser.close();
    process.exit(2);
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  try {
    const checks = await flow(page);
    console.log(`flow: ${flowName}`);
    for (const c of checks) {
      const ok = c.got === c.want;
      if (!ok) failures++;
      console.log(`  ${ok ? '✓' : '✗'} ${c.name}: ${c.got}${ok ? '' : `  (expected ${c.want})`}`);
    }
    const shot = join(SHOTS, `flow-${flowName}.png`);
    await page
      .screenshot({ path: shot, fullPage: true, timeout: 12000, animations: 'disabled' })
      .then(() => console.log(`  → ${shot}`))
      .catch(() => console.log('  (screenshot skipped)'));
  } catch (e) {
    console.error(`✗ flow ${flowName} threw: ${String(e.message).split('\n')[0]}`);
    failures++;
  }
  if (pageErrors.length) {
    console.error(`  ✗ ${pageErrors.length} page error(s): ${pageErrors[0]}`);
    failures++;
  }
  await context.close();
} else {
  for (const route of routes.length ? routes : ['/']) {
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
      // `domcontentloaded` (not `networkidle`): external CDN/analytics requests
      // may never settle, so the network never goes fully idle.
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      renderNote = await waitForApp(page);
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
}

await browser.close();
process.exit(failures ? 1 : 0);
