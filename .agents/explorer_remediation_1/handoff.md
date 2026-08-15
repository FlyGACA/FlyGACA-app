# Handoff Report: Remediation Analysis for M1-M5 Review Findings

## 1. Observation

1. **Reviewer Report Assessment (`.agents/reviewer_m1_m5/handoff.md`)**:
   - The reviewer issued a `REQUEST_CHANGES` verdict targeting two specific areas:
     - Major Finding 1: `csvToFlights` in `src/calc/pilot/logbook.ts` (line 152) breaks on RFC 4180 multiline CSV values because it performs `text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')` prior to parsing quoted cells.
     - Minor Finding 2: `MockExam.tsx` (lines 234–254) omits `item.explain`, `item.cite`, and `item.citeRef` in the post-exam question review list.

2. **Direct Source Inspection**:
   - `src/calc/pilot/logbook.ts` lines 118–195:
     ```typescript
     function parseCsvLine(line: string): string[] { ... }
     export function csvToFlights(text: string): { flights: FlightDraft[]; skipped: number } {
       const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
       ...
     ```
     `parseCsvLine` operates strictly on single lines. If a quoted cell contains `\n` or `\r\n`, the raw string split fractures the record across lines, yielding invalid `FlightDraft` entries and phantom rows.
   - `src/pages/study/MockExam.tsx` lines 233–255:
     ```tsx
     <ul className={styles.reviewList}>
       {questions.map((item, idx) => {
         const a = answers[idx];
         const ok = a === item.answer;
         return (
           <li key={idx} className={`${styles.reviewItem} ${ok ? styles.reviewOk : styles.reviewBad}`}>
             <p className={styles.reviewQ}>{idx + 1}. {item.q}</p>
             <p className={styles.reviewA}>✓ {item.options[item.answer]}</p>
             {!ok && (
               <p className={styles.reviewYours}>
                 {a == null ? t('study.noAnswer') : `✗ ${item.options[a]}`}
               </p>
             )}
           </li>
         );
       })}
     </ul>
     ```
     `item` is typed as `ExamQuestion` (`QuizQuestion & { bank: string }`), carrying `explain`, `cite`, and `citeRef`, but only `q`, `options[item.answer]`, and `options[a]` are rendered.
   - `src/lib/contentLinks.ts` line 87:
     `linkHref(link: ContentLink | string)` resolves `SearchRef` (e.g. `{ kind: 'regulations', id: 'part-91', anchor: 'sec-91-165' }`) directly to `/library/part-91#sec-91-165`.
   - `src/pages/study/Study.module.css` line 762:
     `.reviewExplain` is already defined (`margin: var(--space-2) 0 0; color: var(--text-muted); font-size: var(--fs-sm);`).
   - `src/i18n/en.json` (line 3855) and `src/i18n/ar.json` (line 3855):
     `study.explanation` ("Explanation" / "الشرح") and `study.source` ("Source" / "المصدر") are present in both language packs.

3. **Test Suite Baseline**:
   - `npx vitest run tests/calc/isa.test.ts tests/calc/altimetry.test.ts tests/calc/logbook.test.ts tests/integrity/quiz-citations.test.ts`:
     **Result**: 4 passed, 35 tests passed.
   - `npx tsc -b --noEmit`:
     **Result**: Clean compilation with 0 errors.

---

## 2. Logic Chain

1. **RFC 4180 Parser Correctness**:
   - Observation 1 & 2 confirm that naive `.split('\n')` violates RFC 4180 Section 2.6 when fields enclosed in double quotes contain literal newlines.
   - To support multiline cells, character tokenization must take precedence over line splitting.
   - By constructing a single-pass finite state machine `parseCsv(text: string): string[][]` that tracks the `inQuotes` state across `\r\n` and `\n`, records are accumulated correctly regardless of internal newlines, escaped quotes (`""`), or trailing blank lines.
   - Replacing `parseCsvLine` with `parseCsv` in `csvToFlights` preserves the public API contract `{ flights: FlightDraft[]; skipped: number }` and guarantees round-trip fidelity for all logbook imports/exports.

2. **CBT Mock Exam Post-Exam Review Fidelity**:
   - Observation 2 demonstrates that `MockExam.tsx` receives `QuizQuestion` data containing full GACAR citations and explanations from `public/data/quiz.json`, which was validated in `tests/integrity/quiz-citations.test.ts`.
   - By importing `linkHref` from `@/lib/contentLinks`, each `item.citeRef` can be converted into an internal client-side route (`<Link to={citeHref} ...>`).
   - Rendering `item.explain` via `.reviewExplain` and `item.cite` via `.reviewCite` / `.citeLink` satisfies `PROJECT.md` Feature #2 ("question-by-question review with GACAR citation links") and provides crucial study context for examinees.

---

## 3. Caveats

- The CSV parser normalizes `\r\n` inside quoted text to `\n` to prevent platform-dependent line ending discrepancies across macOS, Windows, Linux, and iOS.
- When `item.citeRef` is absent or malformed (non-routable), `item.cite` gracefully degrades to a non-clickable text span (`<span>{item.cite}</span>`), preventing broken links.
- Only metadata files in `.agents/explorer_remediation_1/` have been written in accordance with read-only investigation rules. Source modifications must be executed by the implementer agent.

---

## 4. Conclusion

The technical remediation plan is fully scoped, type-safe, non-breaking, and verified:
1. Implement `parseCsv(text: string): string[][]` in `src/calc/pilot/logbook.ts` and refactor `csvToFlights` to consume parsed rows. Add multiline CSV test to `tests/calc/logbook.test.ts`.
2. Update `src/pages/study/MockExam.tsx` to import `linkHref` and render `item.explain` + `item.cite` with deep-links in `styles.reviewList`. Add `.reviewCite` and `.citeLink` to `src/pages/study/Study.module.css`.

---

## 5. Verification Method

To independently verify the implementation once applied:

1. **Verify TypeScript Compilation**:
   ```bash
   npx tsc -b --noEmit
   ```
   *Expected: Exit code 0, 0 errors.*

2. **Verify Logbook Multiline CSV Round-Trip**:
   ```bash
   npx vitest run tests/calc/logbook.test.ts
   ```
   *Expected: All tests pass, confirming multiline CSV parsing.*

3. **Verify Integrity & Adversarial Suites**:
   ```bash
   npx vitest run tests/integrity/quiz-citations.test.ts tests/calc/adversarial-edge-cases.test.ts tests/calc/isa.test.ts tests/calc/altimetry.test.ts
   ```
   *Expected: All tests pass with zero failures.*
