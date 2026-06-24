/**
 * Browserless head-prerender — the GUARANTEED SEO layer.
 *
 * For every indexable route it writes dist/<route>/index.html: a copy of the
 * built shell with the per-route <head> baked in (title, description, canonical,
 * the en/ar/x-default hreflang set, Open Graph, and a JSON-LD item) and the home
 * hero stripped on non-home routes so a no-JS crawler never sees homepage content
 * on every path. Pure Node string work — no browser — so it runs reliably inside
 * Firebase App Hosting's Cloud Native Buildpack (where headless Chromium can't),
 * and it's part of `npm run build`, so it can never be skipped on a deploy.
 *
 * It is the floor; scripts/prerender.mjs (Playwright, full-body) is an optional
 * enhancement that overwrites these files with hydrated snapshots on hosts that
 * have a browser (Vercel buildCommand, `npm run deploy`).
 *
 * Route set + URL/JSON-LD shapes mirror scripts/build-sitemap.mjs and
 * src/lib/{seo,jsonld}.ts. Keep them in sync (guarded by tests/jsonld.test.ts).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL ?? 'https://flygaca.com').replace(/\/$/, '');
const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

const shellPath = join(root, 'dist/index.html');
if (!existsSync(shellPath)) {
  console.warn('prerender-head: dist/index.html missing — run after vite build. Skipping.');
  process.exit(0);
}
const shell = readFileSync(shellPath, 'utf8');

// --- Pure URL/meta helpers (mirror src/lib/seo.ts) -----------------------------
const SUFFIX = 'Fly GACA';
const DEFAULT_TITLE = 'Fly GACA — Saudi Aviation Library';
const DEFAULT_DESC =
  'Fly GACA — an independent educational reference library of Saudi civil-aviation regulations (GACAR), charts and study tools. Not affiliated with GACA.';
const OG_SECTIONS = new Set(['tools', 'guides', 'library', 'study', 'pricing']);

const normalizePath = (p) => {
  const clean = (p || '/').split(/[?#]/)[0];
  const lead = clean.startsWith('/') ? clean : `/${clean}`;
  return lead.length > 1 ? lead.replace(/\/+$/, '') : '/';
};
const canonicalUrl = (p) => `${SITE}${normalizePath(p)}`;
const langUrl = (p, lang) => `${canonicalUrl(p)}?lang=${lang}`;
const ogImageFor = (p) => {
  const section = normalizePath(p).split('/')[1] ?? '';
  return OG_SECTIONS.has(section) ? `${SITE}/img/og-${section}.png` : `${SITE}/img/og-card.png`;
};
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- JSON-LD builders (mirror src/lib/jsonld.ts) -------------------------------
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const CTX = 'https://schema.org';
const orgNode = () => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Fly GACA',
  url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/img/icon-512.png` },
});
const articleLd = (type, { title, description, path, dateModified, lang = 'en' }) => {
  const url = canonicalUrl(path);
  return {
    '@context': CTX,
    '@type': type,
    headline: title,
    ...(description ? { description } : {}),
    ...(dateModified ? { datePublished: dateModified, dateModified } : {}),
    inLanguage: lang,
    url,
    mainEntityOfPage: url,
    image: `${SITE}/img/og-card.png`,
    author: orgNode(),
    isPartOf: { '@id': SITE_ID },
    publisher: orgNode(),
  };
};
const softwareAppLd = ({ title, description, path }) => ({
  '@context': CTX,
  '@type': 'SoftwareApplication',
  name: title,
  ...(description ? { description } : {}),
  url: canonicalUrl(path),
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
  publisher: { '@id': ORG_ID },
});

// --- Build the route → SEO descriptor map --------------------------------------
const en = readJson('src/i18n/en.json');
const tIn = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

const PRIVATE = new Set(['/account', '/dashboard', '/currency', '/logbook', '/records', '/settings']);
const REDIRECTS = new Set(['/guides', '/study']);

// Static pages: route → i18n meta key (under en.meta / en.metaDesc). Routes not
// listed still get canonical/hreflang/og injected, just keep the default title.
const STATIC_META = {
  '/': 'home',
  '/library': 'library',
  '/library/charts': 'charts',
  '/tools': 'tools',
  '/chat': 'chat',
  '/learn': 'learn',
  '/pricing': 'pricing',
  '/schools': 'schools',
  '/about': 'about',
  '/study/quiz': 'quiz',
  '/study/flashcards': 'flashcards',
  '/study/groundschool': 'groundschool',
  '/study/exam': 'exam',
  '/study/paths': 'paths',
  '/study/packs': 'packs',
  '/study/sheets': 'sheets',
};

/** @type {Map<string, {title?:string, description?:string, jsonLd?:object}>} */
const seo = new Map();
const put = (path, desc) => seo.set(normalizePath(path), desc);

// Static router paths (the sitemap's source of truth) → title/description by key.
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
for (const p of routerPaths) {
  if (p.includes(':') || p === '*') continue;
  const norm = normalizePath(p === '/' ? '/' : `/${p.replace(/^\//, '')}`);
  if (PRIVATE.has(norm) || REDIRECTS.has(norm)) continue;
  const key = STATIC_META[norm];
  put(norm, {
    title: key ? tIn(en.meta, key) : undefined,
    description: key ? tIn(en.metaDesc, key) : undefined,
  });
}

// Tools → name/blurb from i18n + SoftwareApplication.
const toolsSrc = read('src/lib/tools.ts');
for (const m of toolsSrc.matchAll(/\bt\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'live'/g)) {
  const id = m[1];
  const path = `/tools/${id}`;
  const title = tIn(en, `tools.items.${id}.name`);
  const description = tIn(en, `tools.items.${id}.blurb`);
  put(path, { title, description, jsonLd: softwareAppLd({ title, description, path }) });
}

// Guides → name/blurb from i18n + Article (drafts excluded, like the sitemap).
const guidesSrc = read('src/pages/guides/guides.ts');
const guideSlugs = [
  ...guidesSrc.match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g),
].map((m) => m[1]);
const draftGuides = new Set(
  [...(guidesSrc.match(/GUIDE_STATUS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '').matchAll(/'([^']+)':\s*'draft'/g)].map(
    (m) => m[1],
  ),
);
for (const slug of guideSlugs) {
  if (draftGuides.has(slug)) continue;
  const path = `/guides/${slug}`;
  const title = tIn(en, `guides.items.${slug}.name`);
  const description = tIn(en, `guides.items.${slug}.blurb`);
  put(path, { title, description, jsonLd: articleLd('Article', { title, description, path }) });
}

// Library reader corpus → title (+ revision date) from the data indexes + TechArticle.
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
for (const [base, file] of [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
]) {
  for (const d of readJson(file).documents) {
    const path = `${base}/${d.slug}`;
    const dateModified = isDate(d.effectiveDate)
      ? d.effectiveDate.slice(0, 10)
      : isDate(d.revision)
        ? d.revision.slice(0, 10)
        : undefined;
    put(path, {
      title: d.title,
      jsonLd: articleLd('TechArticle', { title: d.title, path, dateModified }),
    });
  }
}

// --- Head transform ------------------------------------------------------------
/** Replace a tag matching `re` with `tag`, or insert `tag` before </head> if absent. */
function setTag(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function render(path, d) {
  const fullTitle = d.title ? `${d.title} — ${SUFFIX}` : DEFAULT_TITLE;
  const desc = d.description ?? DEFAULT_DESC;
  const canonical = canonicalUrl(path);
  let html = shell;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = setTag(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(desc)}" />`,
  );
  html = setTag(html, /<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
  for (const [hreflang, href] of [
    ['en', langUrl(path, 'en')],
    ['ar', langUrl(path, 'ar')],
    ['x-default', canonical],
  ]) {
    html = setTag(
      html,
      new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${hreflang}"[^>]*>`),
      `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
    );
  }
  html = setTag(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(fullTitle)}" />`);
  html = setTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = setTag(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  html = setTag(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImageFor(path)}" />`);

  if (d.jsonLd) {
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json" data-managed-ld>${JSON.stringify(d.jsonLd)}</script>\n  </head>`,
    );
  }

  // Strip the home hero on non-home routes so crawlers don't read homepage
  // content on every path (the runtime script does the same once JS runs).
  if (normalizePath(path) !== '/') {
    html = html.replace(/<div id="app-shell">[\s\S]*?<\/script>\s*/, '');
  }
  return html;
}

let written = 0;
for (const [path, d] of seo) {
  const file =
    path === '/' ? shellPath : join(root, 'dist', path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(path, d));
  written++;
}
console.log(`prerender-head: wrote ${written} route snapshots (origin ${SITE})`);
