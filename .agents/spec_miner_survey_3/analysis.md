# FlyGACA Specification Analysis: Localization, Verification & UI/UX Standards

**Survey Phase — Group 3 Analysis**  
**Date**: 2026-08-14  
**Author**: Specification Miner (Survey Phase - Group 3)  
**Target Workspace**: `/Users/ad/.gemini/antigravity/scratch/FlyGACA-app`

---

## 1. Executive Summary & Specification Scope

FlyGACA is an independent educational platform and open regulatory library for Saudi civil aviation (GACAR). The platform is built on modern web standards: React 19, TypeScript (strict), Vite 8, Vitest 4, and CSS Modules with logical properties and design tokens (the Falcon palette).

This specification mining report explores and codifies the requirements across three foundational pillars:
1. **Bilingual Localization & Saudi Aviation Terminology**: Complete Arabic (RTL) and English (LTR) i18n architecture, font typography, layout direction flipping, language toggle persistence, and an authoritative bilingual Saudi Aviation Terminology Dictionary.
2. **Quality & Verification Standards**: Strict TypeScript typechecking (`0` errors via `tsc -b --noEmit`), Vitest unit/integration test suite (`npm test`), integrity drift guards, coverage ratchets, and build/perf budget gates.
3. **UI/UX Rendering & Accessibility Standards**: Falcon design token hierarchy, multi-theme architecture (Falcon Dark, Cockpit/Night-Ops, Day/Reading), fluid typography, mobile dock (<=860px) and desktop responsive layouts, Apple HIG 44px touch targets, and WCAG AA accessibility compliance.

---

## 2. Bilingual Arabic (RTL) & English (LTR) Localization Specification

### 2.1 Architecture & Core Mechanism
- **i18n Engine**: `i18next` (`^26.3.6`) and `react-i18next` (`^17.0.11`) configured in `src/i18n/index.ts`.
- **Code Splitting**: Dynamic per-language loaders (`en.json` ~215 KB, `ar.json` ~292 KB) ensure only the active language's JSON bundle is downloaded on initial boot. Vite emits separate chunks.
- **Language Resolution Hierarchy**:
  1. Authoritative URL path prefix (`/ar` -> Arabic, `/` -> English).
  2. Legacy query parameter (`?lang=ar` or `?lang=en`).
  3. Stored user preference in `localStorage` (`flygaca:lang`).
  4. Browser language hint (`navigator.language.startsWith('ar')`).
- **DOM & Direction Reflection (`applyDocumentLang`)**:
  - `document.documentElement.lang = lang` ('ar' | 'en')
  - `document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'`
  - Web Manifest toggle: `/manifest-ar.webmanifest` vs `/manifest.webmanifest`.
- **Language Toggle & Router Synchronization**:
  - `LangToggle` component (`src/components/LangToggle.tsx`) renders a semantic `<a href>` linking to the alternate language URL (`localePath(pathname, nextLang)`).
  - React Router mounts under `basename: '/ar'` when on an Arabic path, allowing internal `<Link>` components to maintain language cluster context without manual path concatenation.
  - `main.tsx` executes `localeRedirect` before React mount to prevent any flash of untranslated content or URL-state desynchronization.

### 2.2 Typography & Font Architecture
- **Font Face**: Self-hosted `@fontsource/readex-pro` (weights 300, 400, 500, 600, 700) for UI, headings, and body copy.
  - Subsets: Latin, Latin-ext, and Arabic. Readex Pro unifies Arabic and Latin glyphs under a single harmonious geometric design, eliminating the former Cairo/Atkinson typeface split.
- **Monospace Technical Face**: Self-hosted `@fontsource/jetbrains-mono` (weights 400, 500, 600) for numeric readouts, ICAO identifiers, Morse code, and instrument dials.
- **No Third-Party CDN Dependency**: All `@font-face` rules and `.woff2` files are bundled locally, eliminating external Google Fonts CDN failure modes.

### 2.3 CSS Logical Properties & RTL Flipping
- **Zero Physical Directions**: Components strictly prohibit physical `left`, `right`, `margin-left`, `padding-right`, `float`, or `border-left`.
- **Logical Rules Enforced**:
  - `margin-inline-start` / `margin-inline-end` / `margin-inline: auto`
  - `padding-inline-start` / `padding-inline-end` / `padding-block`
  - `inset-inline-start` / `inset-inline-end`
  - `text-align: start` / `text-align: end`
  - `border-inline-start` / `border-inline-end`
- Result: The entire layout, form fields, navigation bars, breadcrumbs, and data tables automatically flip symmetrically between LTR and RTL without bespoke conditional CSS rules.

### 2.4 Authoritative Saudi Aviation Bilingual Terminology Dictionary

The following dictionary establishes the verified terminology across GACAR regulations, flight tools, calculators, logbooks, exam simulation, and phraseology:

| # | English Aviation Term | Verified Arabic Term (المصطلح العربي المعتمد) | Domain / Context | GACAR / ICAO Reference |
|---|----------------------|----------------------------------------------|------------------|------------------------|
| 1 | Air Traffic Control (ATC) | مراقبة الحركة الجوية | Airspace & Procedures | GACAR Part 170 / 171 |
| 2 | Pressure Altitude | ارتفاع الضغط | Atmosphere & Tools | GACAR Part 91 |
| 3 | Density Altitude | ارتفاع الكثافة | Atmosphere & Tools | GACAR Part 91 |
| 4 | Pilot Logbook | سجل الطيران / سجل ساعات الطيار | Account & Pilot Records | GACAR Part 61.51 |
| 5 | Saudi Aviation English Language Proficiency Test (SAELPT) | اختبار الكفاءة اللغوية للطيران السعودي | Certification & ELP | GACAR Part 61.31 / ICAO Doc 9835 |
| 6 | General Authority of Civil Aviation (GACA) | الهيئة العامة للطيران المدني | Regulatory Authority | Saudi Civil Aviation Law |
| 7 | General Authority of Civil Aviation Regulations (GACAR) | لوائح الهيئة العامة للطيران المدني | Regulatory Corpus | GACAR Parts 1–199 |
| 8 | Aeronautical Information Publication (AIP) | دليل المعلومات الطيرانية | Aeronautical Publications | Saudi AIP / ICAO Annex 15 |
| 9 | Notice to Air Missions (NOTAM) | إشعار للطيارين | Flight Operations | GACAR Part 91 |
| 10 | Visual Flight Rules (VFR) | قواعد الطيران البصري | Flight Rules | GACAR Part 91 Subpart B |
| 11 | Instrument Flight Rules (IFR) | قواعد الطيران الآلي | Flight Rules | GACAR Part 91 Subpart B |
| 12 | Visual Meteorological Conditions (VMC) | الأحوال الجوية البصرية | Meteorology | GACAR Part 91 |
| 13 | Instrument Meteorological Conditions (IMC) | الأحوال الجوية الآلية | Meteorology | GACAR Part 91 |
| 14 | Aerodrome Routine Meteorological Report (METAR) | تقرير الرصد الجوي الروتيني للمطار | Weather & Dispatch | ICAO Annex 3 / Saudi AIP |
| 15 | Terminal Aerodrome Forecast (TAF) | التنبؤ الجوي للمطار | Weather & Dispatch | ICAO Annex 3 / Saudi AIP |
| 16 | Automatic Terminal Information Service (ATIS) | خدمة معلومات المطار الآلية | ATC Communications | GACAR Part 171 |
| 17 | International Standard Atmosphere (ISA) | الغلاف الجوي القياسي الدولي | Atmospheric Modeling | ICAO Doc 7488 |
| 18 | True Airspeed (TAS) | السرعة الجوية الحقيقية | Aircraft Performance | GACAR Part 91 |
| 19 | Indicated Airspeed (IAS) | السرعة الجوية المبيَّنة | Instrumentation | GACAR Part 91 |
| 20 | Calibrated Airspeed (CAS) | السرعة الجوية المعدَّلة | Instrumentation | GACAR Part 91 |
| 21 | Ground Speed (GS) | السرعة الأرضية | Navigation | GACAR Part 91 |
| 22 | Mach Number | عدد ماخ | High-Speed Flight | GACAR Part 91 / 121 |
| 23 | Altimeter Setting (QNH) | ضبط مقياس الارتفاع (الضغط الجوي عند سطح البحر) | Altimetry & Procedures | Saudi AIP ENR |
| 24 | Field Elevation Pressure (QFE) | ضغط مستوى المطار / المدرج | Altimetry & Procedures | Saudi AIP ENR |
| 25 | Standard Pressure Setting (QNE / 1013.25 hPa) | الضبط القياسي لمقياس الارتفاع | Altimetry | Saudi AIP ENR |
| 26 | Transition Altitude (TA) | ارتفاع الانتقال | Airspace & Procedures | Saudi AIP ENR 1.7 |
| 27 | Transition Level (TL) | مستوى الانتقال | Airspace & Procedures | Saudi AIP ENR 1.7 |
| 28 | Flight Level (FL) | مستوى الطيران | Airspace & ATC | GACAR Part 91 |
| 29 | Headwind Component | مركبة الرياح المقابلة | Runway Performance | GACAR Part 91 / 121 |
| 30 | Crosswind Component | مركبة الرياح العمودية / العرضية | Runway Performance | GACAR Part 91 / 121 |
| 31 | Tailwind Component | مركبة الرياح الخلفية | Runway Performance | GACAR Part 91 / 121 |
| 32 | Weight & Balance | الوزن والاتزان | Flight Dispatch & Ops | GACAR Part 91.103 |
| 33 | Center of Gravity (CG) | مركز الثقل | Weight & Balance | GACAR Part 91.103 |
| 34 | Center of Gravity Limits / Envelope | حدود / مظروف مركز الثقل | Weight & Balance | GACAR Part 23 / 25 |
| 35 | Pilot-in-Command (PIC) | قائد الطائرة | Logbook & Flight Ops | GACAR Part 61 / 91 |
| 36 | Second-in-Command (SIC / Co-pilot) | مساعد الطيار | Logbook & Flight Ops | GACAR Part 61 / 121 |
| 37 | Dual Received | تدريب مزدوج | Logbook & Training | GACAR Part 61 |
| 38 | Solo Flight | طيران انفرادي | Logbook & Training | GACAR Part 61 |
| 39 | Cross-Country Flight (XC) | طيران ملاحة عبر البلاد | Logbook & Navigation | GACAR Part 61.1 |
| 40 | Night Flying / Night Recency | طيران ليلي / حداثة الطيران الليلي | Logbook & Currency | GACAR Part 61.57 |
| 41 | Takeoff and Landing Recency | حداثة الإقلاع والهبوط (3 إقلاعات وهبوطات خلال 90 يوماً) | Currency & Recency | GACAR Part 61.57 |
| 42 | Flight Review / Biennial Flight Review | المراجعة الدورية للكفاءة الجوية | Currency & Recency | GACAR Part 61.56 |
| 43 | Instrument Rating (IR) | أهلية الطيران الآلي | Certification & Ratings | GACAR Part 61 Subpart G |
| 44 | Private Pilot License (PPL) | رخصة طيار خاص | Certification | GACAR Part 61 Subpart E |
| 45 | Commercial Pilot License (CPL) | رخصة طيار تجاري | Certification | GACAR Part 61 Subpart F |
| 46 | Airline Transport Pilot License (ATPL) | رخصة طيار خط جوي | Certification | GACAR Part 61 Subpart G |
| 47 | Flight Instructor Certificate (CFI) | شهادة مدرب طيران | Certification | GACAR Part 61 Subpart H |
| 48 | Flight Dispatcher License | رخصة مرحل جوي | Certification | GACAR Part 65 |
| 49 | Medical Certificate (Class 1, 2, 3) | الشهادة الطبية الجوية (الفئة الأولى، الثانية، الثالثة) | Aviation Medicine | GACAR Part 67 |
| 50 | Official GACA CBT Exam Simulator | محاكي اختبارات GACA الرسمية بالحاسب الآلي | Exam Simulation | GACAR Part 61 Knowledge Tests |
| 51 | Passing Mark (75%) | درجة النجاح المعتمدة (75%) | Examination Standards | GACAR Part 61.35 |
| 52 | Radiotelephony Phraseology | المصطلحات والعبارات اللاسلكية القياسية | Air-Ground Communications | ICAO Doc 9432 / Saudi AIP |
| 53 | Readback / Hearback | إعادة النداء والتأكيد | ATC Communications | ICAO Annex 10 |
| 54 | Holding Pattern | نمط الانتظار الجوي | Instrument Procedures | Saudi AIP ENR 1.5 |
| 55 | Top of Descent (TOD) | نقطة بدء الهبوط | Flight Performance | Flight Planning |
| 56 | Visual Descent Point (VDP) | نقطة الهبوط البصري | Instrument Approaches | GACAR Part 91 / 97 |
| 57 | Climb Gradient | تدرج الصعود | Aircraft Performance | GACAR Part 25 / 91 |
| 58 | Hydroplaning Speed | سرعة الانزلاق المائي | Runway Safety | GACAR Part 91 |
| 59 | Fuel Reserves (VFR/IFR Day/Night) | احتياطي الوقود القانوني | Fuel Planning | GACAR Part 91.151 / 91.167 |
| 60 | Airspace Classification (Class A, B, C, D, E, G) | تصنيف المجال الجوي | Airspace Organization | Saudi AIP ENR 1.4 / GACAR 71 |

---

## 3. Quality & Verification Standards Specification

### 3.1 Strict TypeScript Standards
- **Compiler Options**: `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `target: ES2022`.
- **Command**: `npm run typecheck` (`tsc -b --noEmit`).
- **Standard**: `0` errors, `0` warnings. Build pipeline rejects any compilation failure.

### 3.2 Vitest Test Suite Architecture
- **Runner**: Vitest 4 with jsdom test environment (`vitest.config.ts`).
- **Structure**: Tests organized by architectural layer under `tests/`:
  - `tests/calc/`: Pure mathematical models and business rules (aviation math, fuel, speed, isa, holding, logbook, etc.).
  - `tests/hud/`: Airspace simulation engine (kinematics, scenario, projection, sectors, callsigns).
  - `tests/lib/`: Typed frontend services, storage adapters, SEO, API gateways.
  - `tests/components/`: Rendered UI component behavior and event handling.
  - `tests/hooks/`: Custom React hooks (`useNumericInputs`, `useUrlState`, `usePageMeta`, `useForm`).
  - `tests/pages/`: Page-level routing, search query sync, state mounting.
  - `tests/app/`: Shell routing, flavor isolation, error boundaries.
  - `tests/scripts/`: Build-time Node.js script validations.
  - `tests/integrity/`: Enforced drift guards across client-server contracts, pricing, and content.
  - `tests/rules/`: Firebase Firestore security rules unit tests (run via emulator: `npm run test:rules`).

### 3.3 Coverage Ratchet Standards
Configured in `vitest.config.ts` (V8 coverage provider):
- **Statements**: >= 76%
- **Branches**: >= 73%
- **Functions**: >= 79%
- **Lines**: >= 77%
- *Rule*: CI enforces a ratcheting mechanism where code additions cannot lower test coverage thresholds.

### 3.4 Integrity Drift Guards (`tests/integrity/`)
1. **`i18n-parity.test.ts`**:
   - Asserts exact 1:1 parity between `en.json` and `ar.json`.
   - Asserts no empty string values in either language.
   - Asserts exact matching of interpolation placeholders (e.g. `{{count}}`, `{{n}}`, `{{pct}}`).
2. **`client-server-mirrors.test.ts`**: Verifies client-side quota/entitlement logic matches `functions/src/*-core.ts`.
3. **`pricing-server-parity.test.ts`**: Verifies frontend pricing quotes match backend charge parameters in SAR.
4. **`csp-parity.test.ts`**: Verifies `firebase.json` Content Security Policy includes all payment and callable origins.
5. **`bento-motion-parity.test.ts`**: Asserts framer-motion tokens match CSS design tokens.
6. **`data-shape.test.ts` & `guides-content.test.ts`**: Validates JSON corpus schema integrity and link routing.
7. **`airport-shards.test.ts`**: Verifies aerodrome shard mapping completeness and region partition consistency.

### 3.5 Full Verification Command Sequence
The root verification command `npm run verify` chains:
```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && npm run check:bundle && npm run check:perf
```
- `check:bundle`: Gates initial gzipped JS bundle at <= 189 kB.
- `check:perf`: Enforces per-chunk gzip limits and total emitted footprint ceilings.

---

## 4. UI/UX Rendering & Design System Standards

### 4.1 The Falcon Design Token System (`src/styles/tokens.css`)
- **Primary Canvas**: `--falcon-night: #0a0e12` (dark cockpit canvas)
- **Elevated Surfaces**: `--falcon-deep: #0f1a24`, `--surface-raised: #13212e`
- **Dividers & Hairlines**: `--falcon-mist: #1a2a38`, `--border-bright: #26384a`
- **Brand Accents**:
  - Primary Brand Teal: `--falcon-teal: #2d6e8a`, `--teal-bright: #4a9cb8`
  - Secondary Accent Sage: `--falcon-sage: #8fc9a8`, `--sage-bright: #b5ddc2`
  - Heritage Gold: `--falcon-gold: #c8a04a`, `--falcon-gold-soft: #e0c588`
  - Caution / Alert Clay: `--falcon-clay: #cf6b52`
- **Signature Gradient**: `--grad-brand: linear-gradient(102deg, #2d6e8a 0%, #8fc9a8 100%)`

### 4.2 Multi-Theme Architecture
1. **Falcon (Default Dark)**: Default cockpit experience. Dark-first on all devices (`color-scheme: dark`).
2. **Cockpit / Night-Ops (`html[data-theme="cockpit"]`)**: Opt-in night-vision skin using low-wavelength amber (`#ffb000`, `#ffc23d`) over deep charcoal (`#121212`) with muted red (`#ff3333`) for alerts, preserving pilot dark adaptation.
3. **Day / Reading (`html[data-theme="day"]`)**: Opt-in ivory reading surface (`#f5f2ed`) with dark ink (`#16212c`) and deepened teal/sage accents for daytime long-form regulatory study.

### 4.3 Responsive Design & Mobile Dock
- **Fluid Layout**: Viewport-scaling typography (`--fs-h1: clamp(2rem, 1.5rem + 2.1vw, 3rem)`).
- **Containers**: `--container: 1180px` (wide tools/dashboards), `--container-narrow: 760px` (study runners, guides, readers).
- **Mobile Navigation Dock**: Fixed bottom navigation bar activates at `<= 860px` viewport width. Main content container applies `padding-block-end: calc(var(--nav-content-h) + var(--space-4) + var(--safe-bottom))` to prevent UI occlusion.
- **Safe Area Insets**: Native and PWA notch/home indicator handling via CSS env variables (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).

### 4.4 Accessibility (WCAG 2.1 AA)
- **Contrast Ratios**:
  - Primary text on dark: `#e8edf2` on `#0a0e12` (14.2:1).
  - Form input borders (`--border-input: #5a6b7b`): clears WCAG 1.4.11 3:1 non-text contrast against background and card surfaces.
- **Touch Target Sizing**: All interactive elements, buttons, and icon toggles enforce Apple HIG minimum `44px × 44px` tappable area (`.touch-target`, `.btn`).
- **Focus Indicators**: Standardized visible focus rings (`:focus-visible`) utilizing `--focus` (`#b5ddc2`) with 2px outline and 2px offset.
- **Motion Accessibility**: `@media (prefers-reduced-motion: reduce)` completely disables keyframe animations, view transitions, and smooth scrolling.

---

## 5. Features Discovered & Specification Catalog

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | CBT Exam Simulation | GACA CBT Simulator Mode | Full-screen timed exam simulation mirroring official GACA test center screens in Riyadh & Jeddah | Question bank selection, answer choices, timed exam session | Score %, pass/fail badge (75% mark), GACAR topic breakdown, official practice transcript | Prevents submission if questions unanswered without confirmation; timer auto-submits on expiry | `src/pages/study/MockExam.tsx`, `src/i18n/en.json` (`cbtMode`, `cbtPassBadge`) |
| 2 | Logbook & Records | GACA Part 61 Logbook | Digital flight logbook with GACAR 61.51 recency tracking (90-day day/night landings, flight review, IFR recency) | Flight entries (date, aircraft type, reg, from, to, total hours, PIC, night, IFR, landings, remarks) | Logbook table, rolling 90-day currency statistics, monthly flight hours chart | Skips malformed rows; alerts on unsynced offline records; validates numeric fields | `src/pages/account/Logbook.tsx`, `src/calc/pilot/logbook.ts` |
| 3 | Logbook & Records | Part 61 PDF / Print Export | Clean printable PDF view formatted to Saudi GACA logbook standards | Query parameter `?print=1` on logbook view | Print-optimized tabular logbook with total time carryovers and signature footer | Gracefully falls back to screen CSS when printing is cancelled | `src/pages/account/Logbook.tsx:117-174`, `account.module.css` |
| 4 | Weather & Atmosphere | High-Temp Density Altitude | Atmosphere calculator handling extreme Saudi summer temperatures (up to 55°C) and high elevations | Field elevation (ft), QNH altimeter setting (hPa/inHg), Outside Air Temp (°C) | Pressure Altitude (ft), Density Altitude (ft), ISA temperature & deviation (ΔISA), performance risk warning | Guards against non-finite floats; clamps inputs to realistic atmospheric ranges | `src/pages/tools/atmosphere-weather/DensityAltitude.tsx`, `src/calc/isa.ts` |
| 5 | Weather & Atmosphere | Pressure Altitude & ISA Tool | Pure ISA standard atmosphere model and barometric deviation computation | Altitude (ft), Barometric pressure (hPa or inHg) | Standard temperature (°C), standard pressure (hPa), pressure altitude (ft) | Returns null on invalid or out-of-range inputs; prevents division by zero | `src/pages/tools/atmosphere-weather/PressureAltitude.tsx`, `src/calc/isa.ts` |
| 6 | Weather & Atmosphere | METAR / TAF Saudi Decoder | Aviation meteorological parser supporting all Saudi international & domestic aerodromes (OERK, OEJN, OEDF, OEMA, etc.) | Raw METAR/TAF string or ICAO code | Decoded wind, visibility, cloud layers, temperature, QNH, flight category (VFR/MVFR/IFR/LIFR) | Highlights unparseable weather tokens; displays raw text with parsing hints | `src/pages/tools/atmosphere-weather/Metar.tsx`, `src/calc/metar.ts` |
| 7 | SAELPT & Phraseology | SAELPT Prep Pack & Scenarios | Practice banks and interactive radiotelephony scenarios for Saudi Aviation English Language Proficiency | Topic choice, ICAO Level 4–6 audio/text prompts, standard phraseology readback | Correct phraseology guidance, phonetic translation, score evaluation | Reports non-standard phraseology; provides ICAO Doc 9432 correct phrase | `src/lib/prepCatalog.ts` (`elp`), `src/pages/study/Packs.tsx` |
| 8 | SAELPT & Phraseology | ICAO Phonetic & Morse Tool | Interactive alphabet, digit, and standard aviation word reference with Morse representation | Letter or word search string | Phonetic spelling (e.g. Alfa, Bravo), Morse code pattern, pronunciation key | Displays empty state with helpful prompt when search query yields no matches | `src/pages/tools/reference/Phonetic.tsx`, `src/data/phonetic.ts` |
| 9 | Persona Dashboard | Operational Role Customization | Persona-driven dashboard layout adapting glance hierarchy to Pilot, Student, Instructor, or Dispatcher | User profile role selection (`pilot`, `student`, `instructor`, `dispatcher`) | Role-prioritized widget sequence, custom quick actions, reordered study/currency cards | Falls back to default pilot layout if role string is undefined or invalid | `src/pages/account/Dashboard.tsx`, `src/calc/app/dashboardLayout.ts` |
| 10 | Persona Dashboard | Widget Customization & Persistence | Drag-to-reorder and show/hide widget toggles for dashboard cards | Widget toggle state & custom ordering array | Persisted custom dashboard layout in localStorage / profile store | Restores newly added system widgets at the end of custom user layout | `src/lib/prefs/dashboardPrefs.ts`, `src/calc/app/dashboardLayout.ts` |
| 11 | Regulatory Library | GACAR Library & Search | Full-text searchable repository of all Saudi civil aviation regulations (Parts 1–199) and AIP | Query string, Part filter, category selector | Paginated and anchor-linked regulation clauses, cross-references, official PDF source links | Displays "no matching regulations" with suggested search terms and Parts | `src/pages/library/Library.tsx`, `src/lib/content.ts` |
| 12 | Navigation & Performance | Crosswind Calculator | Dynamic wind component resolver with visual runway slab diagram | Runway heading (°M), Wind direction (°M), Wind speed (kt), Gust speed (kt) | Headwind (kt), Crosswind (kt), Tailwind warning, maximum recommended crosswind gauge | Normalizes angles 0–360°; alerts on tailwind conditions exceeding safety limits | `src/pages/tools/performance/Crosswind.tsx`, `src/calc/crosswind.ts` |
| 13 | Navigation & Performance | True Airspeed (TAS) & Mach | High-altitude speed resolver accounting for compressibility and temperature | Calibrated Airspeed (CAS/IAS in kt), Pressure Altitude (ft), Temperature (°C) | True Airspeed (kt), Mach number, Speed of Sound (kt) | Validates physical domain (Mach < 5); handles supersonic/subsonic boundaries | `src/pages/tools/performance/Tas.tsx`, `src/calc/tas.ts`, `src/calc/speed.ts` |
| 14 | Navigation & Performance | Weight & Balance Envelope | Multi-station moment arm calculator with CG envelope plot | Empty weight, station weights (pilot, passengers, baggage, fuel in lbs/kg) | Total gross weight, Center of Gravity (inches aft of datum), in-envelope / out-of-envelope status | Flags overweight or forward/aft out-of-envelope conditions with prominent alert | `src/pages/tools/weight-fuel/WeightBalance.tsx`, `src/calc/weightBalance.ts` |
| 15 | Navigation & Procedures | Kingdom Airspace HUD (`/hud`) | Simulated airspace radar scope displaying training traffic across Saudi FIR | Simulated time, sector filter, flight selection | Interactive radar track, altitude, speed, callsign, and flight plan route | Clearly labeled "SIMULATION - NOT REAL AIR TRAFFIC" to prevent operational confusion | `src/pages/hud/Hud.tsx`, `src/calc/hud/` |

---

## 6. Edge Cases & Boundary Conditions

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Density Altitude | OAT = 55°C, Elevation = 3,000 ft, QNH = 998 hPa (Saudi summer extreme) | Calculates density altitude exceeding 7,500 ft; displays high density altitude warning and density ratio reduction alert. |
| 2 | Pressure Altitude | QNH = 1050 hPa (Extremely high pressure) vs 950 hPa (Extremely low pressure) | Correctly handles barometric altimeter scale extremes using standard formula `(1013.25 - QNH) * 30 + Elevation`. |
| 3 | Crosswind Calculation | Runway 34 (340°), Wind 160° at 25 kt (180° Direct Tailwind) | Resolves 25 kt direct tailwind, 0 kt crosswind; triggers visual caution warning and flips runway approach arrow. |
| 4 | Language Switching | Switching from English to Arabic on `/tools/density-altitude?elev=2000&oat=45` | Reconstructs route at `/ar/tools/density-altitude?elev=2000&oat=45`; preserves query parameters and flips entire DOM layout to RTL. |
| 5 | GACA CBT Exam Simulator | Timer reaches `00:00` while candidate is mid-question | Auto-locks candidate answers, computes final score against 75% GACA threshold, and renders pass/fail result stamp. |
| 6 | Logbook CSV Import | CSV file containing quoted fields with embedded commas and Arabic characters | RFC-4180 parser correctly unwraps escaped quotes and preserves UTF-8 Arabic text in remarks and airfield names. |
| 7 | Logbook Recency Calculation | Pilot has 3 day landings 92 days ago and 0 night landings | 90-day currency status marks both Day and Night recency as `EXPIRED (0/3)`, displaying warning pill on dashboard. |
| 8 | Persona Dashboard Layout | User with customized layout signs in on a new device with role `student` | Role default places `study` widget first; user reorders persist cleanly into `dashboardPrefs` store. |
| 9 | i18n Parity Validation | Key added to `en.json` without matching translation in `ar.json` | `tests/integrity/i18n-parity.test.ts` fails during `npm test`, stopping CI build before merge. |
| 10 | High-Concurrency Vitest Run | Full test suite (223 test files) running concurrently on resource-constrained environment | Aerodrome shard file iteration in `airport-shards.test.ts` may exceed default 5000ms timeout if not given adequate timeout configuration. |
| 11 | Color Theme Contrast | Night-Ops Cockpit Theme active in bright daylight reading mode | User can toggle to Day Theme via ThemeToggle, instantly swapping from `#121212` charcoal/amber to `#f5f2ed` ivory/ink with AA-compliant contrast. |
| 12 | SAELPT Phraseology Trainer | User inputs non-standard abbreviation "roger wilco over and out" | Flags phraseology violation; explains why "over" and "out" are mutually exclusive under ICAO Doc 9432. |

---

## 7. Conclusions & Recommendations for Implementation

1. **Strict Type Safety**: The codebase currently complies with `tsc -b --noEmit` with `0` errors. All new feature components must strictly adhere to exported types in `src/lib/content.types.ts`, `src/lib/prepCatalog.ts`, and `src/calc/`.
2. **i18n Parity Enforcement**: Any newly authored strings for CBT Simulator, Logbook, Altitude Calculators, SAELPT, or Personas must be added simultaneously to both `src/i18n/en.json` and `src/i18n/ar.json` using the established terminology dictionary.
3. **Responsive & Logical Design**: Components must continue to utilize CSS Modules with CSS Logical Properties (`margin-inline`, `padding-block`, `inset-inline-start`) and design tokens from `tokens.css`.
4. **Test Coverage Maintenance**: Every new calculator math helper must reside in pure functions under `src/calc/` and have co-located or mirrored unit tests in `tests/calc/` to satisfy the V8 coverage ratchet thresholds.
