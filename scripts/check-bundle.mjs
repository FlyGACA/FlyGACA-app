#!/usr/bin/env node
/**
 * Bundle budget gate. Measures the *initial* JavaScript the browser must fetch
 * for the app shell — the entry chunk plus the modulepreloaded vendor chunks
 * that `dist/index.html` references — and fails if the gzipped total exceeds the
 * budget. Route chunks are lazy (Suspense in Layout) and excluded by design.
 *
 * Run after `vite build`. Wire as `npm run check:bundle` (CI build job).
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const BUDGET_KB = 160; // gzipped initial JS ceiling; tighten as the shell shrinks

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);

if (files.length === 0) {
  console.error('check:bundle — no /assets/*.js referenced by dist/index.html');
  process.exit(1);
}

let totalGz = 0;
const rows = files.map((f) => {
  const buf = readFileSync(join(DIST, f.replace(/^\//, '')));
  const gz = gzipSync(buf).length;
  totalGz += gz;
  return `  ${(gz / 1024).toFixed(1).padStart(7)} kB gz  ${f}`;
});

const totalKb = totalGz / 1024;
console.log('Initial JS (entry + preloaded vendor chunks):');
console.log(rows.join('\n'));
console.log(`  ${'─'.repeat(40)}`);
console.log(`  ${totalKb.toFixed(1).padStart(7)} kB gz  total   (budget ${BUDGET_KB} kB)`);

if (totalKb > BUDGET_KB) {
  console.error(`\n✗ Initial JS ${totalKb.toFixed(1)} kB exceeds the ${BUDGET_KB} kB budget.`);
  process.exit(1);
}
console.log(`\n✓ Within budget.`);
