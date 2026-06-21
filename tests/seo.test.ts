import { describe, expect, it } from 'vitest';
import {
  SITE_ORIGIN,
  normalizePath,
  canonicalUrl,
  langUrl,
  hreflangAlternates,
  ogLocale,
  canonicalRedirect,
} from '../src/lib/seo';

describe('normalizePath', () => {
  it('strips query/hash and trailing slashes, keeps root', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/library/')).toBe('/library');
    expect(normalizePath('/tools/crosswind?foo=1#x')).toBe('/tools/crosswind');
    expect(normalizePath('tools')).toBe('/tools');
  });
});

describe('canonical + lang urls', () => {
  it('builds an origin-absolute clean canonical', () => {
    expect(canonicalUrl('/library/part-1')).toBe(`${SITE_ORIGIN}/library/part-1`);
  });
  it('appends ?lang for language URLs', () => {
    expect(langUrl('/pricing', 'ar')).toBe(`${SITE_ORIGIN}/pricing?lang=ar`);
  });
});

describe('hreflangAlternates', () => {
  it('emits en, ar and x-default', () => {
    const alts = hreflangAlternates('/chat');
    expect(alts.map((a) => a.hreflang)).toEqual(['en', 'ar', 'x-default']);
    expect(alts[0].href).toBe(`${SITE_ORIGIN}/chat?lang=en`);
    expect(alts[2].href).toBe(`${SITE_ORIGIN}/chat`);
  });
});

describe('ogLocale', () => {
  it('maps languages and defaults to en_US', () => {
    expect(ogLocale('ar')).toBe('ar_SA');
    expect(ogLocale('en')).toBe('en_US');
    expect(ogLocale('zz')).toBe('en_US');
  });
});

describe('canonicalRedirect', () => {
  it('folds a duplicate host onto the canonical origin, preserving path/query/hash', () => {
    expect(
      canonicalRedirect({
        hostname: 'captadel.com',
        pathname: '/pricing',
        search: '?lang=ar',
        hash: '#faq',
      }),
    ).toBe(`${SITE_ORIGIN}/pricing?lang=ar#faq`);
    expect(
      canonicalRedirect({ hostname: 'www.captadel.com', pathname: '/', search: '', hash: '' }),
    ).toBe(`${SITE_ORIGIN}/`);
  });

  it('returns null for the canonical host, previews, localhost and native', () => {
    for (const hostname of [
      'flygaca.com',
      'flygaca-app.web.app',
      'flygaca-app-git-x.vercel.app',
      'localhost',
    ]) {
      expect(canonicalRedirect({ hostname, pathname: '/tools', search: '', hash: '' })).toBeNull();
    }
  });
});
