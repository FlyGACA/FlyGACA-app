#!/usr/bin/env node
/**
 * Give typescript-eslint its own TypeScript 6, side by side with the TypeScript 7
 * the build uses. Runs from `postinstall`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `typescript-eslint@8` throws on load under TS 7.0 ("typescript-eslint does not
 * support TS 7.0"), before ESLint even reads the config — so `npm run lint` exits 2
 * and, because `lint` precedes `test`/`build` in the `verify` chain and in ci.yml,
 * the entire gate stops. Support is only tracked for TS >= 7.1 (typescript-eslint
 * #10940) and no stable 7.1 exists yet, so waiting is not an option and downgrading
 * would undo the deliberate TS 7 migration in 7c8491d.
 *
 * TypeScript's own 7.0 announcement prescribes running the TS 6 API side by side.
 * The obvious npm expression of that — an `overrides` entry pinning
 * typescript-eslint's `typescript` to 6.x — DOES NOT WORK: `typescript` is a *peer*
 * dependency of the `@typescript-eslint/*` packages and a direct root
 * devDependency, so npm hoists the root's 7.x into the single `node_modules/
 * typescript` slot and resolves the peer to it, reporting the override as
 * "invalid" rather than nesting a second copy (`npm ls typescript` shows this).
 * The aliased form fares no better. So we place the nested copy ourselves.
 *
 * This is a workaround, not a design. REMOVE IT — this script, the `postinstall`
 * hook, and the `typescript-6` alias in devDependencies — as soon as
 * typescript-eslint ships TS 7 support; `npm run lint` passing without it is the
 * signal.
 *
 * Safe to run repeatedly, and non-fatal by design: a failure here must never break
 * `npm install` for someone who only wants to run the app.
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const modules = join(root, 'node_modules');
const source = join(modules, 'typescript-6');

/**
 * Every package that runs the version check resolves `typescript` from its OWN
 * location, so linking only the `typescript-eslint` entry point just moves the
 * throw to the next sibling (`@typescript-eslint/eslint-plugin`, then parser, and
 * so on). Link the entry point plus every `@typescript-eslint/*` package.
 */
function consumers() {
  const found = [];
  // `ts-api-utils` is typescript-eslint's compiler-API helper. It does not run the
  // version check — it reaches straight into internals that moved in TS 7 and dies
  // with "Cannot read properties of undefined (reading 'Intrinsic')" — so it needs
  // the TS 6 view too.
  for (const name of ['typescript-eslint', 'ts-api-utils']) {
    if (existsSync(join(modules, name))) found.push(name);
  }
  const scope = join(modules, '@typescript-eslint');
  if (existsSync(scope)) {
    for (const name of readdirSync(scope)) found.push(join('@typescript-eslint', name));
  }
  return found;
}

function link(pkg) {
  const targetDir = join(modules, pkg, 'node_modules');
  const target = join(targetDir, 'typescript');

  // Replace whatever is there: a stale symlink from a previous install, or a real
  // directory npm placed on its own once it does support this.
  if (lstatSync(target, { throwIfNoEntry: false })) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });

  // Relative, so the tree stays valid if the checkout moves (CI caches, containers).
  symlinkSync(relative(targetDir, source), target, 'junction');
}

function main() {
  if (!existsSync(source)) {
    // The alias isn't installed (e.g. --omit=dev). Nothing to link, nothing to warn
    // about — lint isn't runnable in that tree anyway.
    return;
  }

  const linked = consumers();
  for (const pkg of linked) link(pkg);

  if (linked.length > 0) {
    console.log(
      `link-lint-typescript: ${linked.length} typescript-eslint package(s) → typescript-6 ` +
        '(TS 7 stays for the build)',
    );
  }
}

try {
  main();
} catch (err) {
  console.warn(`link-lint-typescript: skipped (${err.message}). \`npm run lint\` may fail.`);
}
