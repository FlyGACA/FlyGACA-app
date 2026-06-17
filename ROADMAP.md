# Fly GACA App — Build Roadmap

The full program plan for rebuilding the legacy Fly GACA PWA (`flygaca/flygaca`) into this
TypeScript/React/Vite app. Frontend only — the Firebase Functions gateway and the Captain Adel RAG
brain are unchanged; the app calls the same `/api/chat`, `/api/content`, and Firebase project
(`flygaca-app`, `me-central2`). Day-to-day progress is tracked in [`MIGRATION.md`](./MIGRATION.md).

## Status — rebuild complete (parity-ready)

All stages are implemented and CI-green on PR #1: 0–2 (infra + 54 tools), 3 (Firebase + billing,
emulator-first), 4–5 (account · study), 6 (library + charts + PDF sheets), 7 (chat streaming),
8 (native Capacitor), 9 (code-splitting · SEO · E2E/a11y · cutover runbook). The only remaining gate
before DNS cutover is the **production secret flip** (Firebase config · App Check · Stripe price IDs ·
deploy rules) — see `docs/RUNBOOK-cutover.md`. Live progress detail in `MIGRATION.md`.

## Decisions

- **Cutover: parity-first** — reach full feature parity before the new app replaces flygaca.com.
- **Host: Firebase Hosting** — co-located with Functions/Firestore.
- **CI from the start**, **reuse the existing Firebase backend** (frontend SDK only), **Playwright E2E**.

## Conventions (reuse — do not reinvent)

- **Tools** = pure math in `src/calc/<tool>.ts` (+ Vitest spec) rendered via `CalcShell` +
  `useUrlState`. Reference: `src/calc/crosswind.ts` + `src/pages/tools/Crosswind.tsx`.
- **Data pages** fetch JSON via `useFetchJson` → typed shapes in `src/lib/content.ts`; heavy assets stay lazy.
- **Bilingual**: every string in `src/i18n/{en,ar}.json`; `tests/i18n-parity.test.ts` is the gate.
  The not-affiliated **`<Disclaimer />`** appears on every surface, never inlined.
- **Styling**: design tokens + CSS Modules + logical properties only.

## Workflow (per batch)

1. Continue on `claude/flygaca-refactor-rebuild-r5lt6e`; **one PR per stage**, batches as commits.
2. Local gate before every commit: `npm run typecheck && npm run lint && npm run test && npm run build`.
3. Push; CI runs; address review/CI events. Update `MIGRATION.md`.
4. **Stage DoD**: every page routed + bilingual + disclaimered; unit/E2E green; preview smoke (routes 200).

## Stages

| # | Stage | Scope | Notes |
|---|-------|-------|-------|
| 0 | **Infra & CI** | GitHub Actions (typecheck/lint/test/build), `firebase.json` (SPA + `/api` rewrites + CSP), `.firebaserc`, port `firestore.rules`, `.env` | Do first |
| 1 | **Pure-math tools** (~17) | E6B, units, fuel, TSD, TOD, holding, AIRAC, procsep, cloudbase, suntimes, currency, performance, W&B, conversion-checker, VFR, readback, LOA | Reuse `calc-tools/holding-core/airac-core/currency/isa-core` |
| 2 | **Data tools** (~12) | aerodromes, route-planner, flightplan, definitions, airspace, notam/metar decoders, chart-symbols, elpt/elp-check, daily, doc-study | `useFetchJson` + typed JSON |
| 3 | **Service layer** | `lib/firebase` (Auth, Firestore, App Check), real `lib/auth`, `lib/store` (logbook), `lib/entitlements`, `lib/billing` (Stripe), `lib/native-bridge` (RevenueCat) | Riskiest; gates 4–5 |
| 4 | **Account & commerce** | account, dashboard, logbook, settings, pricing, schools | Route guards + paywall |
| 5 | **Study & guides** | groundschool, flashcards, quiz, checkride, 11 guides, packs (gated), paths/lessons/exam | `groundschool.json`, `quiz.json` |
| 6 | **Library & heavy assets** | full Part reader (`parts/`), aerodromes/airspace/charts/ebooks/reference tabs, lazy full-text search (~19 MB), Leaflet charts | Code-split + Workbox cache |
| 7 | **Chat completeness** | SSE streaming, grounding badges, sources/verbatim, tool-chips, transcript, exam mode, App Check header | Upgrade the JSON chat |
| 8 | **PWA / native** | offline page, `cap add ios`, Firebase Auth + RevenueCat plugins, native bridge wiring | Native build needs a Mac |
| 9 | **Hardening & cutover** | finalize CSP/HSTS, perf/bundle budget, a11y, SEO/meta/sitemap/hreflang, Playwright E2E, content QA, cutover runbook | Cut DNS when 1–9 DoD pass |

Stages 1–2 are parallelizable and low-risk; Stage 3 gates 4/5; Stages 6–7 are the heaviest UI work.

## Verification

- Per batch: `typecheck && lint && test && build` + `preview` smoke (routes 200) + `MIGRATION.md` updated + CI green.
- Service/auth stages: manual sign-in/out + Firestore read/write against the real project; pure-predicate unit tests.
- Heavy stages: confirm lazy-load + Workbox caching; respect the bundle budget.
- Cutover: full Playwright suite green + manual prod smoke on a Firebase preview channel before DNS.

## Legacy sources of truth

`flygaca/assets/js/{auth,store,entitlements,billing,native-bridge,firebase-*}.js`,
`flygaca/config/routes.js` (CSP), `flygaca/firestore.rules`, the `tools-*.js` family and `*-core.js`
math, and `flygaca/assets/data/*`.
