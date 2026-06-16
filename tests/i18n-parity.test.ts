import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import ar from '../src/i18n/ar.json';

/** Recursively collects the leaf key paths of a translation object. */
function leafKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

/**
 * Bilingual parity guard — the modern equivalent of the legacy `check:i18n`.
 * Every English key must have an Arabic counterpart and vice-versa, so no
 * user-facing string can ship half-translated.
 */
describe('i18n parity (EN ⇄ AR)', () => {
  const enKeys = new Set(leafKeys(en));
  const arKeys = new Set(leafKeys(ar));

  it('has an Arabic value for every English key', () => {
    const missing = [...enKeys].filter((k) => !arKeys.has(k));
    expect(missing, `Missing Arabic keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('has an English value for every Arabic key', () => {
    const missing = [...arKeys].filter((k) => !enKeys.has(k));
    expect(missing, `Missing English keys: ${missing.join(', ')}`).toEqual([]);
  });
});
