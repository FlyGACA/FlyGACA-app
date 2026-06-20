import { describe, expect, it } from 'vitest';
import { searchHref, parseSearchUrl } from '../src/lib/content';

describe('searchHref', () => {
  it('rewrites regulations URLs to the Document reader', () => {
    expect(searchHref('document.html?type=regulations&id=part-61#sec-currency')).toBe(
      '/library/part-61#sec-currency',
    );
  });

  it('rewrites reference URLs under /library/reference', () => {
    expect(searchHref('document.html?type=reference&id=ac-68-1-basicmed#sec-1')).toBe(
      '/library/reference/ac-68-1-basicmed#sec-1',
    );
  });

  it('rewrites handbooks URLs under /library/handbook', () => {
    expect(searchHref('document.html?type=handbooks&id=surveillance#sec-2')).toBe(
      '/library/handbook/surveillance#sec-2',
    );
  });

  it('works without an anchor', () => {
    expect(searchHref('document.html?type=regulations&id=part-1')).toBe('/library/part-1');
  });

  it('returns null for unknown types or missing id', () => {
    expect(searchHref('document.html?type=charts&id=oerk')).toBeNull();
    expect(searchHref('document.html?type=regulations')).toBeNull();
  });

  it('carries the search phrase as ?q before the anchor', () => {
    expect(searchHref('document.html?type=regulations&id=part-61#sec-currency', 'night currency')).toBe(
      '/library/part-61?q=night%20currency#sec-currency',
    );
    // Blank/whitespace queries add no query string.
    expect(searchHref('document.html?type=regulations&id=part-1', '  ')).toBe('/library/part-1');
  });
});

describe('parseSearchUrl', () => {
  it('extracts kind, id and anchor', () => {
    expect(parseSearchUrl('document.html?type=reference&id=ac-68-1#sec-1')).toEqual({
      kind: 'reference',
      id: 'ac-68-1',
      anchor: 'sec-1',
    });
  });

  it('returns null when unroutable', () => {
    expect(parseSearchUrl('document.html?type=charts&id=oerk')).toBeNull();
    expect(parseSearchUrl('nonsense')).toBeNull();
  });
});
