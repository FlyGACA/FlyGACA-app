/**
 * Pure JSON-LD (schema.org) builders — the structured-data counterpart to the
 * SEO URL helpers in `seo.ts`. Each function returns a plain object (no DOM, no
 * i18n) so they stay unit-testable; `usePageMeta` serializes the result into a
 * single managed `<script type="application/ld+json">` tag per route.
 *
 * Site-wide Organization + WebSite live statically in `index.html` (present in
 * the initial HTML); these per-page builders describe the current document.
 */
import { OG_IMAGE, SITE_ORIGIN, canonicalUrl } from './seo';

export type JsonLd = Record<string, unknown>;

/** Stable @id anchors that match the static graph in index.html. */
export const ORG_ID = `${SITE_ORIGIN}/#organization`;
export const SITE_ID = `${SITE_ORIGIN}/#website`;

const CONTEXT = 'https://schema.org';

export function organizationLd(): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Fly GACA',
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/img/icon-512.png`,
    description:
      'Fly GACA — an independent educational reference library of Saudi civil-aviation regulations (GACAR). Not affiliated with GACA.',
  };
}

export function webSiteLd(): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: 'Fly GACA',
    url: SITE_ORIGIN,
    inLanguage: ['en', 'ar'],
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/library?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  /** Router path for the crumb (canonicalized internally). */
  path: string;
}

/** A BreadcrumbList for the page's position in the IA. */
export function breadcrumbLd(items: Crumb[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path),
    })),
  };
}

export interface ArticleInput {
  title: string;
  description?: string;
  /** Router path of the article (canonicalized internally). */
  path: string;
  /** BCP-47 language of the current rendering (e.g. 'en' | 'ar'). */
  lang?: string;
}

function articleOfType(type: 'TechArticle' | 'Article', a: ArticleInput): JsonLd {
  const url = canonicalUrl(a.path);
  return {
    '@context': CONTEXT,
    '@type': type,
    headline: a.title,
    ...(a.description ? { description: a.description } : {}),
    inLanguage: a.lang ?? 'en',
    url,
    mainEntityOfPage: url,
    image: OG_IMAGE,
    isPartOf: { '@id': SITE_ID },
    publisher: { '@id': ORG_ID },
  };
}

/** TechArticle — for regulation / handbook / reference reader pages. */
export function techArticleLd(a: ArticleInput): JsonLd {
  return articleOfType('TechArticle', a);
}

/** Article — for editorial guide pages. */
export function articleLd(a: ArticleInput): JsonLd {
  return articleOfType('Article', a);
}

/** Course — for ground school / study-path pages. */
export function courseLd(a: ArticleInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Course',
    name: a.title,
    ...(a.description ? { description: a.description } : {}),
    inLanguage: a.lang ?? 'en',
    url: canonicalUrl(a.path),
    provider: { '@id': ORG_ID },
  };
}

export interface QA {
  q: string;
  a: string;
}

/** FAQPage — for pages backed by genuine question/answer pairs. */
export function faqLd(items: QA[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export interface SoftwareAppInput {
  title: string;
  description?: string;
  /** Router path of the tool (canonicalized internally). */
  path: string;
}

/** SoftwareApplication — for the free, browser-based calculator tools. */
export function softwareAppLd(a: SoftwareAppInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'SoftwareApplication',
    name: a.title,
    ...(a.description ? { description: a.description } : {}),
    url: canonicalUrl(a.path),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
    publisher: { '@id': ORG_ID },
  };
}
