/**
 * Generate the per-app App Store icons for the native iOS app family
 * (apple/Apps/<App>/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png).
 *
 * Each app in the family is its own App Store product, so each needs its OWN
 * recognizable icon — before this script every app shipped the same placeholder.
 * The icons share one system (the Falcon night background + a subtle falcon-wing
 * chevron) so the family reads as a set, and differ by a per-module accent colour
 * + the module's short code, so a user with several installed can tell them apart
 * on the home screen at a glance.
 *
 *   node scripts/native/gen-app-icons.mjs           # all six apps
 *   node scripts/native/gen-app-icons.mjs --app cpl # one app
 *
 * Colours come from the Falcon design tokens (src/styles/tokens.css). Output is a
 * FLATTENED (no alpha channel) 1024×1024 PNG — the App Store rejects marketing
 * icons with an alpha channel (see docs/RUNBOOK-ios-signing.md, "altool error
 * 1091"). Rendered with `sharp` (already a devDependency) from an inline SVG, so
 * there's no browser, network or Xcode dependency — it runs anywhere `npm ci` ran.
 *
 * These are clean, legible placeholders built from the brand system, not final
 * bespoke artwork — re-run after dropping real per-app art into the template.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Falcon palette (src/styles/tokens.css). `night`/`deep` are the shared canvas;
// `accent` is the per-app differentiator.
const NIGHT = '#0a0e12';
const DEEP = '#101a24';

// App Store product → { Xcode target dir, on-icon label, Falcon accent }.
// Mirrors the APPS registry in scripts/build-ios-content.mjs (same six apps).
const APPS = {
  ppl: { dir: 'PPL', label: 'PPL', accent: '#2d6e8a' }, // falcon-teal
  elpt: { dir: 'ELPT', label: 'ELPT', accent: '#8fc9a8' }, // falcon-sage
  aip: { dir: 'AIP', label: 'AIP', accent: '#c8a04a' }, // falcon-gold
  cpl: { dir: 'CPL', label: 'CPL', accent: '#3f9d8a' }, // teal→green shift
  ir: { dir: 'IR', label: 'IR', accent: '#cf6b52' }, // falcon-clay
  atpl: { dir: 'ATPL', label: 'ATPL', accent: '#7a8fd0' }, // cool indigo
};

const SIZE = 1024;

/** Build the 1024×1024 icon SVG for one app. */
function iconSvg({ label, accent }) {
  // Longer codes (ELPT/ATPL) need a smaller type size to breathe inside the grid.
  const fontSize = label.length >= 4 ? 300 : label.length === 3 ? 360 : 440;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${DEEP}"/>
      <stop offset="1" stop-color="${NIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <!-- Falcon-wing chevron watermark, echoing the brand mark. -->
  <path d="M167 300 L512 130 L857 300 L512 470 Z" fill="${accent}" opacity="0.16"/>
  <!-- Accent baseline rule. -->
  <rect x="167" y="792" width="690" height="20" rx="10" fill="${accent}"/>
  <text x="512" y="560" text-anchor="middle" dominant-baseline="central"
        font-family="Helvetica, Arial, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="8" fill="#f5f2ed">${label}</text>
</svg>`;
}

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

  const png = await sharp(Buffer.from(iconSvg(app)))
    .resize(SIZE, SIZE)
    .flatten({ background: NIGHT }) // strip alpha — App Store marketing-icon requirement
    .png()
    .toBuffer();
  writeFileSync(join(iconSetDir, 'AppIcon-1024.png'), png);
  console.log(`✓ ${app.dir}: ${app.label} icon (${png.length.toLocaleString()} bytes)`);
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
