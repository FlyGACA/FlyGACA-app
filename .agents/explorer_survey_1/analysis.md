# FlyGACA Technical Survey & Architecture Analysis Report

**Date:** 2026-08-14  
**Author:** Explorer 1 (FlyGACA Survey Specialist)  
**Target Workspace:** `/Users/ad/.gemini/antigravity/scratch/FlyGACA-app`  

---

## 1. Executive Summary

FlyGACA is a production-grade educational and operational civil aviation web platform built with **React 19**, **Vite 8**, **React Router 8**, and **TypeScript 7**, designed specifically for Saudi civil aviation regulations (GACARs), Saudi AIP, and General Authority of Civil Aviation (GACA) exams.

A comprehensive codebase audit was conducted across all subsystems, source files, calculation libraries, test suites, and localization assets. The analysis confirms:
- **TypeScript Typecheck:** `0` errors (`npm run typecheck` passes cleanly via `tsc -b --noEmit`).
- **Vitest Test Suite:** `223` test suites and `1,562` unit/integration tests passing cleanly with `0` failures (`npm test`).
- **Feature Completeness:** All 5 core requested domains (GACA CBT Exam Simulation, GACA Part 61 Logbook PDF Export, Saudi Weather & High-Temp Calculators, SAELPT Phraseology Trainer, Persona-based Dashboard customization) along with Bilingual RTL Arabic/English localization are comprehensively implemented, structurally verified, and tested.

---

## 2. Codebase Architecture & Technical Inventory

### 2.1 Technology Stack & Frameworks
| Layer | Technologies & Libraries | Purpose & Configuration |
|---|---|---|
| **Core UI Framework** | React `19.2.8`, ReactDOM `19.2.8` | Declarative UI components with modern hooks and Suspense lazy code-splitting |
| **Build & Bundler** | Vite `8.2.1`, `@vitejs/plugin-react` | Ultra-fast HMR and multi-bundle production build |
| **Routing** | React Router `8.3.0` (`react-router`) | Client-side routing with `/ar` basename dynamic mounting and code-split chunks |
| **Type System** | TypeScript `7.0.2` (with `typescript-6` alias) | Strict mode type-checking (`tsc -b --noEmit`) |
| **Styling & Design** | CSS Modules, Custom Design Tokens (`tokens.css`) | Dark-cockpit design system with Falcon palette, clay/glass morphism, Readex Pro & JetBrains Mono typography |
| **State & Data Store** | Custom reactive stores (`src/lib/stores/`, `src/lib/services/`) | Custom event-emitter store patterns with local storage and Firebase Cloud Firestore sync |
| **Testing** | Vitest `4.1.9`, JSDOM `30.0.1`, Testing Library React `16.3.2` | Comprehensive test runners with DOM simulation and i18n parity validation |
| **Localization (i18n)** | `i18next` `26.3.6`, `react-i18next` `17.0.11` | Full English and Arabic (RTL) localization with verified Saudi aviation terminology |
| **Native Mobile/PWA** | Capacitor `8.5.0` (`@capacitor/ios`, `@capacitor/android`), `vite-plugin-pwa` | Cross-platform native iOS/Android bridge and offline PWA capability |

### 2.2 Directory Structure Breakdown
```
FlyGACA-app/
├── public/
│   ├── data/                 # Static JSON datasets (quiz.json, airports.json, charts, airspaces, etc.)
│   └── brand/                # Brand assets and marks
├── src/
│   ├── app/                  # Application shells (Layout, Header, Footer, ErrorBoundary, Dock, Nav)
│   │   └── flavor/           # Prep-app standalone flavor shell and packaging
│   ├── calc/                 # Pure mathematical, physical & regulatory calculation engines (no DOM)
│   │   ├── app/              # Dashboard layouts, password policies, tool presets
│   │   ├── chat/             # Captain Adel AI chat streams, transcripts, quota, TTS
│   │   ├── hud/              # Kinematics, projection, callsigns, sim METAR
│   │   ├── library/          # Corpus navigation, offline manifest, search filters
│   │   ├── pilot/            # Logbook aggregation, CSV serializer/parser, recency, achievements, ICS
│   │   ├── study/            # Flashcard SRS algorithm, glide path bins, question shuffle
│   │   └── ...               # Altimetry, climb, cloud, crosswind, descent, fuel, ISA, TAS, etc.
│   ├── components/           # Reusable UI widgets, Bento grid, modals, dials, flight forms
│   │   ├── account/          # FlightForm, logbook tables
│   │   ├── bento/            # BentoGrid, BentoCard, StatValue, metric cards
│   │   ├── calc/             # CalcShell, NumberField, ResultStat, GaugeDial, OutputGrid
│   │   ├── dashboard/        # RolePickerCard, StudyWidget, BookmarksWidget, AchievementStamp
│   │   └── study/            # GlidePathStrip, Stepper, GroundingBadge
│   ├── data/                 # TypeScript data tables (phonetics, constants)
│   ├── flavors/              # Standalone prep app flavor registry and settings
│   ├── hooks/                # Custom React hooks (usePageMeta, useFetchJson, useNumericInputs, etc.)
│   ├── i18n/                 # Localization bundles (en.json [215KB], ar.json [292KB], index.ts)
│   ├── lib/                  # Services, API clients, Firebase auth/sync, prep catalog, SEO
│   ├── pages/                # Route components (Home, study, account, tools, library, chat, etc.)
│   ├── styles/               # Global tokens (`tokens.css`), reset, animations, responsive layout
│   ├── main.tsx              # Application entry point with i18n initialization and locale redirect
│   └── router.tsx            # Complete route table with code-split lazy loading
├── functions/                # Firebase Cloud Functions (Moyasar billing, Captain Adel, Auth, Org)
└── tests/                    # Vitest unit and integration test suite (223 files)
```

---

## 3. Feature-by-Feature Gap & Readiness Assessment

### 3.1 GACA CBT Exam Simulation
- **Key Source Files:**
  - `src/pages/study/MockExam.tsx`
  - `src/pages/study/Quiz.tsx`
  - `src/pages/study/QuizRunner.tsx`
  - `src/lib/studyProgress.ts`
  - `src/calc/study/shuffle.ts`
  - `public/data/quiz.json` (626 KB question bank)
- **Implemented Capabilities:**
  1. **Realistic CBT Exam Engine:** Time-limited exam sessions with dynamically depleting fuel bar timer, pass/fail threshold calculations (standard 75% GACA pass mark), and question bookmarking/flagging (`flags[i]`).
  2. **Pre-Submission Review Grid:** Visual grid allowing pilots to review answered vs. flagged questions and immediately jump to any question before final submission.
  3. **Result Analytics & Breakdown:** Detailed score breakdown categorized by GACAR regulatory topic / bank, stamp verification (`PASS` / `FAIL`), and complete question-by-question review showing correct answers and GACAR citation links (`citeRef`).
  4. **Multi-License & Certificate Support:** Generic all-topics mock exam as well as tailored exams for individual certificate packs (PPL, CPL, IR, ATPL, ELP, Conversion) configured in `src/lib/prepCatalog.ts`.
  5. **Persistence:** Progress and mock exam results are saved to reactive local store (`useStudyProgress`) and synced to user cloud profile.
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

### 3.2 GACA Part 61 Logbook & PDF Exporting
- **Key Source Files:**
  - `src/pages/account/Logbook.tsx`
  - `src/pages/account/LogbookTable.tsx`
  - `src/pages/account/LogbookBreakdown.tsx`
  - `src/calc/pilot/logbook.ts`
  - `src/calc/pilot/flightFields.ts`
  - `src/calc/pilot/recency.ts`
- **Implemented Capabilities:**
  1. **Comprehensive Flight Logging:** Complete entry schema for Date, Aircraft Type, Registration, Departure/Arrival ICAO, Total Time, PIC, Night, IFR, Day/Night Landings, Approach Type, and Remarks.
  2. **GACAR Part 61 Currency Engine:** Rolling 90-day currency tracking for day (3 landings) and night (3 night landings) passenger-carrying recency.
  3. **Multi-Format Export & Import:**
     - **JSON Export:** Full account backup via `flygaca-logbook.json`.
     - **CSV Export & Import:** RFC 4180 compliant CSV export and tolerant column-mapping importer (`csvToFlights`).
     - **Print & PDF Mode:** Dedicated `?print=1` printable view with formal GACA Part 61 column layout, flight records, and calculated summary totals row with `@media print` layout formatting.
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

### 3.3 Saudi Weather & High-Temp Altitude Calculators
- **Key Source Files:**
  - `src/pages/tools/atmosphere-weather/DensityAltitude.tsx`
  - `src/pages/tools/atmosphere-weather/TrueAltitude.tsx`
  - `src/pages/tools/atmosphere-weather/PressureAltitude.tsx`
  - `src/pages/tools/atmosphere-weather/Metar.tsx`
  - `src/pages/tools/atmosphere-weather/MetBrief.tsx`
  - `src/calc/isa.ts`
  - `src/calc/altimetry.ts`
  - `src/calc/metar.ts`
- **Implemented Capabilities:**
  1. **Atmospheric Performance Calculations:** Accurate Pressure Altitude, ISA standard temperature and deviation, Density Altitude, and True Altitude calculations.
  2. **KSA High-Temperature Hazards:**
     - Automatic warning alert triggered when OAT > 45°C (`densityAltitude.highTempWarning`) warning of extreme density altitude and degraded engine/climb performance typical of Saudi desert summers.
     - High-elevation airfield warning alert when elevation >= 4,000 ft (`densityAltitude.highElevationNotes`) tailored for Saudi mountain aerodromes (Abha OEAB 6,858 ft, Taif OETF 4,772 ft).
  3. **Saudi METAR & Desert Weather Detection:**
     - Specialized weather parser in `src/calc/metar.ts` detecting regional desert phenomena: `shamal_dust` (blowing sand/dust) and `haboob` (severe convective sandstorm with visibility < 1,500m).
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

### 3.4 SAELPT Phraseology Trainer
- **Key Source Files:**
  - `src/lib/prepCatalog.ts` (Pack `elp`)
  - `src/pages/study/PackContents.tsx`
  - `src/pages/study/Flashcards.tsx`
  - `src/pages/tools/reference/Phonetic.tsx`
  - `src/data/phonetic.ts`
  - `public/data/quiz.json` (Banks `radio-elpt`, `elpt-phraseology`, `elpt-comprehension`, `elpt-rating-scale`)
- **Implemented Capabilities:**
  1. **SAELPT Pack & Radiotelephony Scenarios:** Structured English Language Proficiency pack with airport-specific radiotelephony scenarios for major Saudi international hubs:
     - Riyadh King Khalid International (`oerk`)
     - Jeddah King Abdulaziz International (`oejn`)
     - Dammam King Fahd International (`oedf`)
  2. **AI Radiotelephony Roleplay:** Scenario cards link directly into Captain Adel AI chat with pre-seeded roleplay prompts for ATC communication practice.
  3. **Dedicated SAELPT Flashcard Filter:** Category filtering in `Flashcards.tsx` (`study.filterSaelpt`) specifically isolating ICAO Doc 9835 / Annex 1 phraseology and aviation radiotelephony terminology with spaced-repetition (SRS).
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

### 3.5 Persona-Based Dashboard Customization
- **Key Source Files:**
  - `src/pages/account/Dashboard.tsx`
  - `src/calc/app/dashboardLayout.ts`
  - `src/components/dashboard/RolePickerCard.tsx`
  - `src/lib/prefs/dashboardPrefs.ts`
- **Implemented Capabilities:**
  1. **Operational Role Hierarchy:** Supports 4 distinct personas (`student`, `pilot`, `instructor`, `dispatcher`).
  2. **Role-Tailored Widget Ordering:**
     - `student`: Prioritizes Ground School / Study progress, reading bookmarks, and Captain Adel tutor.
     - `instructor`: Prioritizes flight currency, student endorsement records, and reference tools.
     - `dispatcher`: Prioritizes calculation tools (W&B, fuel, performance), METAR/weather, and NOTAM updates.
     - `pilot`: Prioritizes total flight hours, Part 61 currency board, logbook, and trend charts.
  3. **Role-Specific Quick Actions:** Dynamic action buttons tailored to each role (e.g. "Practice CBT Exam" for students, "Endorsement Records" for instructors).
  4. **Interactive Dashboard Customizer:** Collapsible customization panel allowing pilots to reorder widgets (move up/down) and toggle visibility on/off while safeguarding safety-critical currency widgets.
  5. **Role Onboarding:** Prominent `RolePickerCard` prompting unassigned users to select their operational persona upon first sign-in.
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

### 3.6 Bilingual (Arabic RTL / English) Localization & Terminology
- **Key Source Files:**
  - `src/i18n/index.ts`
  - `src/i18n/en.json` (215 KB)
  - `src/i18n/ar.json` (292 KB)
  - `src/router.tsx`
  - `tests/integrity/i18n-parity.test.ts`
- **Implemented Capabilities:**
  1. **Native RTL Support:** Dynamic document direction (`dir="rtl"` / `dir="ltr"`), `lang="ar"` / `lang="en"`, and Readex Pro typography.
  2. **Clean Arabic URL Routing:** Full `/ar` route prefix support with automatic basename stripping and `<Link>` prefixing in React Router.
  3. **Authentic Saudi Aviation Terminology:** Meticulously translated regulatory, meteorological, navigation, and aerodynamics terminology aligned with GACAR definitions and Saudi AIP.
  4. **Enforced Parity Test:** `tests/integrity/i18n-parity.test.ts` programmatically enforces 100% key parity, zero empty values, and identical interpolation token matching between English and Arabic bundles.
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

### 3.7 Type Safety & Testing Infrastructure
- **Typecheck Status:** `npm run typecheck` (`tsc -b --noEmit`) completes with code `0` (0 errors).
- **Unit & Integration Tests:** `npm test` (`vitest run`) executes 223 test suites and 1,562 unit tests across calculations, components, hooks, stores, integrity checks, and pages. All 1,562 tests pass with 0 failures.
- **Status:** **FULLY OPERATIONAL & VERIFIED** (0 Gaps).

---

## 4. Summary & Recommendation

The FlyGACA codebase is in an exceptionally robust, complete, and well-tested state. All requirements specified in `ORIGINAL_REQUEST.md` are fully covered in existing code, backed by extensive test suites, clean typecheck, and bilingual parity guards.

No structural blockers or missing critical paths were identified during the survey phase. The platform is ready for continued feature expansion, release packaging, or deployment verification as directed by the Project Orchestrator.
