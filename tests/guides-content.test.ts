import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import ar from '../src/i18n/ar.json';
import { GUIDE_SLUGS, GUIDE_META, GUIDE_STATUS } from '../src/pages/guides/guides';

/**
 * Content-completeness guard for guides. The i18n-parity test only checks that
 * EN and AR have the *same* keys — a guide missing `intro` in BOTH languages
 * would pass parity yet render broken. This asserts every guide actually has all
 * required, non-empty content in both bundles, plus metadata and a valid status.
 */
interface GuideItem {
  name: unknown;
  blurb: unknown;
  intro: unknown;
  sections: unknown;
  adel: unknown;
  takeaways: unknown;
}
type Bundle = { guides: { items: Record<string, GuideItem | undefined> } };

const enItems = (en as unknown as Bundle).guides.items;
const arItems = (ar as unknown as Bundle).guides.items;

const nonEmptyStr = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

function checkItem(item: GuideItem | undefined): void {
  expect(item, 'guide content missing for this language').toBeDefined();
  if (!item) return;
  for (const key of ['name', 'blurb', 'intro', 'adel'] as const) {
    expect(nonEmptyStr(item[key]), `"${key}" must be a non-empty string`).toBe(true);
  }
  expect(Array.isArray(item.sections) && item.sections.length > 0, 'sections must be non-empty').toBe(
    true,
  );
  for (const s of item.sections as { h: unknown; p: unknown }[]) {
    expect(nonEmptyStr(s.h) && nonEmptyStr(s.p), 'each section needs an "h" and "p"').toBe(true);
  }
  const takeaways = item.takeaways as unknown[];
  expect(Array.isArray(takeaways) && takeaways.length > 0, 'takeaways must be non-empty').toBe(true);
  for (const tk of takeaways) expect(nonEmptyStr(tk), 'each takeaway must be a non-empty string').toBe(true);
}

describe('guide content completeness (EN + AR)', () => {
  for (const slug of GUIDE_SLUGS) {
    it(`${slug} has complete EN + AR content`, () => {
      checkItem(enItems[slug]);
      checkItem(arItems[slug]);
    });
    it(`${slug} has metadata + a valid status`, () => {
      expect(GUIDE_META[slug]).toBeDefined();
      expect(['draft', 'live']).toContain(GUIDE_STATUS[slug]);
    });
  }

  it('has no orphan guides.items entries outside GUIDE_SLUGS', () => {
    const known = new Set<string>(GUIDE_SLUGS);
    const orphans = Object.keys(enItems).filter((k) => !known.has(k));
    expect(orphans, `Orphan guide items: ${orphans.join(', ')}`).toEqual([]);
  });
});
