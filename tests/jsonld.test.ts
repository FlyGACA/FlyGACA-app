import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '../src/lib/seo';
import {
  ORG_ID,
  SITE_ID,
  articleLd,
  breadcrumbLd,
  courseLd,
  faqLd,
  itemListLd,
  organizationLd,
  softwareAppLd,
  techArticleLd,
  webSiteLd,
} from '../src/lib/jsonld';

describe('organization + website', () => {
  it('uses stable @id anchors matching the static graph', () => {
    expect(ORG_ID).toBe(`${SITE_ORIGIN}/#organization`);
    expect(SITE_ID).toBe(`${SITE_ORIGIN}/#website`);
    expect(organizationLd()['@id']).toBe(ORG_ID);
  });
  it('website exposes a SearchAction into the library', () => {
    const ld = webSiteLd();
    expect(ld['@type']).toBe('WebSite');
    expect(ld.publisher).toEqual({ '@id': ORG_ID });
    const action = ld.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toBe(`${SITE_ORIGIN}/library?q={search_term_string}`);
  });
});

describe('breadcrumbLd', () => {
  it('numbers positions and canonicalizes each path', () => {
    const ld = breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Library', path: '/library' },
      { name: 'Part 91', path: '/library/part-91' },
    ]);
    const items = ld.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[2].item).toBe(`${SITE_ORIGIN}/library/part-91`);
  });
});

describe('itemListLd', () => {
  it('numbers positions, counts items and canonicalizes each url', () => {
    const ld = itemListLd([
      { name: 'Crosswind', path: '/tools/crosswind' },
      { name: 'Density altitude', path: '/tools/density-altitude' },
    ]);
    expect(ld['@type']).toBe('ItemList');
    expect(ld.numberOfItems).toBe(2);
    const items = ld.itemListElement as Array<{ position: number; name: string; url: string }>;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[0].url).toBe(`${SITE_ORIGIN}/tools/crosswind`);
  });
});

describe('article builders', () => {
  it('TechArticle carries url, language and site/publisher refs', () => {
    const ld = techArticleLd({
      title: 'Part 91',
      description: 'General operating rules',
      path: '/library/part-91',
      lang: 'ar',
    });
    expect(ld['@type']).toBe('TechArticle');
    expect(ld.headline).toBe('Part 91');
    expect(ld.inLanguage).toBe('ar');
    expect(ld.url).toBe(`${SITE_ORIGIN}/library/part-91`);
    expect(ld.isPartOf).toEqual({ '@id': SITE_ID });
    expect(ld.publisher).toEqual({ '@id': ORG_ID });
  });
  it('Article defaults language to en and omits empty description', () => {
    const ld = articleLd({ title: 'Airspace explained', path: '/guides/airspace-explained' });
    expect(ld['@type']).toBe('Article');
    expect(ld.inLanguage).toBe('en');
    expect('description' in ld).toBe(false);
  });
});

describe('course + faq + software', () => {
  it('courseLd names the org as provider', () => {
    const ld = courseLd({ title: 'PPL Ground School', path: '/study/groundschool' });
    expect(ld['@type']).toBe('Course');
    expect(ld.provider).toEqual({ '@id': ORG_ID });
  });
  it('faqLd maps Q/A pairs to Question/Answer', () => {
    const ld = faqLd([{ q: 'Is Fly GACA official?', a: 'No — it is independent.' }]);
    const main = ld.mainEntity as Array<{ '@type': string; acceptedAnswer: { text: string } }>;
    expect(main[0]['@type']).toBe('Question');
    expect(main[0].acceptedAnswer.text).toBe('No — it is independent.');
  });
  it('softwareAppLd marks the tool free with an SAR offer', () => {
    const ld = softwareAppLd({ title: 'Crosswind', path: '/tools/crosswind' });
    expect(ld['@type']).toBe('SoftwareApplication');
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'SAR' });
    expect(ld.url).toBe(`${SITE_ORIGIN}/tools/crosswind`);
  });
});
