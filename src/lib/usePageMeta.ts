import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../i18n';
import { canonicalUrl, hreflangAlternates, ogImageFor, ogLocale } from './seo';
import type { JsonLd } from './jsonld';

const LD_ATTR = 'data-managed-ld';

/** Write or remove the single route-managed JSON-LD script in <head>. */
function setJsonLd(data?: JsonLd | JsonLd[]) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[${LD_ATTR}]`);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute(LD_ATTR, '');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

const SUFFIX = 'Fly GACA';
const DEFAULT_TITLE = 'Fly GACA — Saudi Aviation Library';
const DEFAULT_DESC =
  'Fly GACA — an independent educational reference library of Saudi civil-aviation regulations (GACAR), charts and study tools. Not affiliated with GACA.';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang ? `link[rel="alternate"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Single-source head manager for the SPA. Each route sets its own title +
 * description; we mirror those into Open Graph, and emit the canonical URL,
 * hreflang alternates and locale for the current path/language. Re-runs when
 * the language changes so og:locale + hreflang stay correct.
 */
export function usePageMeta(title?: string, description?: string, jsonLd?: JsonLd | JsonLd[]) {
  const { pathname } = useLocation();
  // Serialize the LD for a stable effect dependency (the object identity churns
  // every render, but its content only changes with the route/language).
  const jsonKey = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    function apply() {
      const fullTitle = title ? `${title} — ${SUFFIX}` : DEFAULT_TITLE;
      const desc = description ?? DEFAULT_DESC;
      const path = pathname;
      const canonical = canonicalUrl(path);

      document.title = fullTitle;
      setMeta('meta[name="description"]', 'name', 'description', desc);
      setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
      setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
      setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
      setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
      setMeta('meta[property="og:image"]', 'property', 'og:image', ogImageFor(path));
      setMeta('meta[property="og:locale"]', 'property', 'og:locale', ogLocale(i18n.language));

      setLink('canonical', canonical);
      for (const alt of hreflangAlternates(path)) setLink('alternate', alt.href, alt.hreflang);
      setJsonLd(jsonLd);
    }

    apply();
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'name', 'description', DEFAULT_DESC);
      setMeta('meta[property="og:title"]', 'property', 'og:title', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', 'property', 'og:description', DEFAULT_DESC);
      setJsonLd(undefined);
    };
    // jsonKey stands in for jsonLd's content in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, pathname, jsonKey]);
}
