# Migration tracker — legacy `flygaca/flygaca` → `FlyGACA-app`

This rebuild migrates the **frontend app only**. The Firebase Functions gateway, the Captain Adel
RAG service, the Python `sales_agents/`, `office/`/`docs/`, and the multi-host routing generator are
intentionally **out of scope** (the app keeps calling the same `/api` backend).

## ✅ Foundation done (this PR)

- Vite + React + TypeScript (strict) toolchain, ESLint, Prettier, Vitest.
- Design tokens ported verbatim (`tokens.css`) + global base layer; CSS Modules.
- i18n + RTL engine (i18next, EN/AR bundles, `<html dir>` flip) replacing the `data-en/data-ar`
  attribute engine. Bilingual key-parity test replacing `check:i18n`.
- App shell (`Layout`/`Header`/`Footer`) replacing the `build-chrome.js` stamper.
- Shared `Disclaimer`, `LangToggle`, `CalcShell` + `useUrlState` (replacing `FGCalc`).
- Typed services: `api` (the `/v1/chat` contract), `auth`, `entitlements` (pure `isActive`),
  `native-bridge`, `content`/`useFetchJson`.
- PWA via `vite-plugin-pwa`; Capacitor config (`com.flygaca.app`, `webDir: dist`).
- **Reference vertical slice:** Home, Tools index (data-driven from `public/data/tools.json`),
  and the **Crosswind** tool end-to-end (pure `calc/crosswind.ts` + unit tests + diagram).

## ✅ Stage 1 — Expanded tools suite (in progress)

**Platform (Batch 1.0):** typed tool registry (`src/lib/tools.ts`) driving a grouped, searchable
Tools hub (13 categories, ~50 tools shown with live/soon + "new" badges); shared calc primitives
(`src/components/calc/{NumberField,ResultStat,Grids}`); `useNumericInputs` hook; `CalcShell` v2
("How it works" explainer + related-tool chips + category eyebrow). Registry integrity test added.

**Batch 1.1 — Atmosphere & altitude:** pressure altitude / flight level, ISA temp & deviation,
altimeter QNH↔QFE, cloud base (`calc/altimetry.ts`, `calc/cloud.ts` + specs).

**Batch 1.2 — Speed, climb & turns:** Mach↔TAS (`calc/speed.ts`), climb gradient
(`calc/climb.ts`), standard-rate turn (`calc/turn.ts`) + specs.

**Batch 1.3 — Wind & runway:** all-runways wind table (`calc/windTable.ts`), hydroplaning speed
(`calc/hydroplaning.ts`), takeoff/landing runway margin (`calc/runwayPerf.ts`, rule-of-thumb factors
with AFM/POH disclaimer) + specs.

**Batch 1.4 — Navigation & descent:** wind triangle, great-circle distance/bearing, 1-in-60
(`calc/navigation.ts`); top-of-descent, descent/VDP (`calc/descent.ts`); time–speed–distance
(`calc/tsd.ts`) + specs.

**Batch 1.5 — Fuel & weight:** fuel burn/endurance/range + specific range (`calc/fuel.ts`);
weight & balance with %MAC (`calc/weightBalance.ts`) + specs.

**Batch 1.6 — Time & cycles:** Zulu/KSA clock (`calc/zulu.ts`), AIRAC cycle (`calc/airac.ts`),
sun times & civil twilight (`calc/sun.ts`, SunCalc algorithm). Added shared `TextField` primitive.

**Batch 1.7 — Currency & validity:** Part 61 currency, medical validity, flight review/IPC
(`calc/recency.ts`; regulatory period is a user input + "confirm against the cited Part" note).

**Batch 1.8 — Procedures:** holding entry + timing/fuel (`calc/holding.ts`), longitudinal
separation (`calc/separation.ts`), VFR self-brief checklist, LOA letter builder.
**Now live: 32 tools.**

**E6B hub:** tabbed flight computer (true airspeed · wind triangle · time–speed–distance) composing
the existing cores. **Stage 1 calculators complete — 33 tools live.** Remaining: Stage 2
(data/reference).

## ✅ Stage 2 — Data & reference tools (in progress)

- **Quick reference:** unit converter (`calc/units.ts`), transponder/squawk codes, ICAO phonetic
  alphabet & Morse, chart symbols.
- **Decoders:** METAR (`calc/metar.ts`) + TAF (`calc/taf.ts`) with a bilingual decode layer
  (`lib/wxText.ts`); NOTAM field/abbreviation decoder (`calc/notam.ts`).
- **GACAR reg lookups:** VFR minima, oxygen, fuel reserves, licence conversion — a shared
  `RegLookup` with a "confirm against the cited Part" note + Library/Adel links (no fabricated figures).
- **Directory:** aerodromes (`airports.json`), ICAO airspace classes, GACAR Part 1 glossary
  (`definitions-index.json`, fetched at runtime).
- **Planning:** route planner (great-circle legs from `airports.json`), ICAO flight-plan builder.

**Stage 2 essentially complete — 49 of 50 tools live.** Only `met-brief` is deferred (it needs a
live weather API + CSP, which belong to a later wiring/hardening stage). The full tool suite is done.

## ✅ Stage 4 — Account & commerce (local-first)

Built on a local-first account layer (`src/lib/account.ts`, localStorage via useSyncExternalStore)
standing in for the Stage 3 Firebase service layer — same component API will map onto Firestore:
- Account (email sign-in/out), Dashboard (medical & flight-review validity, total hours), Logbook
  (add/delete flights, column totals, JSON export), Settings (profile, language, delete-all-data).
- Pricing (Free/Pro/Schools, monthly↔annual; checkout stubbed until billing) and Schools (B2B).

## ✅ Stage 5 — Study & guides (client-side)

- Study hub, quizzes + flashcards (`quiz.json`), ground school (`groundschool.json`), mock exam
  (timed, pass-mark), reading paths (`paths-index.json`), prep packs (Pro-gated teaser).
- 10 bilingual guide articles (`/guides`) linking to the regulation, the tools and Captain Adel.

**Remaining (needs the Stage 3 backend or later stages):** real Firebase Auth/Firestore + billing
(Stage 3), full Library document reader + heavy assets (Stage 6), Chat SSE streaming (Stage 7),
native Capacitor (Stage 8), CI + hosting/CSP + Playwright E2E (Stage 0/9), and `met-brief`.

## ✅ Stage 6 — Library completeness

- **Full in-app document reader** (`pages/library/Document.tsx`): fetches the regulation HTML,
  sanitizes it (defense-in-depth: strips script/style/iframe/handlers/`javascript:`), builds a
  filterable sticky table of contents from the headings, and deep-links to section anchors.
- **Lazy full-text search:** typing 3+ characters fetches `library-search.json` once and shows
  in-text matches with the query highlighted, each linking into the reader at the exact section.
- **All three corpora** are now browsable + readable behind one generic reader and a corpus
  switcher — **GACAR Regulations** (74 Parts, `parts/`), **Reference Library** (205 docs,
  `library/`) and **GACA Handbooks** (21 docs, `ebooks/`). `searchHref()` maps every legacy
  `type`/`id` to its reader route, so all 46,369 indexed passages are clickable.

**Remaining (deferred):** charts vertical (Leaflet) and the heavy ebook PDFs.

## ✅ Batch 2 done

- **Calculators:** Density altitude (`calc/isa.ts`) and True airspeed (`calc/tas.ts`), both pure +
  unit-tested, built on the Crosswind pattern (`CalcShell` + `useUrlState`).
- **Library:** index page (`pages/library/Library.tsx`) — data-driven from `gacar-index.json`
  with category filter + search — and a per-Part `Document` page showing metadata + outline.
- **Captain Adel chat** (`pages/chat/Chat.tsx`): message list, suggested prompts, `?q=` prefill +
  auto-send, session id, sources rendering, graceful "engine not connected" fallback. Talks to
  `/api/chat` via `lib/api` (JSON POST).
- **Static pages:** About (`pages/About.tsx`) + Disclaimer / Terms / Privacy via a shared
  `LegalPage` prose component driven by structured i18n content.

## ⏳ Tools to port (~34) — repeat the Crosswind pattern

`calc/*` math cores already isolated in the legacy repo make these the easiest first:
- [ ] E6B (`tools-e6b.js`)
- [ ] Holding (`holding-core.js`), AIRAC (`airac-core.js`), currency (`currency.js`)
- [ ] Cloudbase, fuel, TOD/TSD, suntimes, units/conversion, performance, W&B, VFR, procsep
- [ ] METAR/NOTAM decoders, AIP quiz, METAR drill, readback, ELP check, route planner
- [ ] aerodromes, airspace, chart symbols, definitions, LOA, library/PDF readers
- [x] TAS (`tools-tas.js`), density altitude (`isa-core.js`)

## ⏳ Pages to port / finish

- [x] Library index + per-Part metadata page (`gacar-index.json`)
- [x] Library: full in-app document reader (regulations + reference + handbooks), corpus tabs,
      and lazy full-text search (`library-search.json`). Remaining: charts (Leaflet), ebook PDFs.
- [x] Captain Adel chat (JSON POST)
- [ ] Chat: **SSE token streaming**, grounding badges (grounded/partial/refusal), tool-chip
      deep links, transcript persistence, App Check token header
- [x] About; Legal: Disclaimer, Terms, Privacy
- [ ] Legal: Safety; 404 is done, add offline page
- [ ] Account / Pricing / Schools (billing via Stripe web + RevenueCat native)
- [ ] Dashboard, Logbook (Firestore-backed), Settings, Search (Ctrl/Cmd-K)
- [ ] Guides, Study (ground school, flashcards, checkride/exam), Paths

## ⏳ Wiring to complete

- [ ] Firebase init + Auth (web + native sign-in through `native-bridge`).
- [ ] Stripe Checkout / RevenueCat IAP in `lib/billing`.
- [ ] Lazy-load the heavy `library-search.json` + ebooks (native cache shim parity).
- [x] CSP / security headers + Firebase Hosting config (`firebase.json`, `.firebaserc`, ported `firestore.rules`).
- [x] CI (GitHub Actions): typecheck · lint · format:check · test · build on every PR.
- [ ] Playwright smoke + critical-flow tests (bilingual toggle, calculators, navigation).
