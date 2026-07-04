# Fly GACA — 2026 SEO plan

The working backlog for search + AI-answer visibility. Execute items with Claude Code — the `flygaca-seo` skill (`.claude/skills/flygaca-seo/`) carries the playbook, repo conventions, and per-topic references; each item below has a paste-ready prompt. Tick items as they land, note the date, keep this file honest.

**The 2026 thesis:** AI answers (Google AI Overviews/AI Mode, ChatGPT, Perplexity, Gemini) absorb roughly half the clicks that used to reach #1 results; visibility = being the *cited source*. AI crawlers don't execute JavaScript, so the prerender pipeline is the single most important SEO asset. Citability = crawlable HTML → answer-first structure → verifiable facts (cite the GACAR Part/section — our home turf) → freshness (the 28-day AIRAC cycle is a gift) → E-E-A-T/brand footprint → schema. Deprioritized on 2026 evidence: llms.txt tooling (AI crawlers essentially never fetch it), mass-generated content (demoted), `/ar/` path migration (revisit only if 0.3's chosen fix proves insufficient).

Legend: **P0** do first · effort S <½ day, M ~1 day, L multi-day · every item ends with `npm run verify` green and this file updated.

---

## Phase 0 — Verify & harden the crawl foundation (P0)

- [ ] **0.1 No-JS visibility audit (S).** New `scripts/audit-ai-visibility.mjs`: fetch ~25 production URLs (every route type × both languages) as GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot/browser; assert expected body text; print a coverage table.
  Prompt: *"Using the flygaca-seo skill, build scripts/audit-ai-visibility.mjs per SEO-PLAN item 0.1 and run it against https://flygaca.com."*
- [x] **0.2 Prerender coverage gate (M). DONE 2026-07-03.** The gap was larger than first measured: the sitemap indexes ~530 URLs but `prerender.mjs` only enumerated base routes + the library corpus under a 400 cap — missing 5 capped library docs **plus all 121 aerodrome pages and 6 pack pages** (never enumerated at all). Shipped: (a) `prerender.mjs` now enumerates every sitemap-indexed dynamic route (corpus → aerodromes → packs, citation-value order), default cap 560 (532 needed today, 28 headroom), loud warning on any trim; (b) new `scripts/check-prerender-coverage.mjs` — fails the deploy if any sitemap URL ships missing or head-only (`<footer>` = body marker; `PRERENDER_COVERAGE_LENIENT=1` emergency escape hatch); (c) wired as `npm run check:prerender` into `deploy`/`deploy:all` and as a fatal step in `.github/workflows/deploy.yml`. Verified: gate fixture-tested (fail/pass/lenient), full-repo typecheck + lint/prettier on changed files green, route math confirmed. **Not run here** (sandbox memory limits): full vitest suite + vite build — run `npm run verify` once before committing (changes touch no app source, so risk is low). **Note:** next deploy prerenders 532 routes (~+130 vs before) — expect a longer prerender step.
- [ ] **0.3 Arabic variant prerender (M). CONFIRMED STRUCTURAL GAP (2026-07-03):** static hosts resolve files by path only, so under the `?lang=` model Arabic bodies are never served prerendered — no-JS crawlers always get the default-language body. Decide the mechanism (dual-render Arabic snapshots to distinct paths + serving strategy, or revisit the URL model for content routes) and implement. Gates all of Phase 3.
  Prompt: *"Per flygaca-seo plan item 0.3, analyze the options for making ?lang=ar content crawler-visible and implement the chosen one."*
- [ ] **0.4 robots/headers bot posture (S).** Explicit Allow stanzas for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot in `public/robots.txt`; audit `_headers`/`_redirects`/`firebase.json` for anything challenging bot UAs; confirm mirrors stay noindex.

## Phase 1 — Answer-first content layer (P0–P1)

- [ ] **1.1 KeyFacts component (M).** Bilingual "Key facts" block (3–6 self-contained factual bullets + governing Part/section) under the H1 of guides and Part landings; i18n-fed; wired into JSON-LD via `usePageMeta`. Ship on one guide as the pattern-setter.
- [ ] **1.2 FAQ rollout (M).** Visible FAQ + `faqLd` FAQPage schema on the four money guides (licensing, medical, conversion, ELP). Each answer self-contained with its own GACAR citation + verify-against-GACA caveat (both languages — Arabic caveat written natively). Source questions from Captain Adel logs + GSC.
- [ ] **1.3 Answer-first rewrite of money pages (L).** H1 as-searched, answer complete in first ~200 words, tables for enumerables, provenance footer — EN and AR authored separately.
- [ ] **1.4 Part landing summaries (L).** Human summary per GACAR Part landing (what it covers, who it applies to, key sections). Top-15 Parts first, batchable.
- [ ] **1.5 Glossary (M).** Bilingual GACAR/aviation glossary page with `DefinedTermSet` schema, ≥50 terms, internally linked, in sitemap.

## Phase 2 — Structured data upgrades (P1)

- [ ] **2.1 BreadcrumbList site-wide (S).** `breadcrumbLd` from route ancestry on all content routes, localized names, mirrored in the no-JS layer (`prerender-head.mjs`).
- [ ] **2.2 dateModified/dateReviewed everywhere (M).** From real corpus metadata (AIRAC date, sync date, review date); same date visible on-page.
- [ ] **2.3 Course/LearningResource for Ground School (M).** Course → hasCourseInstance; lessons as LearningResource (`teaches`, `inLanguage`).
- [ ] **2.4 Organization entity hygiene (S).** `sameAs` real profiles, `contactPoint` i@flygaca.com, consistent name/logo. No accreditation claims.
- [ ] **2.5 JSON-LD validation in CI (M).** Vitest specs per builder + `scripts/validate-jsonld.mjs` walking prerendered dist; chain into verify/CI.

## Phase 3 — Arabic as a first-class search track (P1, gated on 0.3)

- [ ] **3.1 Arabic keyword & intent pass (M).** Research Arabic queries natively (not translations); rewrite AR titles/descriptions for money pages; document the query→URL map here.
- [ ] **3.2 hreflang refinement (S).** Consider `ar-SA` alongside `ar`; head and sitemap alternates identical; `x-default` = parameterless URL.
- [ ] **3.3 Arabic answer-first content (L).** AR KeyFacts/FAQ/answer blocks in MSA with Gulf awareness; Arabic added to the quarterly assistant audit.

## Phase 4 — Performance / CWV (P1–P2)

- [ ] **4.1 Field-data plumbing (S).** `web-vitals` reporting into own analytics (Firebase is primary — don't rely on the Vercel mirror's Speed Insights); GSC CWV monthly.
- [ ] **4.2 INP audit & fixes (M).** Library search input path (debounce/chunk/worker), calculators, language/RTL toggle — UI-first updates, heavy work deferred; target <200ms field INP.
- [ ] **4.3 Content-page LCP & CLS pass (M).** LCP element = server-present text on library/guide templates; reserve space for lazy blocks; test both RTL/LTR.

## Phase 5 — Freshness & indexing ops (P1–P2)

- [ ] **5.1 AIRAC freshness loop (M).** Aerodrome/chart pages show current AIRAC cycle + last-reviewed; `dateModified` bumps from the data pipeline each cycle; sitemap `lastmod` truthful.
- [ ] **5.2 IndexNow on deploy (S).** Post-deploy ping with changed URLs (Bing/Copilot ecosystem; Google ignores it — sitemaps cover Google).
- [ ] **5.3 Quarterly refresh calendar (recurring).** Top ~20 pages re-verified/refreshed quarterly (AI citation decay ~3 months). Log dates here.
- [ ] **5.4 AI-visibility measurement (recurring).** Analytics segment for AI referrers (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com); quarterly assistant audit EN+AR (10 canonical questions, log citations).

## Phase 6 — E-E-A-T & off-site authority (P1–P2, largely non-code)

- [ ] **6.1 About/methodology page (M).** Who builds it, how content is processed from GACA sources, update cadence, corrections policy, contact; footer-linked; `AboutPage` schema.
- [ ] **6.2 Provenance component (S).** "Source: GACAR Part X §Y — verify at gaca.gov.sa · last reviewed DATE" on all content pages.
- [ ] **6.3 Off-site presence programme (recurring, human-led).** Honest participation where Saudi/GCC aviation students gather (Reddit, PPRuNe ME, X, flight-school communities); partnerships with schools/instructors; original-data releases (AIRAC change notes, aerodrome dataset). No astroturfing — LLMs learn brands from these surfaces, and one exposed fake thread costs more than a hundred honest answers earn.
- [ ] **6.4 Entity grounding (S).** Consistent naming/profiles; Wikidata entry; Wikipedia only if genuinely notable.

---

**Suggested order:** 0.1 → 0.2 → 0.3 → 0.4 → 1.1 → 1.2 → 1.3 (2.1/2.2/2.5 alongside) → 3.x → 1.4/1.5 → 4.x → 5.x → 6.x. Items 5.3/5.4/6.3 recur.

**Log**
- 2026-07-03 — Plan created. Items 0.2 and 0.3 confirmed as live issues during skill eval runs against repo copies.
- 2026-07-03 — **0.2 shipped**: full sitemap↔prerender enumeration parity (adds 121 aerodromes + 6 packs + 5 capped library docs), cap 400→560, fatal coverage gate (`check:prerender`) in deploy + CI. Follow-up: run `npm run verify` before committing; 0.3 (Arabic bodies) is next and now has a gate to build against.
