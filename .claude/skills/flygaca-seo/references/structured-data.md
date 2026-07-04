# Structured data reference — JSON-LD patterns for this repo

All JSON-LD flows through `src/lib/jsonld.ts` (builders) and is injected per-route by `usePageMeta` — never hand-roll `<script type="application/ld+json">` in components. Site-wide constants (`Organization`, `WebSite` + SearchAction) live in `index.html`.

## Already in place (extend, don't duplicate)

- `Organization` + `WebSite` graph with `@id` anchors (`#organization`, `#website`) — reference these from page-level schema via `publisher`/`isPartOf` rather than re-declaring.
- Per-type page schema: `TechArticle` (regulations), `Article` (guides), `Course` (study), `FAQPage` (home), `SoftwareApplication` (tools), `Airport` (aerodromes).

## Upgrade patterns (what "2026-grade" adds)

**BreadcrumbList (site-wide, high value here).** The library is deep (Library → GACAR → Part 61 → section); breadcrumbs give both Google and AI models the hierarchy context for attribution. Emit on every content route:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Library", "item": "https://flygaca.com/library" },
    { "@type": "ListItem", "position": 2, "name": "GACAR Part 61", "item": "https://flygaca.com/library/gacar/61" }
  ]
}
```
Build once in `jsonld.ts` from the route's ancestry; localized `name` from i18n.

**FAQPage (on pages with a real FAQ block).** FAQ content is among the most-extracted content in AI answers — engines lift a *single* Q&A out of the block and quote it alone. Rules: mark up only Q&As visibly on the page, verbatim; **each answer must be self-contained and carry its own verify-against-GACA caveat where regulatory** — a caveat on only the block, or only the last answer, fails, because the answer that gets extracted has to stand alone and cite its GACAR Part/section; one FAQPage per URL.

**dateModified / dateReviewed (everywhere).** Freshness is a citation factor. Populate from real corpus metadata (AIRAC cycle date for aeronautical data, sync date for regulations, editorial review date for guides). Show the same date visibly on-page — schema dates that don't match visible dates get discounted.

**Course / hasPart for Ground School.** `Course` → `hasCourseInstance` (online, self-paced) → lesson pages as `LearningResource` with `educationalLevel`, `teaches`, `inLanguage`. Eligible for course rich results and strongly typed for AI ("free GACAR ground school").

**DefinedTermSet for a glossary.** Aviation abbreviations (EN/AR) as `DefinedTerm` entries make the site the definitional source AI quotes ("What does GACAR mean?"). Pair with a real glossary page — never schema without visible content.

**Entity hygiene on `Organization`.** Add `sameAs` (real social/GitHub profiles only), `contactPoint` (i@flygaca.com), and keep `name`/`logo` consistent — this is how LLMs resolve "Fly GACA" as an entity. Do not claim `EducationalOrganization`/accreditation; `Organization` with an educational description is the honest, safe type.

**Per-page plumbing** on every route via `usePageMeta`: `inLanguage` matching the active language, `isPartOf: { "@id": "#website" }`, `speakable` only if/where genuinely useful (low priority).

## Rules

1. **Schema mirrors visible content.** Anything in JSON-LD must be on the page. Invisible-only markup risks manual actions and destroys AI trust.
2. **No fabricated ratings/reviews.** Never add `aggregateRating` to tools or courses without a real, displayed rating system.
3. **Stay honest about identity.** The independent/educational framing appears in `description` fields too.
4. **Bilingual**: localized string fields come from i18n keys; `inLanguage` follows `?lang`.

## Validation (make it mechanical)

- Every builder in `jsonld.ts` gets a Vitest spec asserting required properties (like the calc specs pattern).
- Add/keep a validation script (e.g. `scripts/validate-jsonld.mjs`) that walks prerendered `dist/` pages, parses every JSON-LD block, and fails on parse errors or missing required fields per type. Wire into `verify`/CI so schema can't silently rot.
- Spot-check new types with Google's Rich Results Test before shipping.
