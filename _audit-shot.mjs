// Audit screenshotter — robust against sandboxed network (external CDN hangs).
// Blocks cross-origin requests, waits for SPA #root to mount, full-page shot.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = process.env.SHOTS_DIR ?? '/tmp/shots';
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
mkdirSync(OUT, { recursive: true });

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '-'));

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
// Block anything not localhost so the page can settle.
await ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
  return route.abort();
});

let failed = 0;
for (const r of routes) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  try {
    await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#root');
        return el && el.textContent && el.textContent.trim().length > 0;
      },
      { timeout: 20000 },
    );
    await page.waitForTimeout(600); // let entry animations settle
    const title = await page.title();
    const file = `${OUT}/${slug(r)}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`OK  ${r}  "${title}"  -> ${file}${errs.length ? `  [${errs.length} pageerror]` : ''}`);
    if (errs.length) errs.forEach((e) => console.log(`    ! ${e}`));
  } catch (e) {
    failed++;
    console.log(`FAIL ${r}  ${String(e).split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
