# Fly GACA App — Roadmap

What's coming next for the Fly GACA frontend app. The legacy→TypeScript/React/Vite **rebuild is
complete and live** — all 55 tools, the full regulatory library + search, Captain Adel chat, the
study hub, account/commerce, and guides are shipped and deploying to production on every merge to
`main`. This file looks **forward**; the stage-by-stage rebuild history lives in
[`MIGRATION.md`](./MIGRATION.md).

Scope note: this repo now carries the **backend too** — the Firebase Functions gateway and the
Captain Adel RAG brain live in `functions/` (deployed to `me-central1`; Firestore in
`me-central2`). The app calls them via the same `/api/chat` / `/api/feedback` endpoints on the
`flygaca-app` Firebase project.

## How to read this

- **Now / Next / Later** are horizon buckets, not date commitments — priorities shift as we learn.
- Each item is tagged **[product]** (something users see) or **[platform]** (under-the-hood,
  launch, or infra) so both audiences can scan to what they care about.
- Every item links to the runbook/doc that already describes the work where one exists.

## Now — production hardening & go-live confidence

The app already auto-deploys to **Firebase Hosting** (canonical) and the Vercel/Cloudflare/Netlify
mirrors on every merge to `main`. "Now" is about making that production footprint fully trustworthy.

- **[platform]** Flip and verify the production secrets — Firebase config · App Check key · Stripe
  price IDs — and deploy `firestore.rules`. See `docs/RUNBOOK-cutover.md` and `docs/BILLING.md`.
- **[platform]** Enable **App Check enforcement** on the backend Functions once real traffic is
  sending valid tokens. See `docs/APP-CHECK-BACKEND.md`.
- **[product]** Regenerate the **social/OG card** PNG in the new typeface. The share-card template
  now renders in **Readex Pro** (the Cairo→Readex swap shipped); only the PNG re-render remains — it
  needs Google Fonts (`fonts.gstatic.com`) network access: `node scripts/build-og-card.mjs`.
- **[platform]** **Keep `main` green and readable.** Make the CI `build` (the `verify` chain) and
  `e2e` jobs required checks on `main`, and use descriptive squash-merge titles — recent history
  (`sd (#215)`, `j (#209)`, `,m (#208)`) doesn't self-describe, which matters for an open
  educational repo.

## Next — this quarter-ish

- **[platform]** **Native iOS/Android.** Generate the Capacitor platform projects (needs a Mac),
  then wire native Apple/Google sign-in, RevenueCat IAP (the `native-billing` branch), deep links,
  and app icons/splash. See `docs/RUNBOOK-native.md`.
- **[platform]** **Performance budget.** Add a Lighthouse/perf gate in CI to sit alongside the
  initial-JS bundle budget already enforced by `scripts/check-bundle.mjs` (160 kB gzip).
- **[platform]** **Shard the heavy data payloads.** `airports-extra.json` (21 MB) and
  `library-search.json` (19 MB) are each fetched as a single blob today; shard them (by
  region/ICAO prefix and by corpus/Part or term-prefix buckets) so the first search on a mobile
  connection doesn't wait on the whole index. Confirm `rag-chunks.json` (14 MB) is only consumed
  server-side and stop shipping it under `public/data/` if so. Keep `src/lib/content.ts`
  (`loadJson` promise cache) as the single fetch path and preserve the two-tier NetworkFirst
  cache split in `vite.config.ts` when shard names change.
- **[platform]** **Emit semantic corpus links upstream.** The offline pipeline that builds
  `library-search.json` / `definitions-index.json` / the curated `paths`·`groundschool`·`quiz`
  files still emits legacy `document.html?…` URLs; `npm run data:normalize` heals them on each sync
  meanwhile. Patch the builder to emit the semantic shape natively, then retire the normalize step
  — exact diff and cleanup steps in [`docs/corpus-link-shape.md`](docs/corpus-link-shape.md).
- **[platform]** **App Check on `/api/content`.** When the content endpoint goes live, attach the
  same `X-Firebase-AppCheck` header `sendChat` already sends (noted in `src/lib/api.ts`).
- **[platform]** **E2E coverage.** Extend the Playwright suite (`e2e/`) beyond today's smoke +
  axe a11y checks to cover more critical flows.
- **[product]** **Global ⌘K search / command palette.** The header already shows a ⌘K search pill;
  wire it to a real app-wide palette (jump to any tool, guide, Part, or page).
- **[product]** **Offline page.** A graceful PWA offline fallback (the app shell + network-first
  `/data/*` caching are already in place).
- **[product]** **SEO phases 2–4.** Clause-level anchors, surfacing the highest-demand clauses in
  the sitemap, and tool↔library cross-links. See `docs/SEO-STRATEGY.md`.

## Later — exploratory / post-launch

- **[product]** Content & tools expansion — more guides, quiz banks, and reading paths, deeper
  ground school, and new calculators as the corpus grows.
- **[product]** Captain Adel enhancements — richer grounding, exam-mode ties, and saved-chat UX.
- **[product]** Study analytics & progress insights beyond the current streak/mastery rollups.
- **[platform]** Push notifications and native polish once the mobile shells ship.
- **[platform]** **Observability.** Client error monitoring (e.g. Sentry) and privacy-respecting
  usage analytics (page + tool usage only, no PII) to learn which of the 55 tools earn their
  maintenance. Both dynamic-`import()`ed like the Firebase SDK so the 160 kB budget holds, and
  any new origin added to the CSP deliberately — never wildcards.
- **[docs]** **Contributor onboarding.** `CONTRIBUTING.md` (the `verify` gate, i18n-parity rule,
  tokens/logical-properties rule, and the add-a-tool recipe from `CLAUDE.md`) plus issue/PR
  templates in `.github/`, including a "regulation drift" template for content corrections.
- **[docs]** README screenshots (`docs/screenshots/`) and marketing assets.

## How we ship (Definition of Done)

Carried over from the rebuild — these gates still apply to everything above.

- Local gate before every commit: `npm run typecheck && npm run lint && npm run test && npm run build`.
- Every surface is **routed + bilingual + disclaimered**: a key in **both** `src/i18n/{en,ar}.json`
  (`tests/i18n-parity.test.ts` is the gate), and the not-affiliated **`<Disclaimer />`** is used,
  never inlined or reworded.
- **Tokens + CSS Modules + logical properties only** — no hard-coded colours, no physical
  `left`/`right`.
- Respect the bundle budget; keep heavy assets (the ~19 MB `library-search.json`, ebooks, charts)
  lazy/streamed.
- Push; CI runs; address review/CI events. Preview smoke (routes 200) before merge.

## Conventions (reuse — do not reinvent)

- **Tools** = pure math in `src/calc/<tool>.ts` (+ Vitest spec) rendered via `CalcShell` +
  `useUrlState`. Reference: `src/calc/crosswind.ts` + `src/pages/tools/Crosswind.tsx`.
- **Data pages** fetch JSON via `useFetchJson` → typed shapes in `src/lib/content.ts`; heavy assets
  stay lazy.
- **Routing** is the single table in `src/router.tsx`; pages live one-per-folder under `src/pages/`.
- **i18n / RTL**: `src/i18n/index.ts` mirrors the language choice onto `<html lang/dir>` so RTL
  flips document-wide.

## Legacy sources of truth

The original no-build PWA (the vanilla Fly GACA site, whose source is not in this GitHub org)
remains the reference when porting anything new:
`flygaca/assets/js/{auth,store,entitlements,billing,native-bridge,firebase-*}.js`,
`flygaca/config/routes.js` (CSP), `flygaca/firestore.rules`, the `tools-*.js` family and `*-core.js`
math, and `flygaca/assets/data/*`.
