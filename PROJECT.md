# Project: FlyGACA Expansion & Optimization

## Architecture
FlyGACA is a production-grade educational and operational civil aviation web platform built with React 19, Vite 8, React Router 8, and TypeScript 7, tailored for Saudi civil aviation regulations (GACARs), Saudi AIP, and General Authority of Civil Aviation (GACA) pilot certifications.

```
                  ┌─────────────────────────────────────────────────┐
                  │                 React 19 UI                     │
                  │  (Pages: MockExam, Logbook, DensityAlt,         │
                  │   PackContents, Dashboard, Layout, Dock)        │
                  └──────────────┬──────────────────┬───────────────┘
                                 │                  │
               ┌─────────────────┴────┐      ┌──────┴──────────────────┐
               │    i18n & RTL Core   │      │ Pure Calc & Domain Logic│
               │ (en.json / ar.json,  │      │ (isa.ts, logbook.ts,    │
               │  Readex Pro, tokens) │      │  altimetry.ts, layout)  │
               └──────────────────────┘      └─────────────┬───────────┘
                                                           │
                                             ┌─────────────┴───────────┐
                                             │ Storage, Datasets & AIP │
                                             │ (quiz.json, airports,   │
                                             │  localStore / Firestore)│
                                             └─────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | GACA CBT Exam Engine | Full exam simulation with timed sessions, fuel-gauge countdown bar, question pool picking, pass/fail threshold (75%/80%), question bookmarking/flagging, and pre-submission jump grid | M1 | Survey |
| 2 | CBT Score Analytics & Citations | Detailed score breakdowns by GACAR regulatory topic / bank, stamp verification (`PASS`/`FAIL`), and question-by-question review with GACAR citation deep-links | M1 | Survey |
| 3 | Multi-License Exam Packs | Tailored question banks for PPL, CPL, IR, ATPL, ELP, and Conversion certifications | M1 | Survey |
| 4 | GACA Part 61 Flight Logging | Full flight entry schema: Date, Type, Reg, From, To, Total, PIC, SIC, Dual, Solo, XC, Night, Actual/Simulated Instrument, Landings (Day/Night), Approaches, Remarks | M2 | Survey |
| 5 | GACA 90-Day Currency Recency | Rolling 90-day day/night passenger-carrying recency calculations, flight review recency, and medical currency tracking | M2 | Survey |
| 6 | Logbook Multi-Format Export & PDF | Full account backup (JSON), RFC 4180 multiline CSV export/import, and printable A4 Landscape GACAR Part 61 PDF view (`?print=1`) | M2 | Survey |
| 7 | High-Temp Density Altitude Calculator | Density altitude physics with extreme desert heat warning alert (OAT > 45°C) and high-elevation aerodrome warning (elevation >= 4,000 ft) | M3 | Survey |
| 8 | Saudi Aerodrome Database & Altimetry | Altimetry (Pressure Altitude, True Altitude, QNH/QFE, ISA deviation) with Saudi aerodrome catalog (Abha OEAB, Taif OETF, Riyadh OERK, Jeddah OEJN, Dammam OEDF) | M3 | Survey |
| 9 | Saudi Desert METAR/TAF Hazards | METAR parser detecting regional desert phenomena (`shamal_dust`, `haboob`, blowing sand/dust with low visibility) | M3 | Survey |
| 10 | SAELPT Radiotelephony Scenarios | Saudi airport ATC communication scenarios for Riyadh (OERK), Jeddah (OEJN), and Dammam (OEDF) covering Clearance, Pushback, Taxi, Tower, Departure, Approach | M4 | Survey |
| 11 | ICAO/SAELPT Phraseology Trainer | ICAO Doc 9835 / Annex 1 Level 4+ criteria training with phonetic alphabet (NATO/ICAO), Morse code drills, and phraseology flashcards with SRS | M4 | Survey |
| 12 | Persona Hierarchy & Role Customization | 4 distinct personas (`student`, `pilot`, `instructor`, `dispatcher`) with tailored widget ordering, quick action buttons, and custom layout preferences | M5 | Survey |
| 13 | Role Onboarding & Widget Management | RolePicker onboarding for new pilots and interactive collapsible dashboard customizer for widget reordering and visibility toggles | M5 | Survey |
| 14 | Bilingual Arabic (RTL) / English Localization | Complete English and Arabic bundles with Readex Pro font, dynamic `dir="rtl"` / `dir="ltr"` mirroring, `/ar` URL prefix routing, and verified Saudi aviation terminology | M6 | Survey |
| 15 | Type Safety & Comprehensive Testing | Strict TypeScript (`tsc -b --noEmit` -> 0 errors), 226 Vitest test suites (1,605+ tests passing), and automated integrity drift guards | M6 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | GACA CBT Exam Simulation | CBT simulator engine, question banks, timers, review grid, GACAR citations, pass/fail grading | none | DONE |
| M2 | GACA Part 61 Logbook & PDF Export | Flight logging schema, 90-day currency engine, RFC 4180 CSV/JSON I/O, A4 landscape print/PDF exporter | none | DONE |
| M3 | Saudi Weather & High-Temp Calculators | High-temp density altitude, Saudi aerodrome catalog, altimetry, desert METAR/TAF hazard detection | none | DONE |
| M4 | SAELPT Phraseology Trainer | Radiotelephony scenarios (OERK/OEJN/OEDF), ICAO Level 4 phraseology drills, phonetic alphabet | none | DONE |
| M5 | Persona Dashboard Customization | 4 persona workflows (student, pilot, instructor, dispatcher), widget ordering, customizer panel | none | DONE |
| M6 | Bilingual i18n & E2E Verification | Full Arabic RTL / English parity, 0 TypeScript errors, Vitest test suite execution and verification gate | M1, M2, M3, M4, M5 | DONE |

## Interface Contracts
### CBT Exam Engine (`src/pages/study/MockExam.tsx`, `src/lib/studyProgress.ts`)
```typescript
interface ExamConfig {
  timeLimitSec: number;
  passMarkPct: number;
  questionCount: number;
  categories: string[];
}
interface ExamResult {
  scorePct: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  byBank: Record<string, { total: number; correct: number; pct: number }>;
  timeSpentSec: number;
}
```

### Logbook & Part 61 Engine (`src/calc/pilot/logbook.ts`, `src/lib/services/account.ts`)
```typescript
interface Flight {
  id: string;
  date: string;
  type: string;
  reg: string;
  from: string;
  to: string;
  total: number;
  pic?: number;
  sic?: number;
  dual?: number;
  solo?: number;
  xc?: number;
  night?: number;
  ifr?: number;
  ldg?: number;
  nightLdg?: number;
  appr?: string;
  remarks?: string;
}
interface LogbookSummary {
  totalHours: number;
  picHours: number;
  dualHours: number;
  xcHours: number;
  nightHours: number;
  ifrHours: number;
  landings: number;
  nightLandings: number;
  recent90Days: { total: number; landings: number; nightLandings: number; current: boolean };
}
```

### Atmosphere & Altimetry Engine (`src/calc/isa.ts`, `src/calc/altimetry.ts`)
```typescript
function pressureAltitude(elevationFt: number, qnhHpa: number): number;
function isaTemperature(pressureAltitudeFt: number): number;
function isaDeviation(pressureAltitudeFt: number, oatC: number): number;
function densityAltitude(pressureAltitudeFt: number, oatC: number): number;
function isExtremeDesertHeat(oatC: number): boolean; // oatC >= 45°C
function isHighElevationAerodrome(elevationFt: number): boolean; // elevationFt >= 4000
```

### Dashboard Layout Engine (`src/calc/app/dashboardLayout.ts`)
```typescript
type UserRole = 'student' | 'pilot' | 'instructor' | 'dispatcher';
interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}
function getDefaultWidgetsForRole(role: UserRole): string[];
function getQuickActionsForRole(role: UserRole): Array<{ id: string; labelKey: string; path: string; icon: string }>;
```

## Code Layout
- `src/pages/study/` — CBT Exam simulator, quiz runner, flashcards, pack contents
- `src/pages/account/` — Logbook manager, printable PDF view (`?print=1`), dashboard, role picker
- `src/pages/tools/atmosphere-weather/` — Density altitude, pressure altitude, METAR/TAF, true altitude
- `src/calc/` — Pure mathematical and regulatory engines (zero DOM dependencies)
- `src/i18n/` — Localization dictionaries (`en.json`, `ar.json`) and configuration
- `src/styles/` — Dark-cockpit tokens (`tokens.css`), logical property layouts
- `tests/` — Automated Vitest test suites (226 files, 1,605 tests)
