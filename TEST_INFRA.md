# FlyGACA Test Infrastructure & 4-Tier Verification Architecture

FlyGACA employs a comprehensive, multi-layered quality assurance and testing framework designed to guarantee regulatory fidelity to General Authority of Civil Aviation (GACA) standards, mathematical precision in aviation physics, bulletproof type safety, and seamless bilingual (Arabic RTL & English LTR) user experiences.

---

## 1. Testing Infrastructure & Toolchain Overview

The test infrastructure is architected for zero-latency feedback, deterministic execution, and complete isolation:

- **Test Runner**: [Vitest v4.1](https://vitest.dev/) with Node.js worker threads pool (`pool: 'threads'`), guaranteeing thread safety and eliminating process-fork IPC bottlenecking.
- **DOM & Component Simulation**: [jsdom v30](https://github.com/jsdom/jsdom) paired with [@testing-library/react v16](https://testing-library.com/) and [@testing-library/user-event v14](https://testing-library.com/docs/user-event/intro) for full React 19 hook, event, and layout testing.
- **Assertion Framework**: Vitest `expect` extended with [@testing-library/jest-dom v7](https://github.com/testing-library/jest-dom) matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.).
- **Localization Harness**: In-memory `i18next` runtime with instantaneous language switching (`en` / `ar`) and document direction mirroring (`ltr` / `rtl`).
- **Storage Virtualization**: Custom `MockStorage` implementation in `tests/setup.ts` providing compliant, isolated in-memory `localStorage` and `sessionStorage` environments per test suite.
- **Type Checking Gate**: Strict TypeScript (`tsc -b --noEmit`) checking 100% of frontend modules and test files.
- **Drift Guards**: Dedicated architectural integrity tests in `tests/integrity/` enforcing schema symmetry, translation parity, client-server sync, and data-pack invariants.

---

## 2. The 4-Tier Testing Hierarchy

FlyGACA structures its test inventory into a strict 4-Tier Verification Hierarchy to ensure complete test depth from isolated pure formulas up to complex real-world operational workflows.

```
┌────────────────────────────────────────────────────────────────────────┐
│               TIER 4: Real-World Aviation Workloads                    │
│   (Multi-leg Saudi XC, Extreme Desert Heat Ops, 100-Q CBT Exams)       │
├────────────────────────────────────────────────────────────────────────┤
│             TIER 3: Cross-Feature Interaction & State                  │
│    (Logbook ↔ Recency, CBT ↔ Progress Sync, Persona ↔ Layout)         │
├────────────────────────────────────────────────────────────────────────┤
│               TIER 2: Boundary, Extreme & Adversarial                  │
│      (OAT > 45°C, Elevation >= 4000ft, Midnight Zulu, Malformed I/O)    │
├────────────────────────────────────────────────────────────────────────┤
│                 TIER 1: Feature & Domain Unit Coverage                 │
│      (ISA Math, Part 61 Fields, Phraseology, UI Components, i18n)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature & Domain Unit Coverage
Covers the core isolated functionality, pure mathematical engines, regulatory calculations, and rendered UI component behaviors:
1. **Atmosphere & Altimetry**: Pure ISA equations (`pressureAltitude`, `isaTemperature`, `isaDeviation`, `densityAltitude`, `trueAirspeed`, `machNumber`) in `tests/calc/isa.test.ts`, `tests/calc/altimetry.test.ts`, `tests/calc/tas.test.ts`.
2. **GACA Part 61 Flight Log Engine**: Flight schema parsing, category hour distribution (PIC, SIC, Dual, Solo, XC, Night, Actual/Simulated Instrument, Landings) in `tests/calc/logbook.test.ts`, `tests/calc/flightFields.test.ts`.
3. **CBT Exam Engine**: Question loading, category pool filtering, timed fuel-gauge progression, bookmarking, and pass/fail thresholds in `tests/pages/quiz-page.test.tsx`, `tests/lib/study-progress.test.ts`.
4. **SAELPT Phraseology Trainer**: ICAO Doc 9835 criteria, NATO phonetic alphabet transliteration, Morse code mappings, and spaced-repetition scheduling in `tests/calc/srs.test.ts`, `tests/calc/speech.test.ts`, `tests/calc/textToSpeech.test.ts`.
5. **Persona Layout Engine**: Default widget ordering for `student`, `pilot`, `instructor`, and `dispatcher` roles, along with role-specific quick action generation in `tests/calc/dashboard-layout.test.ts`.
6. **UI Component Library**: Rendering, accessibility, focus trapping, and keyboard interaction for buttons, dialogs, command palette, tabs, and gauges in `tests/components/`.

### Tier 2: Boundary & Corner Cases
Tests the platform against extreme physical conditions, invalid inputs, edge-of-envelope scenarios, and corrupted environments:
1. **Saudi Desert Heat Warning Threshold**: Temperature inputs exceeding +45°C triggering `isExtremeDesertHeat()` alerts in `tests/calc/isa.test.ts` and `tests/calc/adversarial-edge-cases.test.ts`.
2. **High-Elevation Aerodromes**: Aerodrome elevation >= 4,000 ft (e.g., Abha OEAB at 6,858 ft, Taif OETF at 4,769 ft) activating density altitude performance degradation alerts in `tests/calc/altimetry.test.ts`.
3. **Extreme Altimeter Settings**: QNH extremes (< 950 hPa or > 1050 hPa) verifying robust pressure altitude calculation and non-negative density altitudes.
4. **Temporal & Midnight Crossing Invariants**: Zulu time calculations, AIRAC 28-day cycle boundary transitions, daylight solar noon calculations across solstice extremes, and leap-year recency math in `tests/calc/zulu.test.ts`, `tests/calc/sun.test.ts`, `tests/calc/airac.test.ts`.
5. **Data Resilience & Storage Fallbacks**: Corrupted JSON structures in `localStorage`, malformed flight rows, empty search queries, missing query params, and offline network dropouts in `tests/lib/account.test.ts`, `tests/calc/dashboard-layout.test.ts`.

### Tier 3: Cross-Feature Interactions
Validates state synchronization, data propagation, and bidirectional contracts across multiple modules:
1. **Flight Logging to 90-Day Currency Recency**: Entering a flight automatically propagates through rolling 90-day day/night landing recency engines, flight review currency calculators, and GACAR Part 61 compliance status boards (`tests/calc/recency.test.ts`, `tests/components/currency-board.test.tsx`).
2. **CBT Exam Scoring to Study Progress Store**: Completing a timed CBT session updates global study streak, category weakness analytics, ground school pack entitlements, and Firestore cloud sync (`tests/lib/study-progress-store.test.ts`, `tests/lib/study-progress-sync.test.ts`).
3. **Persona Hierarchy Overrides**: Switching operational roles (`student` ↔ `pilot` ↔ `instructor` ↔ `dispatcher`) dynamically recomposes dashboard widget hierarchies, updates quick-action CTA buttons, and preserves custom user pinned widgets (`tests/calc/dashboard-layout.test.ts`, `tests/integrity/adversarial-ui-i18n.test.ts`).
4. **Bilingual RTL / LTR Switching**: Changing language tokens (`en` ↔ `ar`) synchronously mirrors layout direction (`dir="ltr"` / `dir="rtl"`), switches font metrics (Readex Pro), and updates aviation nomenclature (`tests/components/lang-toggle.test.tsx`, `tests/integrity/i18n-parity.test.ts`).

### Tier 4: Real-World Aviation Workloads & Scenarios
Exercises end-to-end operational user journeys across authentic Saudi civil aviation operations:
1. **Saudi Desert Cross-Country Scenario (OERK → OEAB → OEJN)**:
   - Leg 1: High-temperature departure planning from King Khalid International, Riyadh (OERK, elevation 2,049 ft, OAT 48°C — extreme desert heat).
   - Leg 2: High-elevation approach and landing at Abha Regional Airport (OEAB, elevation 6,858 ft, density altitude > 10,000 ft).
   - Leg 3: Coastal sea-level approach to King Abdulaziz International, Jeddah (OEJN, elevation 48 ft, high relative humidity).
2. **GACA Part 61 Certification Lifecycle**:
   - Complete pilot progression from Student Pilot Solo, through Commercial Pilot Multi-Engine XC flight logging, into 90-day passenger currency qualification and A4 landscape PDF export (`tests/calc/logbook.test.ts`, `tests/calc/currency.test.ts`, `tests/integrity/adversarial-ui-i18n.test.ts`).
3. **Full 100-Question CBT Mock Exam Simulation**:
   - Timed session execution with question shuffling, topic-bank selection, regulatory citation linking (GACAR Parts 61, 91, 141), bookmarking, jumping via pre-submission grid, and pass/fail grading (`tests/pages/quiz-page.test.tsx`, `tests/integrity/quiz-citations.test.ts`).
4. **Offline Cockpit EFB Execution**:
   - Offline manifest loading, shard prefix hinting across Saudi/GCC aerodrome catalogs, and local PWA cache synchronization for in-flight electronic flight bag operation (`tests/integrity/airport-shards.test.ts`, `tests/lib/offline-cache.test.ts`).

---

## 3. Test Suite Directory Layout

```
tests/
├── calc/             # Pure mathematical and domain logic (58 test suites, 449 tests)
│   ├── isa.test.ts                  # ISA temperature, pressure & density altitude
│   ├── altimetry.test.ts            # QNH/QFE conversions, true altitude
│   ├── crosswind.test.ts            # Runway wind components and gusts
│   ├── logbook.test.ts              # GACA Part 61 flight logging calculations
│   ├── currency.test.ts             # 90-day day/night recency & flight review
│   ├── dashboard-layout.test.ts     # Persona widget ordering & quick actions
│   ├── metar.test.ts                # Desert weather hazard parsing (shamal/haboob)
│   └── adversarial-edge-cases.test.ts # Extreme boundary stress test suite
├── components/       # UI component interaction & accessibility (52 test suites, 212 tests)
│   ├── command-palette.test.tsx     # ⌘K global launcher, search filtering, a11y
│   ├── bento-widgets.test.tsx       # Live dashboard tiles, count-up animation
│   ├── currency-board.test.tsx      # Recency meters, threshold warnings
│   ├── flight-form.test.tsx         # Part 61 logbook flight entry form validation
│   ├── lang-toggle.test.tsx         # Bilingual switcher, URL route synchronization
│   └── calc-shell.test.tsx          # Tool wrapper, formula collapsibles, copy links
├── pages/            # Page-level integration & route smoke tests (12 test suites, 89 tests)
│   ├── quiz-page.test.tsx           # CBT exam simulator interaction & scoring
│   ├── packs-page.test.tsx          # Study packs & certificate paywalls
│   ├── flashcards-page.test.tsx     # Spaced repetition card flip & grading
│   ├── checkout-page.test.tsx       # Moyasar payment redirect & error mapping
│   ├── crosswind-page.test.tsx      # Interactive crosswind calculator page
│   └── tool-pages-smoke.test.tsx    # 46 flight tool routes render validation
├── hooks/            # Shared React hook lifecycle & state (16 test suites, 115 tests)
│   ├── fetch-hooks.test.tsx         # Data fetching, deduplication & error handling
│   ├── use-form.test.tsx            # Form validation & submit handling
│   ├── url-state.test.ts            # Deep link state synchronization
│   └── use-reader-annotations.test.tsx # Highlighting & study note persistence
├── lib/              # Frontend services & preferences stores (58 test suites, 454 tests)
│   ├── account.test.ts              # LocalStorage hydration, fallback handling
│   ├── account-firebase.test.ts     # Firestore cloud sync & authentication
│   ├── study-progress-store.test.ts # CBT exam history & streak tracking
│   ├── aerodromes.test.ts           # Saudi & worldwide airport database query
│   └── entitlements.test.ts         # User license pack verification
├── app/              # Application shell & flavor router (3 test suites, 12 tests)
├── hud/              # Airspace radar & flight simulation (9 test suites, 75 tests)
├── scripts/          # Node.js pipeline & build scripts (7 test suites, 57 tests)
├── integrity/        # Architectural drift guards (10 test suites, 131 tests)
│   ├── airport-shards.test.ts       # Aerodrome sharding & prefix manifest integrity
│   ├── i18n-parity.test.ts          # 100% key parity between en.json and ar.json
│   ├── client-server-mirrors.test.ts# Frontend/backend contract synchronization
│   ├── pricing-server-parity.test.ts# Quoted fees matching backend charge params
│   ├── quiz-citations.test.ts       # Regulatory citation links pointing to valid Parts
│   └── adversarial-ui-i18n.test.ts  # Persona, logical CSS, and RFC 4180 CSV tests
└── setup.ts          # Global Vitest configuration, i18n harness & storage mocks
```

---

## 4. Integrity Drift Guards

The `tests/integrity/` suite serves as an automated gate ensuring zero drift across multi-tier dependencies:

| Guard | Verification Target | Enforced Invariant |
|---|---|---|
| `i18n-parity.test.ts` | `src/i18n/en.json` & `ar.json` | Every translation key exists in both languages with identical JSON tree depth and non-empty string values. |
| `airport-shards.test.ts` | `public/data/airports-extra/` | Shard manifest counts match committed files; prefix hints guarantee zero aerodrome drops for all regions. |
| `client-server-mirrors.test.ts` | `src/lib/` & `functions/src/` | Shared TypeScript interfaces and quotas match verbatim between frontend and Firebase backend functions. |
| `pricing-server-parity.test.ts` | Storefront & Backend Charges | Quoted SAR pricing models and package identifiers match payment provider server rules. |
| `quiz-citations.test.ts` | Question Bank Citations | All GACAR regulatory citations in CBT questions resolve to legitimate published regulatory Parts. |
| `bento-motion-parity.test.ts` | Framer Motion & CSS | Motion tokens in TypeScript animation configs match design system CSS custom properties. |
| `adversarial-ui-i18n.test.ts` | UI Styles & RFC 4180 | Zero physical margin/padding in CSS (enforcing CSS Logical Properties for RTL layout), plus robust CSV export/import round-trips. |

---

## 5. Test Execution Commands & Merging Gates

| Command | Purpose | Expected Output |
|---|---|---|
| `npm test` | Run full automated Vitest test suite | 225 test files passed (1,594 tests, 0 failures) |
| `npm run typecheck` | Strict TypeScript compilation check | `tsc -b --noEmit` exits cleanly with 0 errors |
| `npm run test:coverage` | Run coverage analysis with ratchets | Verifies Statement (>76%), Branch (>73%), Function (>79%), Line (>77%) coverage thresholds |
| `npm run verify` | Full CI verification pipeline | Typecheck + Lint + Format + Test + Build + Bundle Check |
