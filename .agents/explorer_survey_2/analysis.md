# FlyGACA Technical Domain & Feature Architecture Analysis

**Author**: Explorer Survey 2  
**Date**: 2026-08-14  
**Project**: FlyGACA Expansion & Optimization  
**Target Workspace**: `/Users/ad/.gemini/antigravity/scratch/FlyGACA-app`  

---

## 1. Executive Summary & Scope Overview

FlyGACA is the premier educational and regulatory web platform tailored to civil aviation in the Kingdom of Saudi Arabia (KSA). This investigation provides an exhaustive technical and domain-level specification for the **5 core feature pillars** required for platform maturity and pilot workflow enablement:

1. **GACA CBT Exam Simulation**: Standardized Computer-Based Testing engine adhering to GACAR Part 61 knowledge testing requirements, multi-category question banks, randomized draws, live fuel-timer gauges, bookmarking, and GACA-styled score certification with detailed regulatory citations.
2. **GACA Part 61 Logbook & PDF Exporting**: Comprehensive digital logbook complying with GACAR §61.51 recording standards, capturing granular flight conditions (PIC, SIC, Dual Received/Given, Solo, Cross-Country, Night, Actual/Simulated Instrument, Landings, Approaches, and CFI endorsements), rolling 90-day currency metrics, and audit-ready landscape PDF export.
3. **Saudi Weather & High-Temp Altitude Calculators**: Dedicated aviation performance suite engineered for Saudi Arabia's unique operational challenges—high field elevations (Abha 6,858 ft, Al-Baha 5,486 ft) coupled with extreme summer temperatures (45°C–52°C+) resulting in density altitudes exceeding 10,000 ft—with METAR/TAF parsing, sandstorm/haboob hazard detection, and thermodynamic equations.
4. **SAELPT Phraseology Trainer**: Saudi Aviation English Language Proficiency Test trainer calibrated to ICAO Annex 1 / Doc 9835 Level 4+ criteria across all 6 core linguistic skills, interactive ATC dialogue scenarios (Clearance, Ground, Tower, Approach, Emergency), and phonetic alphabet drills.
5. **Persona-Based Dashboard**: Customized Bento-grid interface adapting dynamically to 4 core aviation personas (Student Pilot, PPL/CPL Candidate, Airline/Commercial Pilot, and Flight Instructor / CFI) with tailored widget hierarchies, training milestone tracking, recency alerts, and study streaks.

---

## 2. Pillar 1: GACA CBT Exam Simulation

### 2.1 Domain & Regulatory Context
Under **GACAR Part 61 §61.35 ("Knowledge Test: Prerequisites and Passing Grades")**, candidates for pilot licences and ratings (PPL, CPL, IR, ATPL) must achieve a passing grade of **at least 70% or 75%** on a computerized multiple-choice examination administered at authorized test centers.

The testing simulation must replicate the authentic testing experience:
- **Strict Timers**: Time limits varying from 30 minutes (25 questions) up to 150 minutes (100 questions).
- **Proportional Subject Representation**: Questions balanced across core aeronautical disciplines.
- **Review & Flagging**: Ability to flag questions for later review and jump between questions via an interactive summary matrix before final submission.
- **Regulatory Transparency**: Post-exam breakdown with itemized question review citing specific GACAR sections (e.g. `GACAR §91.165`) with direct links to the regulatory corpus.

### 2.2 Question Bank Categories & Taxonomy
The question bank structure in `public/data/quiz.json` encompasses 26 distinct topic banks organized into core knowledge domains:

| Domain Category | Associated Bank IDs | Key Focus Areas & Regulations |
|---|---|---|
| **Air Law & Regulations** | `vfr-flight-rules`, `airspace`, `air-law`, `pilot-licensing`, `ifr-rules`, `commercial-ops`, `air-transport-ops` | GACAR Parts 1, 61, 71, 91, 119, 121, 135; airspace classifications A–G; right-of-way rules; VFR/IFR cruising levels. |
| **Aeronautical Information & Charts** | `aip-ais`, `aip-charts`, `instrument-procedures` | Saudi AIP (GEN, ENR, AD), NOTAM decoding, STARs, SIDs, IAP plates, approach minima, transition altitudes. |
| **Meteorology & Atmosphere** | `weather`, `advanced-weather-performance` | Atmospheric physics, altimetry, METAR/TAF, jet streams, icing, thunderstorms, regional hazards (Shamal, Haboob, dust). |
| **Aircraft General Knowledge & Systems** | `aircraft-equipment`, `aerodynamics`, `commercial-performance`, `transport-performance` | Airframe structures, piston/turbine engines, electrical systems, pitot-static instruments, flight computers, fly-by-wire. |
| **Human Performance & Limitations** | `human-factors`, `medical` | Aviation physiology, hypoxia stages, spatial disorientation, fatigue management, optical illusions, GACAR Part 67 medicals. |
| **Navigation & Flight Planning** | `navigation`, `flight-planning` | Dead reckoning, VOR/DME, GNSS/GPS, PBN/RNP specifications, wind correction angles, weight & balance, fuel reserves. |
| **Aviation English & Radiotelephony** | `radio-elpt`, `elpt-phraseology`, `elpt-comprehension`, `elpt-rating-scale` | ICAO standard phraseology, readback requirements, emergency communications (MAYDAY, PAN PAN), phonetic alphabet. |

### 2.3 Required Data Models & TypeScript Interfaces

```typescript
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // 0-indexed index of correct option
  explain: string;
  cite?: string;
  citeRef?: {
    kind: 'regulations' | 'guide' | 'aip';
    id: string;
    anchor?: string;
  };
}

export interface QuizBank {
  id: string;
  title: string;
  desc: string;
  source: string;
  questions: QuizQuestion[];
}

export interface ExamConfig {
  title: string;
  questions: number;
  minutes: number;
  passMark: number; // Percentage, e.g. 75
}

export interface ExamQuestionState extends QuizQuestion {
  bankTitle: string;
  bankId: string;
  selectedOption: number | null;
  flagged: boolean;
  eliminatedOptions: number[]; // Strikethrough distractors
}

export interface ExamResultRecord {
  id: string;
  examTitle: string;
  packId?: string;
  date: string; // ISO string
  scorePercent: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  byTopic: {
    bankId: string;
    bankTitle: string;
    total: number;
    correct: number;
    percentage: number;
  }[];
}
```

### 2.4 State Machine & UI Workflows

```
┌─────────────────┐      Start Exam      ┌──────────────────┐
│                 │ ───────────────────> │                  │ <─┐
│ Exam Welcome &  │                      │ Live Exam Runner │   │ Next / Prev /
│  Config View    │ <─────────────────── │ (Timer, Flagging)│ ──┘ Jump to Index
└─────────────────┘      Quit Exam       └──────────────────┘
                                                  │
                                            Review Summary
                                                  │
                                                  ▼
┌─────────────────┐                     ┌──────────────────┐
│ Post-Exam CBT   │   Submit & Grade    │ Pre-Submit Jump  │
│ Certificate &   │ <────────────────── │ Matrix (Answered,│
│ Detailed Review │                     │  Flagged Status) │
└─────────────────┘                     └──────────────────┘
```

1. **Pre-Exam Configuration**: Display certificate/pack selection, pass threshold (e.g. 75%), question count, and time allowance.
2. **Execution State**:
   - Time tracking with visual fuel gauge progress and threshold warnings (`warn` at ≤ 5 min, `danger` at ≤ 1 min).
   - Question view with option selection, distractor strikeout toggle, and bookmark/flag toggle.
   - Jump Matrix: Responsive grid displaying questions 1..N with distinct styling for (a) Unanswered, (b) Answered, and (c) Flagged.
3. **Grading & Certificate**:
   - GACA-styled embossed stamp ("PASSED" in green or "NEEDS RETEST" in crimson).
   - Topic Breakdown matrix highlighting subject strengths and weaknesses.
   - Comprehensive Review with full rationale, exact regulation citation links, and option to bookmark questions into personal review flashcards.

---

## 3. Pillar 2: GACA Part 61 Logbook & PDF Exporting

### 3.1 GACAR §61.51 Regulatory Standards
Under **GACAR Part 61 §61.51**, aeronautical experience must be documented in a reliable and verifiable logbook. The logbook must record:
- **General**: Date, Flight Time (Total Duration), Departure & Arrival Locations, Aircraft Make/Model, Aircraft Registration.
- **Piloting Capacity**:
  - Pilot-in-Command (PIC)
  - Second-in-Command (SIC / Co-pilot)
  - Dual Instruction Received (from authorized GACA Flight Instructor)
  - Solo Flight Time
  - Dual Instruction Given (for authorized Flight Instructors)
- **Conditions of Flight**:
  - Day & Night Flight Time
  - Cross-Country (XC) Time (Point-to-point flights meeting minimum distance criteria)
  - Actual Instrument Flight Time (in IMC)
  - Simulated Instrument Time (under the hood / view-limiting device)
  - Flight Simulation Training Device (FSTD / Synthetic Trainer) time
- **Landings & Procedures**: Day Landings, Night Landings (to a full stop), Instrument Approaches (quantity and procedure type).
- **Instructor Endorsements**: GACA endorsement statements, CFI certificate number, signature, and expiration date.

### 3.2 Extended Logbook Data Schema

```typescript
export interface GACALogbookEntry {
  id: string;
  date: string; // YYYY-MM-DD
  aircraftType: string; // e.g. "C172", "DA40", "A320"
  aircraftIdent: string; // e.g. "HZ-FGC"
  routeFrom: string; // ICAO, e.g. "OERK"
  routeTo: string; // ICAO, e.g. "OEJN"
  routeVia?: string; // e.g. "KAGAL DCT"
  departureTime?: string; // HH:mm (Zulu)
  arrivalTime?: string; // HH:mm (Zulu)
  
  // Flight Times (decimal hours, e.g. 1.8)
  totalDuration: number;
  picTime: number;
  sicTime: number;
  dualReceivedTime: number;
  dualGivenTime: number;
  soloTime: number;
  crossCountryTime: number;
  nightTime: number;
  actualInstrumentTime: number;
  simulatedInstrumentTime: number;
  fstdTime: number;

  // Landings & Approaches
  dayLandings: number;
  nightLandings: number;
  instrumentApproachesCount: number;
  instrumentApproachType?: string; // e.g. "ILS RWY 34L", "RNP RWY 16"

  // Remarks, Training & Endorsements
  remarks: string;
  instructorName?: string;
  instructorCertNo?: string;
  instructorCertExpiry?: string; // YYYY-MM-DD
  endorsementType?: 
    | 'solo_initial'
    | 'solo_cross_country'
    | 'flight_review_61_56'
    | 'ipc_61_57'
    | 'high_performance'
    | 'complex'
    | 'tailwheel'
    | 'custom';
}
```

### 3.3 Logbook Aggregations & Currency Logic
The logbook engine must compute:
1. **Lifetime & Period Totals**:
   - Total Hours, Total PIC, Total Dual, Total Solo, Total XC, Total Night, Total Instrument (Actual + Simulated + FSTD).
   - Total Day Landings, Total Night Landings.
2. **Rolling 90-Day Passenger Carriage Recency (GACAR §61.57(a)/(b))**:
   - Day Passenger Currency: Minimum 3 takeoffs and 3 landings in the same category/class within the preceding 90 days.
   - Night Passenger Currency: Minimum 3 takeoffs and 3 landings to a *full stop* during night (sunset to sunrise) within preceding 90 days.
3. **Rolling 6-Month Instrument Currency (GACAR §61.57(c))**:
   - Within preceding 6 calendar months: 6 instrument approaches, holding procedures, and intercepting/tracking courses.

### 3.4 Professional Landscape PDF Export Architecture
The PDF export must follow standard GACA / ICAO two-page spread formatting rendered to A4 Landscape:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ GACA CIVIL AVIATION PILOT LOGBOOK — KINGDOM OF SAUDI ARABIA                     Pilot: Capt. Ahmed Al-Ghamdi (GACA 10482)│
├──────────┬─────────────────┬──────────────┬────────┬─────────────────────────┬──────────────────────┬──────────┬─────────────┤
│ DATE     │ AIRCRAFT        │ ROUTE        │ TOTAL  │ OPERATIONAL CAPACITY    │ CONDITIONS OF FLIGHT │ LANDINGS │ REMARKS &   │
│          │ Type    Ident   │ From    To   │ TIME   │ PIC  SIC  Dual Solo XC  │ Night Act.Inst Sim.  │ Day  Ngt │ ENDORSEMENT │
├──────────┼─────────────────┼──────────────┼────────┼─────────────────────────┼──────────────────────┼──────────┼─────────────┤
│ 2026-08-01 C172    HZ-ABC  │ OERK   OEJN  │  4.2   │ 4.2  -    -    -   4.2 │  1.0   -        1.5  │  1    1  │ VFR XC Nav  │
│ 2026-08-05 DA40    HZ-DEF  │ OERK   OETB  │  3.5   │  -   -   3.5   -   3.5 │   -    0.8      1.2  │  2    -  │ IFR Dual    │
├──────────┴─────────────────┴──────────────┼────────┼─────────────────────────┼──────────────────────┼──────────┼─────────────┤
│ TOTAL THIS PAGE                           │  7.7   │ 4.2  -   3.5   -   7.7 │  1.0   0.8      2.7  │  3    1  │             │
│ AMOUNT BROUGHT FORWARD                    │ 142.3  │ 85.0 -  57.3  15.0 45.0│ 18.5  12.0     22.0  │ 110  25  │             │
│ TOTAL TO DATE                             │ 150.0  │ 89.2 -  60.8  15.0 52.7│ 19.5  12.8     24.7  │ 113  26  │             │
├───────────────────────────────────────────┴────────┴─────────────────────────┴──────────────────────┴──────────┴─────────────┤
│ I certify that the entries in this logbook are true and correct: __________________________   Date: ____________________ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Styling Specs**: Print media stylesheet (`@media print`) with `@page { size: A4 landscape; margin: 8mm; }`, page-break controls (`page-break-after: always`), table header repeat on each page (`thead { display: table-header-group; }`), and high-contrast typography.

---

## 4. Pillar 3: Saudi Weather & High-Temp Altitude Calculators

### 4.1 Climatological & Geographical Dynamics in KSA
Aviation in Saudi Arabia faces severe environmental extremes:
1. **High Elevation Airfields**:
   - **OEAB (Abha)**: Elevation **6,858 ft MSL** (2,090 m)
   - **OEBA (Al-Baha)**: Elevation **5,486 ft MSL** (1,672 m)
   - **OETF (Taif)**: Elevation **4,846 ft MSL** (1,477 m)
   - **OENG (Najran)**: Elevation **3,982 ft MSL** (1,214 m)
   - **OEHL (Hail)**: Elevation **3,331 ft MSL** (1,015 m)
2. **Extreme Summer Heat (45°C – 52°C+)**:
   - Even low-elevation coastal or desert stations (e.g. Riyadh OERK at 2,049 ft or Dammam OEDF at 72 ft) frequently hit 48°C–50°C in summer.
   - At OERK (2,049 ft MSL) at 48°C: Density Altitude exceeds **6,400 ft**!
   - At OEAB (6,858 ft MSL) at 35°C: Density Altitude exceeds **10,800 ft**!

### 4.2 Saudi Aerodrome Database Specification

```typescript
export interface SaudiAirport {
  icao: string;
  iata?: string;
  nameEn: string;
  nameAr: string;
  cityEn: string;
  cityAr: string;
  elevationFt: number;
  latitude: number;
  longitude: number;
  category: 'international' | 'regional' | 'domestic' | 'military';
  runways: {
    ident: string; // e.g. "15L/33R"
    lengthFt: number;
    widthFt: number;
    surface: 'asphalt' | 'concrete' | 'sand';
    headings: [number, number]; // [154, 334]
  }[];
  frequencies?: { type: string; mhz: string }[];
}
```

**Key Saudi Airports in Catalog**:
- `OEJN` — King Abdulaziz Intl, Jeddah (Elev: 48 ft)
- `OERK` — King Khalid Intl, Riyadh (Elev: 2,049 ft)
- `OEDF` — King Fahd Intl, Dammam (Elev: 72 ft)
- `OEMA` — Prince Mohammad Bin Abdulaziz Intl, Madinah (Elev: 2,151 ft)
- `OEAB` — Abha Intl, Abha (Elev: 6,858 ft)
- `OEBA` — King Saud Bin Abdulaziz, Al-Baha (Elev: 5,486 ft)
- `OETF` — Taif Regional, Taif (Elev: 4,846 ft)
- `OEGN` — King Abdullah Bin Abdulaziz, Jizan (Elev: 20 ft)
- `OEHL` — Hail Regional, Hail (Elev: 3,331 ft)
- `OEGS` — Prince Naif Bin Abdulaziz, Qassim (Elev: 2,126 ft)
- `OEAH` — Al-Ahsa Intl, Hofuf (Elev: 588 ft)
- `OEYN` — Prince Abdulmohsin Bin Abdulaziz, Yanbu (Elev: 26 ft)
- `OEAO` — AlUla Intl, AlUla (Elev: 2,100 ft)
- `OENN` — Neom Bay Airport, Neom (Elev: 260 ft)
- `OERS` — Red Sea Intl, Hanak (Elev: 75 ft)
- `OETB` — Prince Sultan Bin Abdulaziz, Tabuk (Elev: 2,551 ft)
- `OENG` — Najran Regional, Najran (Elev: 3,982 ft)
- `OESH` — Sharurah Domestic, Sharurah (Elev: 2,363 ft)
- `OERF` — Rafha Domestic, Rafha (Elev: 1,474 ft)
- `OERR` — Arar Domestic, Arar (Elev: 1,813 ft)
- `OEWD` — Wadi Al-Dawasir Domestic (Elev: 2,062 ft)

### 4.3 Aviation Physics & Mathematical Formulas

#### 1. Pressure Altitude ($PA$)
$$PA = \text{Elevation (ft)} + (1013.25 - QNH_{\text{hPa}}) \times 27.3$$
*Alternatively in inches of mercury:*
$$PA = \text{Elevation (ft)} + (29.92 - QNH_{\text{inHg}}) \times 1000$$

#### 2. ISA Standard Temperature ($T_{\text{ISA}}$) & ISA Deviation ($\Delta ISA$)
$$T_{\text{ISA}} = 15^\circ\text{C} - \left(1.98^\circ\text{C} \times \frac{PA}{1000}\right)$$
$$\Delta ISA = OAT - T_{\text{ISA}}$$

#### 3. Density Altitude ($DA$)
Standard Aviation Approximation:
$$DA = PA + (118.8 \times \Delta ISA)$$
Thermodynamic Exact Equation (Troposphere $< 36,089\text{ ft}$):
$$\delta = \left(1 - 6.87535 \times 10^{-6} \times PA\right)^{5.2559}$$
$$\theta = \frac{OAT + 273.15}{288.15}$$
$$\sigma = \frac{\delta}{\theta} \quad (\text{Density Ratio})$$
$$DA = 145442.15 \times \left(1 - \sigma^{0.234969}\right)$$

#### 4. True Airspeed ($TAS$) & Mach Number
$$TAS = \frac{CAS}{\sqrt{\sigma}}$$
$$a = 38.967 \times \sqrt{OAT + 273.15} \quad (\text{Speed of Sound in knots})$$
$$Mach = \frac{TAS}{a}$$

#### 5. Crosswind & Headwind / Tailwind
$$\alpha = (\text{Wind Direction} - \text{Runway Heading})$$
$$\text{Crosswind} = \text{Wind Speed} \times \sin(\alpha) \quad [+\text{Right}, -\text{Left}]$$
$$\text{Headwind} = \text{Wind Speed} \times \cos(\alpha) \quad [+\text{Headwind}, -\text{Tailwind}]$$

#### 6. High-Temperature Performance Penalty Metrics
- **Takeoff Distance Multiplier**: $\approx 1 + 0.10 \times \left(\frac{DA - \text{Elevation}}{1000}\right)$ (Rule of thumb: +10% ground roll per 1,000 ft increase in DA).
- **Climb Rate Degradation**: $\approx \text{Standard Climb Rate} \times \left(1 - \frac{DA}{15000}\right)$.
- **Operational Safety Warning Trigger**: Alert when $DA \ge 5000\text{ ft}$ or $OAT \ge 40^\circ\text{C}$ or Tailwind $\ge 5\text{ kt}$.

### 4.4 METAR / TAF Decoder & Saudi Hazard Classifier
The weather engine decodes standard METAR/TAF strings and classifies regional weather hazards:
- `shamal_dust`: Triggered by tokens `DS`, `SS`, `DU`, `SA`, `BLDU`, `BLSA`, `HZ`.
- `haboob`: Severe convective dust storm where visibility drops below 1,500 m with dust tokens.
- `extreme_heat`: OAT $\ge 45^\circ\text{C}$ triggering high-temp performance degradation warnings.
- `convective_hazard`: `+TSRA`, `CB`, `TCU`, `SQ` indicating thunderstorm turbulence, severe updrafts/downdrafts, and low-level windshear.

---

## 5. Pillar 4: SAELPT Phraseology Trainer

### 5.1 ICAO Language Proficiency Framework (Doc 9835 / Annex 1)
All commercial and international private pilots operating in Saudi airspace must hold an **ICAO Level 4 (Operational)**, **Level 5 (Extended)**, or **Level 6 (Expert)** language endorsement.

The test assesses 6 discrete linguistic proficiencies:
1. **Pronunciation**: Clear articulation; accent is intelligible to the international aeronautical community.
2. **Structure**: Relevant grammatical structures and syntax without errors that alter operational meaning.
3. **Vocabulary**: Precision in standard ICAO radiotelephony phraseology + rich plain English for non-routine contingencies.
4. **Fluency**: Appropriate speech tempo, minimal hesitation, avoiding non-standard fillers.
5. **Comprehension**: Accurate reception of clearances, complex instructions, and abnormal situations without multiple repetitions.
6. **Interactions**: Immediate, clear, and assertive communications; prompt readback/hearback verification.

*The holistic rating is governed by the lowest individual score among the 6 areas.*

### 5.2 Radiotelephony Domains & Scenario Catalog
The trainer incorporates realistic simulated ATC communication workflows:

| Communications Phase | Scenario Examples | Key Standard Phraseology |
|---|---|---|
| **ATIS & Clearance Delivery** | Receiving IFR departure clearance at Riyadh (OERK). | *"Cleared to Jeddah via KAGAL 1P departure, flight level 320, squawk 4215."* |
| **Ground & Taxi** | Pushback, startup, and taxi instructions at Jeddah (OEJN). | *"Pushback and start approved, facing south, QNH 1011."* / *"Taxi to holding point Runway 34C via taxiways K and N, hold short Runway 34C."* |
| **Tower / Takeoff & Landing** | Line up and wait, immediate takeoff, go-around. | *"Lined up and wait Runway 34L."* / *"Wind 310 degrees 12 knots, Runway 34L cleared for takeoff."* / *"Going around, Saudia 124."* |
| **Approach & Radar Control** | Radar vectoring, descent constraints, ILS/RNP approach intercept. | *"Turn right heading 320, descend and maintain 3000 feet, cleared ILS Runway 34L approach."* |
| **Enroute & FIR Boundary** | Oceanic / Desert crossing, step climbs, direct waypoints. | *"Climb and maintain FL380, report reaching."* / *"Direct GIDIS."* |
| **Emergency & Abnormal** | Engine failure after V1, hydraulic failure, unruly passenger, bird strike. | *"MAYDAY MAYDAY MAYDAY, Saudia 124, engine failure, returning to Riyadh, request vectors."* |

### 5.3 Interactive Features & Data Models

```typescript
export interface SaelptScenarioStep {
  speaker: 'atc' | 'pilot';
  transmissionText: string;
  expectedReadbackText?: string;
  audioClipUrl?: string;
  distractorOptions?: string[]; // Multiple choice options for training mode
  criticalReadbackElements: string[]; // Elements that MUST be present: ["34L", "3000", "1012"]
  explanation: string;
}

export interface SaelptScenario {
  id: string;
  titleKey: string;
  airportIcao: string;
  facility: 'clearance' | 'ground' | 'tower' | 'approach' | 'enroute' | 'emergency';
  difficulty: 'level4' | 'level5' | 'level6';
  steps: SaelptScenarioStep[];
}

export interface PhoneticAlphabetItem {
  letter: string;
  telephonyWord: string;
  morse: string;
  audioPronunciationUrl?: string;
  digitsPronunciation?: string; // e.g. "NINER", "TREE", "FIFE"
}
```

---

## 6. Pillar 5: Persona-Based Dashboard Customization

### 6.1 User Personas & Tailored Workflows

| Persona Profile | Core Objectives & Daily Priorities | High-Priority Dashboard Widgets | Recommended Quick Actions |
|---|---|---|---|
| **1. Student Pilot** (`student`) | Initial licensing (PPL), ground school exam preparation, basic radio procedures, first solo flight milestone. | 1. CBT Exam Progress & Weak Topics<br>2. Ground School Modules<br>3. Flashcards & Study Streak<br>4. Onboarding Checklist<br>5. Weather / VFR Minima | - Practice CBT Exam (`/study/exam`)<br>- Open Flashcards (`/study/flashcards`)<br>- Log Dual Flight (`/logbook?add=1`)<br>- Ask Captain Adel (`/chat`) |
| **2. PPL / CPL Candidate** (`candidate`) | Commercial hour building (250h Total, 100h PIC, 50h XC), high-temp density altitude takeoff calculations, SAELPT Level 4 prep. | 1. Part 61 Hour Milestone Tracker<br>2. CBT Exam (CPL / IR)<br>3. High-Temp & DA Calculator<br>4. SAELPT Phraseology Trainer<br>5. 90-Day Recency Board | - Add Logbook Flight (`/logbook?add=1`)<br>- Calculate DA / Performance (`/tools`)<br>- Take CPL Mock Exam (`/study/exam?pack=cpl`)<br>- Practice SAELPT (`/study/packs/elp`) |
| **3. Airline / Commercial Pilot** (`pilot`) | 90-day landing currency (day/night), 6-month IFR approaches, Class 1 medical renewal, airport weather & NOTAM briefings. | 1. Currency & Recency Board<br>2. Saudi Airport Weather (METAR/TAF)<br>3. Trailing 90-day / 12-mo Hours Trend<br>4. Regulatory Change Alerts<br>5. Logbook Summary & PDF Export | - Quick Log Entry (`/logbook?add=1`)<br>- Airport Briefing (`/tools`)<br>- Export PDF Logbook (`/logbook`)<br>- Export Calendar Expiries (`.ics`) |
| **4. Flight Instructor / CFI** (`instructor`) | Student endorsements, instructional flight logging (Dual Given), instructor renewal currency (§61.197), standard flight maneuver guides. | 1. Instructor Currency & Expiries<br>2. Pilot Records & Endorsement Generator<br>3. Dual Given / Total Hours Breakdown<br>4. Quick Reference Library<br>5. Training Tools | - Create Student Endorsement (`/records`)<br>- Log Dual Given Flight (`/logbook?add=1`)<br>- Review GACAR Regulations (`/library`)<br>- Flight Review Checklist (`/tools`) |

### 6.2 Layout Engine & Customization Architecture
The dashboard uses a responsive Bento grid architecture:
- **Default Hierarchy by Role**: Defined via `dashboardOrder(role: UserRole)` in `src/calc/app/dashboardLayout.ts`.
- **User Customization**: Users can drag/reorder widgets or hide non-critical tiles; settings persist in `localStorage` under `dashboardPrefs` and sync to Firestore.
- **Engagement & Milestone Metrics**:
  - **Study Streak**: Tracks consecutive days of exam/flashcard practice.
  - **Training Milestones**: Visual progress bars toward GACA minimums (e.g. "Cross-Country: 38/50 hrs", "Night: 8/10 hrs").
  - **Achievement Stamps**: Visual badge stamps for aviation accomplishments (e.g. "First Solo", "Night Hawk", "Desert Navigator", "Century Club 100 hrs").

---

## 7. Architectural Synthesis & Implementation Blueprint

### 7.1 Cross-Cutting Module Map

```
src/
├── calc/
│   ├── isa.ts                 # Pressure/density altitude, ISA temp/dev
│   ├── altimetry.ts           # QNH/QFE conversions, true altitude
│   ├── tas.ts                 # True airspeed, Mach number, speed of sound
│   ├── crosswind.ts           # Runway crosswind & headwind resolution
│   ├── metar.ts               # METAR token parser & hazard classifier (Shamal, Haboob)
│   ├── taf.ts                 # TAF period decoder & forecast processor
│   ├── pilot/
│   │   ├── logbook.ts         # Full GACAR §61.51 logbook aggregation & CSV/PDF transforms
│   │   ├── currency.ts        # 90-day passenger & 6-month IFR currency evaluators
│   │   ├── achievements.ts    # Pilot milestone & badge evaluation
│   │   └── onboarding.ts      # Profile completeness calculator
│   └── app/
│       └── dashboardLayout.ts # Role-based widget layouts & quick actions
├── lib/
│   ├── prepCatalog.ts         # Exam packs, certificate bundles, study assets
│   ├── studyProgress.ts       # CBT exam scoring, question history, flashcard SRS
│   ├── aerodromes.ts          # Saudi airport catalog filtering & sorting
│   └── services/
│       ├── account.ts         # Account state, Profile, Flight & Record types
│       └── features.ts        # Pro feature gating (mock-exam, logbook export, presets)
├── pages/
│   ├── study/
│   │   ├── MockExam.tsx       # CBT simulator, jump matrix, fuel timer, certificate
│   │   ├── QuizRunner.tsx     # Practice quiz runner & immediate feedback mode
│   │   ├── Flashcards.tsx     # Spaced repetition flashcards with category filters
│   │   └── PackDetail.tsx     # Certificate study pack detail & syllabus
│   ├── account/
│   │   ├── Dashboard.tsx      # Persona-customized Bento grid
│   │   ├── Logbook.tsx        # Logbook editor, audit table & print PDF generator
│   │   └── Records.tsx        # Pilot records & GACA endorsements manager
│   └── tools/
│       ├── ToolsIndex.tsx     # Aviation calculator directory
│       ├── atmosphere-weather/# Weather, METAR/TAF, Density Altitude tools
│       └── performance/       # Crosswind, TAS, Runway performance tools
└── i18n/
    ├── en.json                # English terminology
    └── ar.json                # Standardized Saudi Arabic aviation terminology
```

### 7.2 Type Safety & Verification Checklist
1. **Zero TypeScript Errors**: `npm run typecheck` (`tsc -b --noEmit`) passes cleanly.
2. **Comprehensive Unit Tests**: Vitest suite in `tests/calc/` covering:
   - Density altitude calculations across extreme temperature ranges (-20°C to +55°C) and high altitudes (0 to 10,000 ft).
   - Logbook summaries, 90-day day/night currency evaluations, and CSV/PDF data parsing.
   - METAR hazard detection (Shamal dust storms, Haboobs, extreme temperature).
   - Dashboard role ordering and fallback handling.
   - Exam score grading, pass/fail thresholding, and question shuffling.
3. **Bilingual RTL Compatibility**: Full Arabization of aviation terminology aligned with Saudi GACA and ICAO standards.

---

*End of Technical Domain Analysis.*
