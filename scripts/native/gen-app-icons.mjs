/**
 * Generate the per-app App Store icons for the native iOS app family
 * (apple/Apps/<App>/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png).
 *
 * Each app in the family is its own App Store product, so each needs its OWN
 * recognizable icon — before this script every app shipped the same placeholder.
 * The icons are the real Fly GACA falcon mark on the shared Falcon night
 * background, RECOLOURED per app: the mark's two-tone (teal→green) gradient is
 * hue-rotated by a per-module amount, so every app reads as the same brand mark in
 * a distinct colour and a user with several installed can tell them apart at a
 * glance.
 *
 *   node scripts/native/gen-app-icons.mjs           # all six apps
 *   node scripts/native/gen-app-icons.mjs --app cpl # one app
 *
 * Background colour comes from the Falcon design tokens (src/styles/tokens.css).
 * Output is a FLATTENED (no alpha channel) 1024×1024 PNG — the App Store rejects
 * marketing icons with an alpha channel (see docs/RUNBOOK-ios-signing.md, "altool
 * error 1091"). Rendered with `sharp` (already a devDependency), so there's no
 * browser, network or Xcode dependency — it runs anywhere `npm ci` ran.
 *
 * These are brand-system placeholders (the real mark, recoloured), not final
 * bespoke per-app artwork — swap in real art before external distribution.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Falcon palette (src/styles/tokens.css). The night gradient is the shared canvas.
const NIGHT = '#0a0e12';
const DEEP = '#101a24';

// The real brand mark (transparent, 1024px) — the falcon whose hue we rotate.
const MARK = join(root, 'public', 'brand', 'flygaca-mark.png');

// App Store product → { Xcode target dir, per-app hue rotation in degrees }.
// Mirrors the APPS registry in scripts/build-ios-content.mjs (same six apps).
// PPL keeps the canonical brand colours (hue 0); the rest are spread around the
// wheel so all six are clearly distinct.
const APPS = {
  ppl: { dir: 'PPL', hue: 0 }, // canonical teal→green
  elpt: { dir: 'ELPT', hue: 55 },
  aip: { dir: 'AIP', hue: 110 },
  cpl: { dir: 'CPL', hue: 165 },
  ir: { dir: 'IR', hue: 215 },
  atpl: { dir: 'ATPL', hue: 275 },
};

const SIZE = 1024;
const MARK_SIZE = Math.round(SIZE * 0.82); // logo footprint within the canvas

// The shared night-gradient background (no chevron/label — the mark is the hero).
const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${DEEP}"/>
      <stop offset="1" stop-color="${NIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
</svg>`;

const contentsJson = JSON.stringify(
  {
    images: [
      { filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    ],
    info: { author: 'xcode', version: 1 },
  },
  null,
  2,
);

const catalogContentsJson = JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2);

async function generate(appId) {
  const app = APPS[appId];
  if (!app)
    throw new Error(
      `gen-app-icons: unknown app "${appId}" (known: ${Object.keys(APPS).join(', ')})`,
    );

  const assetsDir = join(root, 'apple', 'Apps', app.dir, 'Assets.xcassets');
  const iconSetDir = join(assetsDir, 'AppIcon.appiconset');
  mkdirSync(iconSetDir, { recursive: true });

  // Ensure the asset-catalog scaffolding exists (idempotent — matches the shape
  // Xcode/XcodeGen expects; PPL/ELPT/AIP already have these, CPL/IR/ATPL don't).
  writeFileSync(join(assetsDir, 'Contents.json'), `${catalogContentsJson}\n`);
  writeFileSync(join(iconSetDir, 'Contents.json'), `${contentsJson}\n`);

  // Recolour the mark by rotating its hue, preserving its shape/shading + alpha.
  const mark = await sharp(MARK)
    .resize(MARK_SIZE, MARK_SIZE, { fit: 'inside' })
    .modulate({ hue: app.hue })
    .toBuffer();

  const composited = await sharp(Buffer.from(backgroundSvg))
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();

  // Flatten in a SECOND pass: sharp applies flatten before composite within a
  // single pipeline, so the composite would otherwise re-introduce an alpha
  // channel. A fresh pipeline flattens the finished image onto the night
  // background, guaranteeing a no-alpha PNG (App Store marketing-icon requirement).
  const png = await sharp(composited).flatten({ background: NIGHT }).png().toBuffer();
  writeFileSync(join(iconSetDir, 'AppIcon-1024.png'), png);
  console.log(`✓ ${app.dir}: falcon +${app.hue}° hue (${png.length.toLocaleString()} bytes)`);
}

const argApp = (() => {
  const i = process.argv.indexOf('--app');
  return i >= 0 ? process.argv[i + 1]?.toLowerCase() : null;
})();

const targets = argApp ? [argApp] : Object.keys(APPS);
for (const id of targets) {
  await generate(id);
}
console.log(`\nGenerated ${targets.length} app icon${targets.length === 1 ? '' : 's'}.`);
