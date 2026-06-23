# Fly GACA App — Roadmap

What's coming next for the Fly GACA frontend app. The legacy→TypeScript/React/Vite **rebuild is
complete and live** — all 55 tools, the full regulatory library + search, Captain Adel chat, the
study hub, account/commerce, and guides are shipped and deploying to production on every merge to
`main`. This file looks **forward**; the stage-by-stage rebuild history lives in
[`MIGRATION.md`](./MIGRATION.md).

Scope is unchanged: this repo is **frontend only**. The Firebase Functions gateway and the Captain
Adel RAG brain are separate and untouched — the app calls the same `/api/chat` / `/api/content`
endpoints and the `flygaca-app` Firebase project (`me-central2`).

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
- **[product]** Regenerate the **social/OG card** in the new typeface — `scripts/build-og-card.mjs`
  still renders the old Cairo font (needs network font access to rebuild the PNG).

## Next — this quarter-ish

- **[platform]** **Native iOS/Android.** Generate the Capacitor platform projects (needs a Mac),
  then wire native Apple/Google sign-in, RevenueCat IAP (the `native-billing` branch), deep links,
  and app icons/splash. See `docs/RUNBOOK-native.md`.
- **[platform]** **Performance budget.** Add a Lighthouse/perf gate in CI to sit alongside the
  initial-JS bundle budget already enforced by `scripts/check-bundle.mjs` (160 kB gzip).
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

The original no-build PWA (`flygaca/flygaca`) remains the reference when porting anything new:
`flygaca/assets/js/{auth,store,entitlements,billing,native-bridge,firebase-*}.js`,
`flygaca/config/routes.js` (CSP), `flygaca/firestore.rules`, the `tools-*.js` family and `*-core.js`
math, and `flygaca/assets/data/*`.
