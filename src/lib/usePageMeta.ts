import { useEffect } from 'react';

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

/**
 * Single-source head manager for the SPA. Each route sets its own document
 * title and description (the legacy static pages each had their own); we mirror
 * the title into the Open Graph tags and restore the defaults on unmount so a
 * route that doesn't set meta never inherits a stale title.
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SUFFIX}` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESC;
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'name', 'description', DEFAULT_DESC);
      setMeta('meta[property="og:title"]', 'property', 'og:title', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', 'property', 'og:description', DEFAULT_DESC);
    };
  }, [title, description]);
}
