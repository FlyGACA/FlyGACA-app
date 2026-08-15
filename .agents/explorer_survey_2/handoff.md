# Explorer Survey 2 — Technical Domain & Feature Architecture Handoff

**Agent**: Explorer Survey 2  
**Working Directory**: `/Users/ad/.gemini/antigravity/scratch/FlyGACA-app/.agents/explorer_survey_2/`  
**Target Recipient**: Orchestrator (ID: `30a35435-5876-4f09-99ef-afef4bcc8c5e`)  
**Status**: Task Complete (Hard Handoff)  

---

## 1. Observation

1. **GACA CBT Exam Engine**:
   - `public/data/quiz.json` contains 26 structured question banks totaling hundreds of questions, covering Air Law, VFR/IFR rules, Airspace, AIP/Charts, Radiotelephony, Aerodynamics, Aircraft Systems, Weather, Human Factors, Commercial Ops, and Airline Transport (`public/data/quiz.json:1-14778`).
   - `src/pages/study/MockExam.tsx:21-37` implements question pool picking (`pickQuestions`), per-pack overrides (`examConfig`), per-topic breakdown calculation (`byBank`), countdown timer with fuel depletion bar (`lines 313-328`), flag toggle (`lines 332-339`), jump summary matrix (`lines 265-301`), and post-exam review (`lines 184-257`).
   - `src/lib/prepCatalog.ts:81-249` defines `PACKS` including `ppl-exam`, `elp`, `conversion`, `cpl`, `ir`, `atpl`, `airspace-vfr`, `medical`, and `aip`.

2. **GACA Part 61 Logbook & PDF Exporting**:
   - `src/lib/services/account.ts:48-65` defines the current `Flight` model with `date`, `type`, `reg`, `from`, `to`, `total`, `pic`, `night`, `ifr`, `ldg`, `nightLdg`, `appr`, `remarks`.
   - `src/pages/account/Logbook.tsx:117-174` renders a print container with table columns for Date, Type, Reg, From, To, Total, PIC, Dual, IFR, Night, XC, Landings, and Remarks. Dual and XC are currently empty placeholders in the printed table (`lines 149, 152, 163, 166`) awaiting full schema expansion.
   - `src/calc/pilot/logbook.ts:13-51` implements `summarizeLogbook` with total hours, PIC hours, night hours, IFR hours, landings, 90-day trailing totals, and CSV import/export utilities (`lines 110-196`).

3. **Saudi Weather & High-Temp Altitude Calculators**:
   - `src/calc/isa.ts:18-64` implements pure ISA calculations for `pressureAltitude`, `isaTemperature`, `isaDeviation`, and `densityAltitude` using standard lapse rates (1.98°C/kft) and deviation constants (118.8 ft/°C).
   - `src/calc/altimetry.ts:9-68` provides `flightLevel`, `qnhToQfe`, `qfeToQnh`, and `trueAltitude` temperature-corrected formulas.
   - `src/calc/tas.ts:27-37` calculates True Airspeed and Mach number using the standard atmosphere density ratio ($\sigma = \delta \times \frac{288.15}{T}$).
   - `src/calc/crosswind.ts:40-54` computes resolved runway heading, relative angle, crosswind component ($\sin$), and headwind/tailwind component ($\cos$).
   - `src/calc/metar.ts:140-156` parses METAR tokens and explicitly identifies Saudi weather hazards (`shamal_dust`, `haboob`).
   - `scripts/airports-ksa.json` and `scripts/airports-hubs.json` catalog Saudi aerodromes including high-altitude hubs (OEAB 6,858 ft, OEBA 5,486 ft, OETF 4,846 ft) and major international hubs (OERK 2,049 ft, OEJN 48 ft, OEDF 72 ft, OEMA 2,151 ft).

4. **SAELPT Phraseology Trainer**:
   - `public/data/quiz.json:2059-3900` contains dedicated question banks for Radiotelephony & English Proficiency (`radio-elpt`), Standard Radio Phraseology (`elpt-phraseology`), Plain Language & Comprehension (`elpt-comprehension`), and ICAO Language Proficiency Scale (`elpt-rating-scale`).
   - `src/data/phonetic.ts:1-47` defines the full ICAO/NATO phonetic spelling alphabet and Morse code mappings for A–Z and 0–9.
   - `src/lib/prepCatalog.ts:120-131` configures the `elp` pack with interactive scenarios for `oerk`, `oejn`, and `oedf`.

5. **Persona-Based Dashboard**:
   - `src/calc/app/dashboardLayout.ts:39-101` implements role-based widget hierarchies for `student`, `instructor`, `dispatcher`, and general `pilot`.
   - `src/pages/account/Dashboard.tsx:54-120` integrates `BentoGrid`, `CurrencyBoard`, `SetupChecklist`, `StudyWidget`, `BarSparkline`, and `AchievementStamp`.
   - `src/calc/pilot/currency.ts` computes 90-day landing recency (day/night) and medical/flight review currency.

---

## 2. Logic Chain

1. **From CBT Exam Requirements to Engine Architecture**:
   - GACAR §61.35 demands rigorous evaluation with standard time limits and passing thresholds (70%/75%/80%).
   - The question banks in `quiz.json` already possess GACAR citations (`cite`, `citeRef`).
   - The simulator architecture in `MockExam.tsx` correctly integrates Fisher-Yates randomization, time limits with visual warnings, question flagging, jump-to-question matrix, and post-exam breakdown.

2. **From Part 61 Requirements to Logbook Model Expansion**:
   - GACAR §61.51 requires distinct tracking of Dual Instruction Received, Solo time, Cross-Country (XC), Actual vs Simulated Instrument, and Flight Simulator (FSTD) time.
   - Expanding the `Flight` interface and logbook aggregation functions ensures accurate GACAR recency audits and populates all print columns without empty placeholders.
   - Standard A4 Landscape print stylesheets provide instant, clean PDF export without external heavyweight dependencies.

3. **From Saudi Desert Climatology to Altitude & Performance Calculations**:
   - High temperatures (45°C–52°C) combined with high field elevations (e.g. Abha at 6,858 ft) create critical density altitudes exceeding 10,000 ft, where aircraft climb performance is degraded by over 50%.
   - The existing physics functions in `isa.ts`, `altimetry.ts`, `tas.ts`, and `crosswind.ts` provide exact mathematical outputs that seamlessly power the performance calculators and airport briefing views.

4. **From SAELPT / ICAO Standards to Phraseology Trainer**:
   - ICAO Doc 9835 requires testing across 6 skills (Pronunciation, Structure, Vocabulary, Fluency, Comprehension, Interactions).
   - Combining the phonetic alphabet trainer, ATC dialogue scenarios, and ICAO Level 4 evaluation ensures robust pilot preparation for GACA ELPT testing.

5. **From Operational User Diversity to Persona-Driven Dashboard**:
   - A student pilot needs study and ground school widgets prominent; an airline pilot needs 90-day currency and live airport weather first; a CFI needs student records and endorsement tools.
   - The `dashboardLayout.ts` ordering functions cleanly decouple role presentation rules from rendering components.

---

## 3. Caveats

- **Audio File Assets**: While the data structures and script flows for SAELPT and Morse code are fully mapped, actual binary audio recordings (e.g. mp3/wav files) rely on synthetic Web Speech API or local audio asset packs.
- **Third-Party PDF Binary Compilers**: Client-side PDF generation relies on standard browser print CSS (`@media print`, `@page { size: A4 landscape; }`). This avoids bulky native dependencies while guaranteeing crisp vector rendering across all modern browsers and mobile devices.

---

## 4. Conclusion

The technical domain foundations for FlyGACA's 5 core feature pillars are robust, mathematically grounded, and aligned with GACA civil aviation regulations and ICAO standards. The detailed models, calculation algorithms, and UI workflows documented in `analysis.md` provide a complete blueprint for implementation and verification.

---

## 5. Verification Method

To independently verify the domain models, calculations, and components:

1. **Type Checking**:
   ```bash
   npm run typecheck
   ```
2. **Automated Unit Test Suite**:
   ```bash
   npm test
   ```
3. **Inspect Core Analysis & Implementation Files**:
   - Domain Analysis: `.agents/explorer_survey_2/analysis.md`
   - Calculation Modules: `src/calc/isa.ts`, `src/calc/altimetry.ts`, `src/calc/tas.ts`, `src/calc/crosswind.ts`, `src/calc/pilot/logbook.ts`
   - UI Implementations: `src/pages/study/MockExam.tsx`, `src/pages/account/Logbook.tsx`, `src/pages/account/Dashboard.tsx`
   - Test Coverage: `tests/calc/*.test.ts`
