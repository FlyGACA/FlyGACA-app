---
name: flygaca-seo
description: The 2026 SEO/AI-search playbook for flygaca.com (the FlyGACA-app repo). Use this skill whenever the user mentions SEO, search visibility, Google, AI Overviews, getting cited by ChatGPT/Perplexity/Gemini, GEO/AEO, meta tags, structured data, JSON-LD, schema, sitemap, robots.txt, llms.txt, hreflang, prerendering, Core Web Vitals/INP/LCP, page titles/descriptions, OG images, or asks to make pages "rank", "show up", "get found", or "get cited" — even if they never say the word "SEO". Also use it when executing any item from SEO-PLAN.md.
---

# Fly GACA SEO (2026)

Playbook for search and AI-answer visibility work in the FlyGACA-app repo. It encodes two things: **how search works in 2026** (so decisions aim at the right target) and **where SEO lives in this codebase** (so changes land in the right files, the first time).

## The 2026 target

Classic rankings still matter, but the growth surface is AI answers. Where Google shows an AI Overview, clicks to the #1 organic result drop by roughly half — the winners are the **sources the answer cites**. ChatGPT, Perplexity, Gemini and Copilot behave the same way: they quote a handful of pages and send everyone else nothing.

What earns citations, in rough priority order:

1. **Crawlable HTML.** AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) mostly do **not** execute JavaScript. If the prerendered HTML doesn't contain the content, the page does not exist to them. This repo's prerender pipeline is therefore the single most important SEO asset — protect it.
2. **Answer-first structure.** The first ~150–200 words of a page should directly answer the query the page targets, then elaborate. Facts in lists and tables get extracted; buried prose doesn't.
3. **Verifiability.** Dated facts with named sources. Fly GACA's whole ethos — cite the exact GACAR Part/section, point back to GACA — is precisely what AI systems reward. Lean into it.
4. **Freshness.** AI citation rates decay sharply once content looks ~3 months stale. The 28-day AIRAC cycle is a built-in freshness engine — surface it.
5. **E-E-A-T and brand footprint.** Who runs the site, how content is produced, corrections policy — plus brand mentions on the wider web (forums, Reddit), which is where LLMs learn who to trust. Mentions count even unlinked.
6. **Schema.** JSON-LD (especially FAQPage, BreadcrumbList, dateModified) helps machines interpret and attribute. It supports 1–5; it doesn't replace them.

Not worth further investment: llms.txt (measurement across hundreds of millions of AI-bot hits shows the file is almost never fetched and has no correlation with citations — keep ours updated, spend nothing more on it), keyword-stuffed pages, exact-match-domain tricks, bulk AI-generated content (Google now demotes it; every page needs human editorial value).

## Where SEO lives in this repo

| Concern | Location |
|---|---|
| Per-route title/description/canonical/hreflang/OG/JSON-LD | `src/lib/usePageMeta.ts` (+ `src/lib/seo.ts` for SITE_ORIGIN & alternates, `src/lib/jsonld.ts` for schema builders) |
| Baseline head for no-JS crawlers | `index.html` (kept in sync with `src/lib/seo.ts` — comments in both mark the pairing) |
| Guaranteed head snapshots per route | `scripts/prerender-head.mjs` — runs inside `npm run build`, no browser needed |
| Full-body prerender (the AI-visibility layer) | `scripts/prerender.mjs` (Playwright) — runs inside `npm run deploy` before `firebase deploy` |
| Sitemap (≈530 URLs with hreflang) | `scripts/build-sitemap.mjs` → `public/sitemap.xml` |
| Crawl control | `public/robots.txt`, `public/_headers`, `public/_redirects`, `firebase.json` |
| llms.txt | `public/llms.txt` |
| OG images | `scripts/build-og-images.mjs` → `public/img/og-*.png` (1200×630) |
| Content corpus | `public/data/` (fetched at runtime — never bundled); guide scaffold: `npm run new:guide` |
| i18n copy | `src/i18n/en.json` + `ar.json` — parity enforced by `tests/i18n-parity.test.ts` |

Language model: one URL per page, `?lang=en` / `?lang=ar` variants declared via hreflang. Primary host is Firebase; Vercel/Netlify mirrors are `noindex`. Deploys must go through `npm run deploy` (or `deploy:all`) or the body prerender is skipped.

## Operating rules (non-negotiable)

These come from `CLAUDE.md` and exist to keep the site trustworthy and bilingual — which is itself SEO in 2026:

- **Every visible string is bilingual.** New copy → keys in both `en.json` and `ar.json`. Never machine-translate Arabic SEO copy from English: Arabic titles, descriptions, FAQ answers and key-facts blocks are written for how Saudi users actually search (MSA with Gulf-dialect awareness), not word-for-word renderings. English keyword ≠ Arabic keyword.
- **The disclaimer never drifts.** Use `<Disclaimer />`. The independent / not-affiliated / verify-against-GACA framing is an E-E-A-T asset — never weaken, reword or bury it to "improve" copy.
- **Tokens only, logical properties only.** No hard-coded colours, no `left`/`right`.
- **Run `npm run verify` before declaring any change done.** It chains typecheck → lint → format:check → test → build → check:bundle. A change that breaks verify is not an SEO improvement.
- **Never fabricate regulatory facts** in SEO copy (titles, descriptions, FAQ answers). Pull wording from the corpus in `public/data/` / `content/regulations/`, cite the Part/section, and keep the "verify against GACA" caveat.
- **Every regulatory FAQ answer is self-contained and carries its own verify-against-GACA caveat.** AI engines lift a single Q&A out of the block and quote it alone, so one caveat on the FAQ section — or only on the last answer — is not enough. Each answer must cite the GACAR Part/section it relies on *and* stand alone as a citable unit. E.g. *Q: "What is the minimum age for a PPL in Saudi Arabia?"* → *A: "17, under GACAR §61.133. Fly GACA is an independent educational reference — confirm the current text with GACA before you rely on it."* Same rule in both languages (the Arabic answers carry the Arabic caveat, not a copy of the English one).

## How to execute SEO work here

1. **Check the plan.** `SEO-PLAN.md` at the repo root is the phased backlog (same content as `references/plan.md` in this skill). Find the item, or place ad-hoc requests into its phases so priorities stay honest.
2. **Scope "across the site" asks before touching files.** For a site-wide request (breadcrumbs everywhere, schema on all content pages), first map what already has the pattern vs. what's missing — grep the existing builder/component so you extend, not duplicate — and prioritise the **no-JS floor** (`prerender-head.mjs`) since that's the layer most crawlers actually read. If the resulting gap is large (many files), it is fine to land it as one thorough change *or* to propose phasing it; either way, say what you covered and what you deliberately left. Thorough-but-slow is correct here, but the scope should be a decision, not an accident.
3. **Read the relevant reference before coding:**
   - AI answers, citations, answer-first content, FAQ blocks, freshness → `references/ai-search.md`
   - Prerendering, robots, sitemap, IndexNow, hreflang/Arabic, Core Web Vitals/INP → `references/technical.md`
   - JSON-LD patterns and upgrades (Breadcrumb, FAQPage, Course, dateModified) → `references/structured-data.md`
   - E-E-A-T pages, content strategy, off-site/brand footprint → `references/content-eeat.md`
4. **Make the change through the existing plumbing.** Meta/schema goes through `usePageMeta`/`jsonld.ts`, never hand-rolled `<script>` tags in components. New static head state must also be reflected by the prerender scripts — check both `prerender-head.mjs` and `prerender.mjs` render it.
5. **Prove crawler visibility for content changes.** Anything meant for AI/search must be present with JS disabled. Quick check on a built site: `curl -A "GPTBot" <url> | grep -i "<expected text>"` against the prerendered `dist/` output or production.
6. **Verify, then update `SEO-PLAN.md`** — tick the item, note the date and any follow-ups. The plan is the shared memory across sessions.

## Definition of done for any SEO task

- Content/meta visible in prerendered HTML (no-JS test passes)
- Any new JSON-LD or crawler-facing content also reaches the guaranteed no-JS layer — `scripts/prerender-head.mjs` updated in the same change, or a one-line note in the summary saying why it doesn't apply. Schema that only appears after React hydration is invisible to the crawlers that decide citations.
- Both languages covered; i18n parity test green
- JSON-LD valid (parses, required properties present) and injected via the standard hooks
- `npm run verify` green
- `SEO-PLAN.md` updated
