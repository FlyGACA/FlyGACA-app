import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PREP_PACK_PRICE_CERT,
  PREP_PACK_PRICE_SUBJECT,
  EXAM_BUNDLE_PRICE,
} from '@/lib/prepCatalog';

/**
 * The price a buyer is *quoted* lives in `src/pages/pricing/Pricing.tsx`; the price
 * they are *charged* is priced server-side from the `MOYASAR_PRICE_*_SAR` params in
 * `functions/.env.flygaca-app` (billing.ts reads them via `defineString`, and the
 * client never sends an amount). Nothing links the two files, and they drifted: the
 * page advertised the 349 founding offer while the server charged the 449 list price.
 *
 * This is the drift guard. Note the founding case in particular — `startProCheckout`
 * has no promo path for the annual button, so an active founding offer means the
 * server param must equal the *offer* price, not the struck-through list price.
 */
const pricingSrc = readFileSync(join(process.cwd(), 'src/pages/pricing/Pricing.tsx'), 'utf8');
const functionsEnv = readFileSync(join(process.cwd(), 'functions/.env.flygaca-app'), 'utf8');

/** Reads a `MOYASAR_PRICE_*_SAR` param, ignoring comment lines. */
function serverPrice(name: string): number {
  const match = functionsEnv.match(new RegExp(`^${name}=(\\d+)\\s*$`, 'm'));
  expect(match, `${name} missing from functions/.env.flygaca-app`).toBeTruthy();
  return Number(match![1]);
}

/** Reads a bare `const NAME = 123;` from Pricing.tsx. */
function pageNumber(name: string): number {
  const match = pricingSrc.match(new RegExp(`^const ${name} = (\\d+);`, 'm'));
  expect(match, `${name} not found in Pricing.tsx`).toBeTruthy();
  return Number(match![1]);
}

/** Reads a field out of a `const NAME = { monthly: 1, annual: 2 };` literal. */
function pageField(name: string, field: string): number {
  const object = pricingSrc.match(new RegExp(`^const ${name} = \\{([^}]+)\\};`, 'm'));
  expect(object, `${name} not found in Pricing.tsx`).toBeTruthy();
  const match = object![1].match(new RegExp(`${field}:\\s*(\\d+)`));
  expect(match, `${name}.${field} not found in Pricing.tsx`).toBeTruthy();
  return Number(match![1]);
}

const foundingOffer = /^const FOUNDING_OFFER = true;/m.test(pricingSrc);

describe('advertised prices match the server price table', () => {
  it('Pro annual — the founding offer is what gets charged', () => {
    const advertised = foundingOffer ? pageNumber('FOUNDING_ANNUAL') : pageField('PRO_PRICE', 'annual');
    expect(
      serverPrice('MOYASAR_PRICE_PRO_ANNUAL_SAR'),
      foundingOffer
        ? 'FOUNDING_OFFER is on, so MOYASAR_PRICE_PRO_ANNUAL_SAR must equal FOUNDING_ANNUAL — ' +
          'the annual button has no promo path and prices straight from the param'
        : 'FOUNDING_OFFER is off, so MOYASAR_PRICE_PRO_ANNUAL_SAR must equal the list price',
    ).toBe(advertised);
  });

  it.each([
    ['MOYASAR_PRICE_PRO_MONTHLY_SAR', () => pageField('PRO_PRICE', 'monthly')],
    ['MOYASAR_PRICE_STUDENT_MONTHLY_SAR', () => pageField('STUDENT_PRICE', 'monthly')],
    ['MOYASAR_PRICE_STUDENT_ANNUAL_SAR', () => pageField('STUDENT_PRICE', 'annual')],
    ['MOYASAR_PRICE_PASS_SAR', () => pageNumber('PASS_PRICE')],
  ])('%s matches the page', (param, advertised) => {
    expect(serverPrice(param)).toBe(advertised());
  });

  // These already flow from prepCatalog into the page, so the page can't drift —
  // but the server param is a separate copy that can.
  it.each([
    ['MOYASAR_PRICE_PREP_PACK_CERT_SAR', PREP_PACK_PRICE_CERT],
    ['MOYASAR_PRICE_PREP_PACK_SUBJECT_SAR', PREP_PACK_PRICE_SUBJECT],
    ['MOYASAR_PRICE_BUNDLE_SAR', EXAM_BUNDLE_PRICE],
  ])('%s matches prepCatalog', (param, catalogPrice) => {
    expect(serverPrice(param)).toBe(catalogPrice);
  });
});
