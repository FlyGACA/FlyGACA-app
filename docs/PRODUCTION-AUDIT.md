# Production Audit — Pre-flight Checklist

A re-runnable pre-flight audit of the Fly GACA frontend build, covering the build pipeline,
PWA/offline behaviour, SEO/metadata/legal separation, and environment/CORS posture. Run it before
a tier transition, a major release, or any wider rollout.

> **Stack note.** This repo is a **Vite + React + TypeScript SPA** (frontend only). Some generic
> pre-flight advice assumes Astro/Next.js SSR, a NestJS backend, or a self-hosted vector store —
> none apply here. Those rows are marked **N/A** with the real equivalent. The backend (Firebase
> Functions gateway) and the Captain Adel RAG service live in the separate `flygaca/flygaca` repo
> and are out of scope for this audit.

**Last run:** 2026-06-27 · against `dist/` from `npm run build` · headless Chromium against
`npm run preview` (`:4173`). Re-run the commands in [§6](#6-how-to-re-run-this-audit) to refresh.

---

## Summary

| Area | Status | Headline evidence |
| --- | --- | --- |
| Build & verify pipeline | ✅ Pass | `npm run verify` green: typecheck + lint + format + 669 tests + build + bundle gate |
| Initial JS bundle | ✅ Pass (⚠️ tight) | **158.1 kB gz** of **160 kB** budget (98.8%) — within, but little headroom |
| PWA / offline shell | ✅ Pass | SW active & controlling; offline reload + SPA nav + hard `navigateFallback` all render the shell |
| Core Web Vitals | ✅ Pass | **CLS 0.0014**, FCP 64 ms, LCP 64 ms (mobile viewport) |
| SEO / metadata | ✅ Pass | Full title/description/OG/canonical/hreflang/JSON-LD prerendered, distinct per route |
| GACA legal separation | ✅ Pass | "Not affiliated" in head + footer + legal page; mirror hosts `noindex` |
| Env-var isolation | ✅ Pass | All `VITE_*` public; only `.env.example` committed; documented in RUNBOOK |
| CORS / API origin | ✅ Pass (by design) | Same-origin `/api/*` proxy to Firebase; strict CSP `connect-src 'self'` |

**Net:** the build is production-ready. The one item to watch is the **bundle budget margin**
(see [§1](#1-technical--build-pipeline)). No code gaps were found during this audit.

---

## 1. Technical & build pipeline

### `npm run verify` — full gate

`verify` chains the exact CI gates (`typecheck → lint → format:check → test → build → check:bundle`).
Last run: **green**.

| Stage | Result |
| --- | --- |
| `tsc -b --noEmit` (typecheck) | ✅ no errors |
| `eslint .` | ✅ clean |
| `prettier --check` | ✅ clean |
| `vitest run` | ✅ **99 files, 669 tests passed** |
| `vite build` | ✅ built; emits `dist/` |
| `check:bundle` | ✅ within budget (below) |

Build also emits at the end of `npm run build`:
- **PWA:** `dist/sw.js` + `dist/workbox-*.js`, **229 precache entries (~4.0 MiB)**.
- **Prerender:** `prerender-head.mjs` wrote **402 route head snapshots** (origin `https://flygaca.com`).

### Bundle size

The checklist target ("initial client JS under 100 kB") is generic; this repo enforces its own
**160 kB gzipped** ceiling on the initial path via `scripts/check-bundle.mjs` (measures the entry
chunk + modulepreloaded vendor chunks referenced by `dist/index.html`; route chunks are lazy and
excluded by design). Measured:

| Initial chunk | gz |
| --- | --- |
| `index-*.js` (entry) | 75.5 kB |
| `vendor-react-*.js` (react, react-dom, react-router) | 66.7 kB |
| `vendor-i18n-*.js` (i18next, react-i18next) | 16.0 kB |
| **Total** | **158.1 kB / 160 kB budget** |

✅ Within budget. ⚠️ **At 98.8% of budget there is ~1.9 kB of headroom** — a single new top-level
import can break CI. Heavy/optional code is already kept off the initial path: every route except
Home is `React.lazy`-split (`src/router.tsx`), and framer-motion is deliberately folded into the
lazy `HomeDashboard` chunk (`vite.config.ts`). **Recommendation:** keep new dependencies behind
route-level lazy imports; if the margin needs widening, consider splitting i18n message bundles
(`en`/`ar` JSON are already separate async chunks) or trimming the entry chunk before raising the
budget.

### Data corpus is never bundled (SSR-equivalent)

The "use SSR so phones don't download megabytes of data" item is satisfied differently: the
~129 MB `/data/` corpus (regulatory HTML, `library-search.json` ~19 MB, `airports-extra.json`
~21 MB, `rag-chunks.json` ~15 MB) **never enters the JS bundle**. It is fetched at runtime via
`src/lib/content.ts` (`fetchJson` / `loadJson`) and `useFetchJson`, with a session-scoped
de-dupe cache. Build-time head prerendering (`prerender-head.mjs`) gives crawlers a fully-formed
`<head>` per route without an SSR server.

> **N/A — server-side bundle ballooning / serverless exec time.** No SSR server in this repo; the
> app is static `dist/` served by Firebase Hosting + mirrors.
> **N/A — vector ingestion / search-refresh latency.** The RAG/vector service is a separate repo
> and backend; not auditable here.

---

## 2. PWA & cockpit (offline) environment

Verified against the **production build** (`npm run preview`, real Workbox SW) driven by headless
Chromium — the "Airplane Mode" emulation, automated.

| Check | Result | Evidence |
| --- | --- | --- |
| Service worker registers & activates | ✅ | `swReady: active`, `controller: true` after one reload |
| Offline **reload** of current route | ✅ | shell renders, `title` intact, header/nav present |
| Offline **SPA navigation** (`/` → `/tools`) | ✅ | shell renders client-side |
| Offline **hard navigation** to precached route (`/tools/crosswind`) | ✅ | `navigateFallback: index.html` serves the shell |
| App shell precached, **`/data/` excluded** | ✅ | 229 precache entries; `0` `/data/` URLs in the precache manifest; `/data/` appears only in the `NetworkFirst` route handler |
| Explicit offline UX (no browser crash page) | ✅ | app shows an **"Offline" badge** instead of `ERR_INTERNET_DISCONNECTED` |

Screenshots from the run (in `/tmp/shots/`): `online-home.png`, `offline-home.png`,
`offline-tools.png`, `offline-crosswind.png`. The offline home shot shows the full chrome + hero +
the "Offline" pill rendering with the network disabled.

Caching strategy (`vite.config.ts`): app shell precached (`globPatterns` js/css/woff2/img +
`index.html`, `globIgnores: ['**/data/**']`); `/data/*` is **NetworkFirst** with a 3 s timeout and
a two-tier cache (`flygaca-data-heavy` for the big JSON/charts vs `flygaca-data` for regs) so heavy
files can't evict regulatory docs. `registerType: 'prompt'` surfaces an in-app update toast.

---

## 3. Core Web Vitals (Lighthouse-style)

Measured in-browser (mobile viewport 390×844) against the preview build. Real Lighthouse is not
installed in CI; these are the load-time field signals it would report.

| Metric | Value | "Good" threshold | Status |
| --- | --- | --- | --- |
| **CLS** (cumulative layout shift) | **0.0014** | < 0.1 | ✅ excellent |
| FCP (first contentful paint) | 64 ms | < 1.8 s | ✅ |
| LCP (largest contentful paint) | 64 ms | < 2.5 s | ✅ |
| DOMContentLoaded | 75 ms | — | ✅ |

The checklist specifically flagged **CLS** for high-vibration cockpit use ("long legal texts push
UI down while a pilot is tapping"). Measured CLS is **0.0014** — effectively zero; the layout does
not jump as content loads.

> Note: paint/LCP figures are from a localhost preview and are best-case; treat them as a
> "no regression" signal, not a substitute for a CrUX/field Lighthouse run on the live domain. For
> a true mobile-network number, run Lighthouse against `https://flygaca.com` from Chrome DevTools.

---

## 4. SEO, metadata & legal-risk mitigation

The "GACA" name requires watertight defensive separation from the official authority. Verified in
the **prerendered** `dist/index.html` and per-route snapshots (rendered, not just source).

| Tag / signal | Present | Notes |
| --- | --- | --- |
| `<title>` | ✅ | `Saudi Aviation Library — Fly GACA`; distinct per route (e.g. `Crosswind & headwind — Fly GACA`) |
| `meta description` | ✅ | includes "Independent and educational; not affiliated with GACA." |
| OpenGraph (`og:title`/`description`/`type`/`url`/`image`) | ✅ | per-route `og:title` + `og:url`; section-specific OG cards via `src/lib/seo.ts` |
| Twitter card | ✅ | `summary_large_image` |
| Canonical | ✅ | clean path, no `?lang=`; distinct per route |
| hreflang (en / ar / x-default) | ✅ | bilingual alternates |
| JSON-LD structured data | ✅ | Organization + WebSite in shell; per-route Article/Course/Tool/Breadcrumb (`src/lib/jsonld.ts`) |
| `manifest` / `theme-color` / `html lang`+`dir` | ✅ | `lang="en" dir="ltr"`, flips to RTL for Arabic |
| `robots.txt` / `sitemap.xml` | ✅ | `public/robots.txt` allows + declares sitemap; `public/sitemap.xml` bilingual |
| Mirror-host `noindex` | ✅ | `*.web.app` / `*.vercel.app` / `*.netlify.app` / `*.pages.dev` get `noindex, follow` (`src/main.tsx` + `isMirrorHost` in `src/lib/seo.ts`) so only the canonical domain is indexed |

Legal separation copy: the not-affiliated disclaimer is centralised in `src/components/Disclaimer.tsx`
(never inlined/reworded) and appears in the footer on every page, on calculator/pricing/schools
pages, and as a full legal page at `/disclaimer`. The provided example tag block matches the
deployed semantics (title/description/OG); the live copy is the current, slightly richer wording.

---

## 5. Operational checks

| Item | Status | Evidence |
| --- | --- | --- |
| Env vars isolated (prod vs dev) | ✅ | every var is `VITE_*` (public, non-secret); only `.env.example` is committed (secrets blank); per-platform values documented in `docs/RUNBOOK-deploy.md`. `VITE_FIREBASE_EMULATOR` must stay **unset** in prod. Build does not crash with vars unset — Firebase simply runs local-first (`isFirebaseConfigured()`). |
| CORS / no public wildcard | ✅ (by design) | Frontend has no CORS middleware — none needed. Every mirror (Vercel/Cloudflare/Netlify) **proxies `/api/*` same-origin** to the Firebase gateway (`firebase.json` rewrites; `vercel.json`/`netlify.toml`/`worker/index.ts`). Browser only ever sees `/api` on the current origin. |
| Strict CSP | ✅ | `connect-src 'self' https://*.googleapis.com …` (no wildcard `*`), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` (`firebase.json`, mirrored across fronts). |
| API base configurable | ✅ | `VITE_API_BASE` defaults to `/api` (`src/lib/api.ts`); App Check token attached when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is set. |

> **N/A — NestJS backend / subdomain `api.flygaca.com` CORS.** Backend is Firebase Functions
> (region `me-central2`), co-located with hosting and reached via same-origin rewrite, so the
> "allow apex, block wildcard" CORS concern does not arise.

---

## 6. How to re-run this audit

```bash
# 0. Deps (first run / fresh container)
npm ci

# 1. Build + static gate — typecheck, lint, format, 669 tests, build, bundle budget
npm run verify
#   → read the "Initial JS (entry + preloaded vendor chunks)" total vs the 160 kB budget
#   → confirm "Test Files NN passed" and "✓ Within budget."

# 2. Inspect the prerendered head (real meta, not source)
grep -iE '<title>|og:|canonical|hreflang|application/ld' dist/index.html
#   spot-check a route snapshot:
grep -oE '<title>[^<]*</title>' dist/tools/crosswind/index.html

# 3. Confirm the SW excludes the corpus (expect 0)
grep -oE '\{revision:[^}]*url:"/data/[^"]+"\}' dist/sw.js | wc -l

# 4. Runtime / offline / CWV — serve the build and drive Chromium
npm run preview &                                   # http://localhost:4173
#   then run the offline + metrics probes (see this PR's audit run), which:
#   - warm the SW, set the context offline, reload + navigate → expect the shell renders
#   - measure CLS / FCP / LCP (target CLS < 0.1)
pkill -f vite                                        # stop preview when done
```

For a true field-network read, also run **Chrome DevTools → Lighthouse → Mobile** against
`https://flygaca.com` and watch CLS and LCP.

---

_This document records the state at the last-run timestamp above. Re-run §6 and update the
Summary table before each major release._
