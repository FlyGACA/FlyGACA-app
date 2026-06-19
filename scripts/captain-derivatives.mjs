#!/usr/bin/env node
/**
 * Mechanical (no-AI) derivatives of a Captain Adel source image, via macOS `sips`.
 * Produces the favicon / app-icon / social-crop set into captain-art/ (kept out of
 * public/) for review. Does NOT overwrite the live favicons in public/img/.
 *
 * Usage:
 *   node scripts/captain-derivatives.mjs                      # source = avatar.png
 *   node scripts/captain-derivatives.mjs captain-art/smile.png
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'captain-art'); // review artifacts, kept out of public/
const SRC = resolve(ROOT, process.argv[2] || 'public/img/captain/avatar.png');

if (!existsSync(SRC)) {
  console.error(`✗ Source not found: ${SRC}`);
  process.exit(1);
}
try {
  execFileSync('sips', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('✗ `sips` not available (macOS only). Skipping derivatives.');
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

// Square resamples (favicons + app icons + a social square).
const SQUARES = [
  ['favicon-16', 16], ['favicon-32', 32], ['favicon-48', 48],
  ['apple-touch-180', 180], ['icon-192', 192], ['icon-512', 512],
  ['social-square', 1200],
];

console.log(`Deriving from ${SRC.replace(ROOT + '/', '')} → captain-art/\n`);
for (const [name, size] of SQUARES) {
  const out = join(OUT_DIR, `${name}.png`);
  copyFileSync(SRC, out);
  execFileSync('sips', ['-z', String(size), String(size), out], { stdio: 'ignore' });
  console.log(`• ${name}.png  ${size}×${size}  ✓`);
}

// 1200×630 OG crop: scale to cover, then crop to the banner.
const og = join(OUT_DIR, 'og-1200x630.png');
copyFileSync(SRC, og);
execFileSync('sips', ['-z', '630', '1200', og], { stdio: 'ignore' }); // resampleHeightWidth (may distort square sources)
execFileSync('sips', ['-c', '630', '1200', og], { stdio: 'ignore' }); // crop to exact box
console.log('• og-1200x630.png  1200×630  ✓');

console.log('\nDerivatives written to captain-art/ (review before wiring into the app).');
