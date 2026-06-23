#!/usr/bin/env node
/**
 * Renders the social share card → public/img/og-card.png (1200×630), the image
 * behind `og:image` / `twitter:image` (see src/lib/seo.ts). Composes the brand
 * lockup (Falcon palette + Readex Pro) with Captain Adel's portrait, so link
 * previews lead with the mascot.
 *
 * Headless-Chrome composition (no image-editing deps): renders an HTML template
 * at 2× then downsamples with `sips` for crisp text. Re-run after changing copy
 * or the portrait:  node scripts/build-og-card.mjs
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/img/og-card.png');

// Prefer the crisp generated bust; fall back to the committed -256 asset so the
// card still builds from a clean checkout (captain-art/ is gitignored).
const portrait = [
  join(ROOT, 'captain-art/smile.png'),
  join(ROOT, 'public/img/captain/smile-256.png'),
].find(existsSync);
const logo = join(ROOT, 'public/img/flygaca-mark.png');
// Inline as data URIs — setContent() documents can't load file:// subresources.
const dataUri = (p) => (p && existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString('base64')}` : '');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  .card{
    position:relative;width:1200px;height:630px;overflow:hidden;
    font-family:'Readex Pro',system-ui,sans-serif;color:#f5f2ed;
    background:
      radial-gradient(900px 520px at 86% 50%, rgba(45,110,138,.42), transparent 70%),
      radial-gradient(700px 480px at 88% 60%, rgba(143,201,168,.14), transparent 72%),
      linear-gradient(135deg, #0a0e12 0%, #0f1a24 60%, #0c1620 100%);
  }
  .card::after{ /* subtle top sheen */
    content:'';position:absolute;inset:0;
    background:linear-gradient(180deg, rgba(255,255,255,.04), transparent 22%);
  }
  .logo{position:absolute;top:54px;right:64px;width:74px;height:74px;opacity:.96;
    filter:drop-shadow(0 4px 14px rgba(0,0,0,.45))}
  .text{position:absolute;left:84px;top:0;height:630px;width:680px;
    display:flex;flex-direction:column;justify-content:center;gap:6px;z-index:2}
  .eyebrow{color:#c8a04a;font-weight:700;font-size:25px;letter-spacing:.22em;text-transform:uppercase}
  .title{font-weight:700;font-size:104px;line-height:1.02;margin:14px 0 6px;letter-spacing:-.01em}
  .title b{color:#f5f2ed;font-weight:700}
  .title span{color:#8fc9a8}
  .tagline{font-weight:700;font-size:42px;line-height:1.18;color:#eef2f6}
  .foot{margin-top:30px;font-weight:600;font-size:25px;color:#9db0bf}
  .foot .dot{color:#2d6e8a;margin:0 12px}
  .portrait{position:absolute;right:38px;top:50%;transform:translateY(-50%);
    width:470px;height:470px;border-radius:50%;object-fit:cover;
    border:3px solid rgba(74,156,184,.55);
    box-shadow:0 0 0 12px rgba(45,110,138,.16), 0 24px 70px rgba(0,0,0,.5),
      0 0 70px rgba(45,110,138,.4)}
</style></head>
<body><div class="card">
  <img class="logo" src="${dataUri(logo)}" alt="">
  <div class="text">
    <div class="eyebrow">Saudi Aviation Library</div>
    <div class="title"><b>Fly</b> <span>GACA</span></div>
    <div class="tagline">Every Saudi reg.<br>One captain on the answer.</div>
    <div class="foot">Captain Adel<span class="dot">·</span>cites the exact GACAR<span class="dot">·</span>flygaca.com</div>
  </div>
  ${portrait ? `<img class="portrait" src="${dataUri(portrait)}" alt="">` : ''}
</div></body></html>`;

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROME });
} catch {
  browser = await chromium.launch(); // fall back to Playwright's bundled chromium
}
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: OUT }); // 2400×1260
await browser.close();

// Downsample 2× render → crisp 1200×630.
execFileSync('sips', ['-z', '630', '1200', OUT], { stdio: 'ignore' });
console.log(`✓ og-card.png → ${OUT.replace(ROOT + '/', '')} (portrait: ${portrait ? portrait.replace(ROOT + '/', '') : 'none'})`);
