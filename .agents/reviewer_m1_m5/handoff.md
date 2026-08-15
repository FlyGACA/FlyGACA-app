# Reviewer & Adversarial Critic Report: Milestones M1, M2, M3

## 1. Observation

### Milestone M1: GACA CBT Exam Simulation
- **File**: `src/pages/study/MockExam.tsx`
  - Lines 21–23: `examConfig(data, pack)` overlays pack-specific questions, minutes, and passMark onto global defaults (`passMark: 75`, `questions: 25`, `minutes: 30`).
  - Lines 29–36: `pickQuestions` filters by `pack.bankIds` when in pack mode and draws the exact target question count randomly.
  - Lines 160, 334–339: Bookmarking / flagging (`flags` state array with interactive toggle).
  - Lines 161, 308–328: Depleting fuel-gauge countdown bar (`fuelTrack`, `fuelLevel`) with visual danger warning thresholds (<= 60s `timerDanger`, <= 300s `timerWarn`).
  - Lines 264–301: Pre-submission answer summary grid (`summaryGrid`, `summaryCell`, `summaryDone`, `summaryFlag`) enabling immediate navigation to any question.
  - Lines 204–255: Post-exam breakdown with PASS/FAIL stamp (`stampPass`/`stampFail`), percentage score, by-topic score distribution (`byBank`), and full question review.
  - Lines 234–254: Post-exam question review displays question text and option comparison (`reviewA`, `reviewYours`), but omits `item.explain`, `item.cite`, and `item.citeRef` links to GACAR texts.
- **Dataset**: `public/data/quiz.json` contains 14,778 lines of authentic, GACAR-cited question banks (e.g. `vfr-flight-rules`, `airspace`, `air-law`, `pilot-licensing`, `medical`).

### Milestone M2: GACA Part 61 Logbook & PDF Export
- **File**: `src/pages/account/Logbook.tsx` & `src/calc/pilot/logbook.ts`
  - Lines 26–51 (`src/calc/pilot/logbook.ts`): `summarizeLogbook` calculates lifetime totals and rolling 90-day totals (`hours`, `landings`, `nightLandings`, `flightCount`).
  - Lines 117–174 (`src/pages/account/Logbook.tsx`): Printable A4 landscape PDF view triggered via `?print=1` with full table columns: Date, Type, Reg, From, To, Total, PIC, Dual, IFR, Night, XC, Landings, Remarks, and summary totals row.
  - Lines 94–115 (`src/pages/account/Logbook.tsx`): JSON export (`flygaca-logbook.json`), RFC 4180 CSV export (`flygaca-logbook.csv`), and CSV file importer.
  - Lines 151–195 (`src/calc/pilot/logbook.ts`): `csvToFlights` naive line splitting:
    ```typescript
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    ```
    When a flight remarks field contains an embedded newline (`\n`), standard RFC 4180 wraps it in quotes (`"Line 1\nLine 2"`). `csvToFlights` splits this field across rows, corrupting flight count and record integrity.

### Milestone M3: Saudi Weather & High-Temp Calculators
- **File**: `src/calc/isa.ts` & `src/calc/altimetry.ts`
  - Lines 18–27 (`src/calc/isa.ts`): `pressureAltitude(elevFt, qnh, unit)` with standard 27.3 ft/hPa lapse rate.
  - Lines 29–38 (`src/calc/isa.ts`): `isaTemperature` with standard 1.98°C/1000 ft lapse and `isaDeviation`.
  - Lines 52–63 (`src/calc/isa.ts`): `densityAltitude` using standard 118.8 ft/°C deviation.
  - Lines 48–68 (`src/calc/altimetry.ts`): `trueAltitude` applying 4 ft/1,000 ft/°C ISA deviation temperature error correction.
- **File**: `src/pages/tools/atmosphere-weather/DensityAltitude.tsx`
  - Lines 85–94: Active warning alerts for extreme desert heat (`oat > 45°C`) and high-elevation aerodromes (`elevation >= 4,000 ft`).
- **File**: `src/calc/metar.ts`
  - Lines 144–153: Regional METAR hazard parser extracting blowing sand/dust phenomena (`DS|SS|SA|DU|BLDU|BLSA|PO` -> `shamal_dust`) and severe visibility impairment (`visibility < 1500m` with dust -> `haboob`).

### Test Execution Observations
1. Standard Unit Test Command:
   `npm test -- tests/calc/isa.test.ts tests/calc/logbook.test.ts tests/calc/altimetry.test.ts`
   **Result**: 3 passed, 31 tests passed in 12.10s.
2. Adversarial Edge Cases Test Suite:
   `npm test -- tests/calc/adversarial-edge-cases.test.ts`
   **Result**: 1 failed | 22 passed (23 tests total).
   **Failure Output**:
   ```
   FAIL tests/calc/adversarial-edge-cases.test.ts > Adversarial Challenge 3: Logbook 90-Day Currency, Leap Years & Boundaries > RFC 4180 CSV serialization and parsing round-trip with tricky characters
   AssertionError: expected 3 to be 2 // Object.is equality
   - Expected: 2
   + Received: 3
     ❯ tests/calc/adversarial-edge-cases.test.ts:257:35
   ```

---

## 2. Logic Chain

1. **Integrity & Authenticity Check**:
   - Source code was inspected across `src/calc/isa.ts`, `src/calc/altimetry.ts`, `src/calc/pilot/logbook.ts`, `src/calc/metar.ts`, and `src/pages/study/MockExam.tsx`.
   - Verified that calculations use real mathematical formulas and authentic data schemas. No hardcoded test responses, dummy facade implementations, or simulated outputs exist.
2. **Milestone M1 (GACA CBT Exam Simulation)**:
   - `MockExam.tsx` implements full timed exam mechanics, fuel gauge countdown, bookmarking, pre-submission jump grid, and topic score breakdown.
   - However, `PROJECT.md` Feature #2 specifies: "question-by-question review with GACAR citation links". In `MockExam.tsx` (lines 234–254), questions, user picks, and correct options are rendered, but `item.explain` and `item.cite`/`item.citeRef` are not rendered in the post-exam list.
3. **Milestone M2 (GACA Part 61 Logbook & PDF Export)**:
   - The Part 61 flight log schema, 90-day currency tracking, JSON export, and print PDF view (`?print=1`) meet the design specifications.
   - However, an adversarial stress test revealed that `csvToFlights` in `src/calc/pilot/logbook.ts` splits CSV input by raw newline (`\n`) prior to character-level quote tokenization. If a pilot imports a CSV containing multiline remarks, a single flight is split into multiple malformed flight entries.
4. **Milestone M3 (Saudi Weather & High-Temp Calculators)**:
   - Standard atmosphere lapse rates, extreme heat calculations (+50°C, +55°C), high-elevation fields (Abha OEAB @ 6,858 ft), altimetry conversions, and desert hazard detection (`shamal_dust`, `haboob`) execute flawlessly with full type safety and zero `NaN`/`Infinity` leakage.

---

## 3. Caveats

- End-to-end browser rendering tests via Playwright require running against a live preview server; review here verified DOM structure, component props, and pure algorithmic engines.
- Large parallel Vitest runs (`npm test`) on this test runner environment hit thread worker startup timeouts when run unconstrained; running targeted test files (`vitest run tests/...`) executes cleanly.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

### Findings Summary:

#### [Major] Finding 1: Multiline CSV Import Parser Malfunction in Logbook Engine
- **What**: `csvToFlights` naively splits the raw CSV text using `.split('\n')`, which breaks RFC 4180 records containing quoted multiline strings (e.g. flight remarks with newlines).
- **Where**: `src/calc/pilot/logbook.ts`, line 152.
- **Why**: When a pilot imports a logbook CSV with multiline remarks, records are split across rows, generating ghost flight entries with NaN/corrupted values.
- **Suggestion**: Update `csvToFlights` to parse records by tokenizing characters/quotes across lines, or accumulate lines while `quoted` is true before emitting a record.

#### [Minor] Finding 2: Omission of GACAR Citations in CBT Mock Exam Review
- **What**: In `MockExam.tsx`, the post-exam question review list does not render the GACAR regulatory citation or explanation (`item.explain`, `item.cite`, `item.citeRef`), which are available in `public/data/quiz.json`.
- **Where**: `src/pages/study/MockExam.tsx`, lines 234–254.
- **Why**: Feature #2 in `PROJECT.md` specifies "question-by-question review with GACAR citation links". Rendering citations provides essential study feedback for failed or reviewed questions.
- **Suggestion**: Render `item.explain` and `item.cite` (with link/badge) within each `reviewItem` in `MockExam.tsx`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Unit Tests for M1, M2, M3**:
   ```bash
   npx vitest run tests/calc/isa.test.ts tests/calc/logbook.test.ts tests/calc/altimetry.test.ts
   ```
   *Expected: 3 passed, 31 tests passed.*

2. **Verify Adversarial CSV Multiline Failure**:
   ```bash
   npx vitest run tests/calc/adversarial-edge-cases.test.ts
   ```
   *Expected: Reproduces `AssertionError: expected 3 to be 2` on RFC 4180 multiline CSV test.*

3. **Inspect Post-Exam Review in `MockExam.tsx`**:
   View lines 234–254 of `src/pages/study/MockExam.tsx` to confirm lack of `item.explain` / `item.cite` in `reviewList`.
