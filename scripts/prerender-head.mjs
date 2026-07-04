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

// English lives at clean paths; the Arabic variant lives under /ar. Mirrors
// src/lib/seo.ts so the no-JS head layer matches the runtime head.
const AR_PREFIX = '/ar';
const normalizePath = (p) => {
  const clean = (p || '/').split(/[?#]/)[0];
  const lead = clean.startsWith('/') ? clean : `/${clean}`;
  return lead.length > 1 ? lead.replace(/\/+$/, '') : '/';
};
const canonicalUrl = (p) => `${SITE}${normalizePath(p)}`;
// The Arabic document's real path (mirrors src/lib/seo.ts localePath/canonicalUrl):
// `/` → `/ar`, `/library` → `/ar/library`. This is the hreflang `ar` target + the
// Arabic page's self-canonical, so Firebase can serve it as a distinct static file.
const arUrl = (p) => {
  const n = normalizePath(p);
  return n === '/' ? `${SITE}/ar` : `${SITE}/ar${n}`;
};
const stripArPrefix = (p) => {
  const n = normalizePath(p);
  if (n === AR_PREFIX) return '/';
  if (n.startsWith(`${AR_PREFIX}/`)) return n.slice(AR_PREFIX.length);
  return n;
};
const canonicalUrl = (p, lang = 'en') => {
  const clean = stripArPrefix(p);
  const path = lang === 'ar' ? (clean === '/' ? AR_PREFIX : `${AR_PREFIX}${clean}`) : clean;
  return `${SITE}${path}`;
};
const ogLocale = (lang) => (lang === 'ar' ? 'ar_SA' : 'en_US');
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
  const url = canonicalUrl(path, lang);
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
const softwareAppLd = ({ title, description, path, lang = 'en' }) => ({
  '@context': CTX,
  '@type': 'SoftwareApplication',
  name: title,
  ...(description ? { description } : {}),
  url: canonicalUrl(path, lang),
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
  publisher: { '@id': ORG_ID },
});
const courseLd = ({ title, description, path, lang = 'en' }) => ({
  '@context': CTX,
  '@type': 'Course',
  name: title,
  ...(description ? { description } : {}),
  inLanguage: lang,
  url: canonicalUrl(path),
  url: canonicalUrl(path, lang),
  provider: orgNode(),
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
  hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
});
// The self-paced, GACAR-grounded study modes are Courses (mirrors src/pages/study/*).
const COURSE_ROUTES = new Set([
  '/study/quiz',
  '/study/flashcards',
  '/study/groundschool',
  '/study/exam',
  '/study/paths',
]);

// --- Build the route → SEO descriptor maps -------------------------------------
const en = readJson('src/i18n/en.json');
// Arabic bundle drives the parallel `seoAr` map — the crawler-facing Arabic
// snapshots written to dist/ar/<path>/index.html. Arabic meta is authored (never
// machine-translated), so we read the same keys straight from ar.json.
const ar = readJson('src/i18n/ar.json');
const tIn = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// Arabic fallbacks for routes without a per-page meta key (mirror the English
// DEFAULT_* shape, but authored). The home meta doubles as the site-level Arabic
// default and carries the not-affiliated caveat.
const DEFAULT_TITLE_AR = `${SUFFIX} — ${tIn(ar.meta, 'home')}`;
const DEFAULT_DESC_AR = tIn(ar.metaDesc, 'home');

// Arabic descriptors for the covered set (static + tools + guides + top library
// docs). Long-tail corpus stays English-only, capped by AR_CORPUS_MAX — the SAME
// cap scripts/build-sitemap.mjs uses, so head-hreflang and sitemap-hreflang agree.
const AR_CORPUS_MAX = Number(process.env.AR_CORPUS_MAX ?? 60);
/** @type {Map<string, {title?:string, description?:string, jsonLd?:object, ogType?:string}>} */
const seoAr = new Map();
const putAr = (path, desc) => seoAr.set(normalizePath(path), desc);
const ar = readJson('src/i18n/ar.json');
const tIn = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// Arabic defaults for content routes that carry no i18n meta key (legal/util
// pages). English keeps its constant defaults above.
const DEFAULT_TITLE_AR = tIn(ar.meta, 'home') ?? DEFAULT_TITLE;
const DEFAULT_DESC_AR = tIn(ar.metaDesc, 'home') ?? DEFAULT_DESC;

const PRIVATE = new Set(['/account', '/dashboard', '/currency', '/logbook', '/records', '/settings']);
const REDIRECTS = new Set(['/guides', '/study']);

// Static pages: route → i18n meta key (under <bundle>.meta / .metaDesc). Routes
// not listed still get canonical/hreflang/og injected, just keep the default title.
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

// Route sources are enumerated once — the *routes* are identical across languages;
// only the copy (from the bundle) and the JSON-LD url/inLanguage (from `lang`) differ.
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
for (const p of routerPaths) {
  if (p.includes(':') || p === '*') continue;
  const norm = normalizePath(p === '/' ? '/' : `/${p.replace(/^\//, '')}`);
  if (PRIVATE.has(norm) || REDIRECTS.has(norm)) continue;
  const key = STATIC_META[norm];
  const title = key ? tIn(en.meta, key) : undefined;
  const description = key ? tIn(en.metaDesc, key) : undefined;
  put(norm, {
    title,
    description,
    ...(COURSE_ROUTES.has(norm)
      ? { jsonLd: courseLd({ title, description, path: norm }) }
      : {}),
  });
  const titleAr = key ? tIn(ar.meta, key) : undefined;
  const descAr = key ? tIn(ar.metaDesc, key) : undefined;
  putAr(norm, {
    title: titleAr,
    description: descAr,
    ...(COURSE_ROUTES.has(norm)
      ? { jsonLd: courseLd({ title: titleAr, description: descAr, path: norm, lang: 'ar' }) }
      : {}),
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
  const titleAr = tIn(ar, `tools.items.${id}.name`);
  const descAr = tIn(ar, `tools.items.${id}.blurb`);
  putAr(path, {
    title: titleAr,
    description: descAr,
    jsonLd: softwareAppLd({ title: titleAr, description: descAr, path }),
  });
}

// Guides → name/blurb from i18n + Article (drafts excluded, like the sitemap).
const toolIds = [
  ...read('src/lib/tools.ts').matchAll(/\bt\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'live'/g),
].map((m) => m[1]);
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
  put(path, {
    title,
    description,
    jsonLd: articleLd('Article', { title, description, path }),
    ogType: 'article',
  });
  const titleAr = tIn(ar, `guides.items.${slug}.name`);
  const descAr = tIn(ar, `guides.items.${slug}.blurb`);
  putAr(path, {
    title: titleAr,
    description: descAr,
    jsonLd: articleLd('Article', { title: titleAr, description: descAr, path, lang: 'ar' }),
    ogType: 'article',
  });
}

// Library reader corpus → title (+ revision date) from the data indexes + TechArticle.
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
// Corpus docs are ordered parts → reference → handbook so the highest-value docs
// win the Arabic budget — the same ordering scripts/build-sitemap.mjs uses.
let arCorpusCount = 0;
for (const [base, file] of [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
]) {
  const idx = readJson(file);
  // Fall back to the index's generated date when a doc carries no date-shaped
  // effectiveDate/revision — mirrors src/pages/library/Document.tsx at runtime.
  const fallback = isDate(idx.generated) ? idx.generated.slice(0, 10) : undefined;
  for (const d of idx.documents) {
    const path = `${base}/${d.slug}`;
    const dateModified = isDate(d.effectiveDate)
      ? d.effectiveDate.slice(0, 10)
      : isDate(d.revision)
        ? d.revision.slice(0, 10)
        : fallback;
    const descriptor = {
      title: d.title,
      jsonLd: articleLd('TechArticle', { title: d.title, path, dateModified }),

/**
 * Content/UI descriptors (static pages + tools + guides) for one language bundle.
 * Titles/descriptions come from `bundle`; JSON-LD url + inLanguage from `lang`.
 * The library reader corpus is English-only and appended separately (its bodies
 * are regulation text — see SEO-PLAN 0.3 route scope).
 * @returns {Map<string, {title?:string, description?:string, jsonLd?:object, ogType?:string}>}
 */
function contentDescriptors(bundle, lang) {
  const map = new Map();
  const put = (path, desc) => map.set(normalizePath(path), desc);

  for (const p of routerPaths) {
    if (p.includes(':') || p === '*') continue;
    const norm = normalizePath(p === '/' ? '/' : `/${p.replace(/^\//, '')}`);
    if (PRIVATE.has(norm) || REDIRECTS.has(norm)) continue;
    const key = STATIC_META[norm];
    const title = key ? tIn(bundle.meta, key) : undefined;
    const description = key ? tIn(bundle.metaDesc, key) : undefined;
    put(norm, {
      title,
      description,
      ...(COURSE_ROUTES.has(norm)
        ? { jsonLd: courseLd({ title, description, path: norm, lang }) }
        : {}),
    });
  }

  for (const id of toolIds) {
    const path = `/tools/${id}`;
    const title = tIn(bundle, `tools.items.${id}.name`);
    const description = tIn(bundle, `tools.items.${id}.blurb`);
    put(path, { title, description, jsonLd: softwareAppLd({ title, description, path, lang }) });
  }

  for (const slug of guideSlugs) {
    if (draftGuides.has(slug)) continue;
    const path = `/guides/${slug}`;
    const title = tIn(bundle, `guides.items.${slug}.name`);
    const description = tIn(bundle, `guides.items.${slug}.blurb`);
    put(path, {
      title,
      description,
      jsonLd: articleLd('Article', { title, description, path, lang }),
      ogType: 'article',
    };
    put(path, descriptor);
    // The reader body is the English GACAR text; the Arabic snapshot wraps it in
    // Arabic chrome + RTL. Keep the English doc title + inLanguage 'en' — the
    // underlying document is the same English regulation, so that's honest.
    if (arCorpusCount < AR_CORPUS_MAX) {
      putAr(path, descriptor);
      arCorpusCount++;
    }
  }
  return map;
}

/** Library reader corpus (English only) → title (+ revision date) + TechArticle. */
function corpusDescriptors() {
  const map = new Map();
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
  for (const [base, file] of [
    ['/library', 'public/data/gacar-index.json'],
    ['/library/reference', 'public/data/reference-index.json'],
    ['/library/handbook', 'public/data/ebooks-index.json'],
  ]) {
    const idx = readJson(file);
    // Fall back to the index's generated date when a doc carries no date-shaped
    // effectiveDate/revision — mirrors src/pages/library/Document.tsx at runtime.
    const fallback = isDate(idx.generated) ? idx.generated.slice(0, 10) : undefined;
    for (const d of idx.documents) {
      const path = `${base}/${d.slug}`;
      const dateModified = isDate(d.effectiveDate)
        ? d.effectiveDate.slice(0, 10)
        : isDate(d.revision)
          ? d.revision.slice(0, 10)
          : fallback;
      map.set(normalizePath(path), {
        title: d.title,
        jsonLd: articleLd('TechArticle', { title: d.title, path, dateModified }),
        ogType: 'article',
      });
    }
  }
  return map;
}

// English = content + corpus (clean paths); Arabic = content only (under /ar).
const enSeo = new Map([...contentDescriptors(en, 'en'), ...corpusDescriptors()]);
const arSeo = contentDescriptors(ar, 'ar');

// --- Head transform ------------------------------------------------------------
/** Replace a tag matching `re` with `tag`, or insert `tag` before </head> if absent. */
function setTag(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

// The Arabic home hero, built from ar.json (mirrors the English shell hero, whose
// copy tracks en.home.*). CTAs point at the Arabic documents so the Arabic home's
// internal links keep the crawler inside the Arabic set.
function arHero() {
  const h = ar.home;
  return `<div id="app-shell">
        <div class="s-inner">
          <p class="s-eyebrow">${esc(h.eyebrow)}</p>
          <h1>${esc(h.title)}</h1>
          <p class="s-sub">${esc(h.subtitle)}</p>
          <div class="s-cta">
            <a class="s-btn primary" href="/ar/library">${esc(h.ctaLibrary)}</a>
            <a class="s-btn ghost" href="/ar/chat">${esc(h.ctaChat)}</a>
          </div>
        </div>
      </div>`;
}

function render(path, d, lang = 'en') {
  const isAr = lang === 'ar';
  const fullTitle = d.title
    ? `${d.title} — ${SUFFIX}`
    : isAr
      ? DEFAULT_TITLE_AR
      : DEFAULT_TITLE;
  const desc = d.description ?? (isAr ? DEFAULT_DESC_AR : DEFAULT_DESC);
  // In Arabic the page self-canonicalizes to its own `/ar` document; x-default
  // always targets the clean, param-free URL.
  const canonical = isAr ? arUrl(path) : canonicalUrl(path);
  const cleanUrl = canonicalUrl(path);
  let html = shell;

  if (isAr) html = html.replace('<html lang="en" dir="ltr">', '<html lang="ar" dir="rtl">');
  const canonical = canonicalUrl(path, lang);
  let html = shell;

  // Flip the document to Arabic/RTL so a no-JS crawler reads the /ar page as Arabic.
  if (isAr) html = html.replace(/<html[^>]*>/, '<html lang="ar" dir="rtl">');

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = setTag(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(desc)}" />`,
  );
  html = setTag(html, /<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
  // The same hreflang cluster on every language variant: en (clean), ar (/ar),
  // x-default (clean). Mirrors src/lib/seo.ts hreflangAlternates.
  for (const [hreflang, href] of [
    ['en', cleanUrl],
    ['ar', arUrl(path)],
    ['x-default', cleanUrl],
    ['en', canonicalUrl(path, 'en')],
    ['ar', canonicalUrl(path, 'ar')],
    ['x-default', canonicalUrl(path, 'en')],
  ]) {
    html = setTag(
      html,
      new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${hreflang}"[^>]*>`),
      `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
    );
  }
  const image = ogImageFor(path);
  html = setTag(html, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${d.ogType ?? 'website'}" />`);
  html = setTag(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(fullTitle)}" />`);
  html = setTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = setTag(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  html = setTag(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`);
  // The Arabic snapshot declares its locale so scrapers file it under ar_SA (the
  // English default already omits og:locale; usePageMeta sets it at runtime).
  if (isAr) html = setTag(html, /<meta\s+property="og:locale"[^>]*>/, `<meta property="og:locale" content="ar_SA" />`);
  html = setTag(html, /<meta\s+property="og:locale"[^>]*>/, `<meta property="og:locale" content="${ogLocale(lang)}" />`);
  // Explicit Twitter tags mirror the Open Graph values (see usePageMeta).
  html = setTag(html, /<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(fullTitle)}" />`);
  html = setTag(html, /<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
  html = setTag(html, /<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${image}" />`);

  if (d.jsonLd) {
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json" data-managed-ld>${JSON.stringify(d.jsonLd)}</script>\n  </head>`,
    );
  }

  // Strip the home hero on non-home routes so crawlers don't read homepage
  // content on every path (the runtime script does the same once JS runs). On the
  // Arabic home, swap the English hero for the Arabic one.
  if (normalizePath(path) !== '/') {
  // Strip the home hero on non-home routes, and on *every* Arabic page — the hero
  // is baked English copy in the shell, so a no-JS Arabic reader must never see it
  // (the runtime script strips it too once JS runs).
  if (normalizePath(path) !== '/' || isAr) {
    html = html.replace(/<div id="app-shell">[\s\S]*?<\/script>\s*/, '');
  } else if (isAr) {
    html = html.replace(/<div id="app-shell">[\s\S]*?<\/script>\s*/, arHero());
  }
  return html;
}

let written = 0;
for (const [path, d] of seo) {
  const file =
    path === '/' ? shellPath : join(root, 'dist', path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(path, d, 'en'));
  written++;
}

// Arabic siblings at dist/ar/<path>/index.html — the real per-language documents
// Firebase can route to (it strips `?lang=`, so the query variant can never be a
// distinct file). These are the crawler-facing Arabic bodies; scripts/prerender.mjs
// later overwrites them with hydrated content on hosts that have a browser.
let writtenAr = 0;
for (const [path, d] of seoAr) {
  const rel = path === '/' ? 'ar/index.html' : `ar/${path.replace(/^\//, '')}/index.html`;
  const file = join(root, 'dist', rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(path, d, 'ar'));
  writtenAr++;
}
console.log(`prerender-head: wrote ${written} en + ${writtenAr} ar route snapshots (origin ${SITE})`);
/** Write a descriptor map to dist, under /ar for Arabic. Returns the count. */
function writeSnapshots(map, lang) {
  const arDir = lang === 'ar';
  let n = 0;
  for (const [path, d] of map) {
    let file;
    if (path === '/') {
      file = arDir ? join(root, 'dist/ar/index.html') : shellPath;
    } else {
      const rel = path.replace(/^\//, '');
      file = arDir
        ? join(root, 'dist/ar', rel, 'index.html')
        : join(root, 'dist', rel, 'index.html');
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, render(path, d, lang));
    n++;
  }
  return n;
}

const enWritten = writeSnapshots(enSeo, 'en');
const arWritten = writeSnapshots(arSeo, 'ar');
console.log(
  `prerender-head: wrote ${enWritten} en + ${arWritten} ar route snapshots (origin ${SITE})`,
);
