# Technical Remediation Analysis: CSV Multiline Parser & CBT Mock Exam Review Enhancements

**Agent**: Explorer Remediation 1  
**Date**: 2026-08-14  
**Workspace Root**: `/Users/ad/.gemini/antigravity/scratch/FlyGACA-app`  
**Target Files**:
1. `src/calc/pilot/logbook.ts` (and `tests/calc/logbook.test.ts`)
2. `src/pages/study/MockExam.tsx` (and `src/pages/study/Study.module.css`)

---

## 1. Executive Summary

Reviewer 1 issued a `REQUEST_CHANGES` verdict identifying two specific deficiencies:
1. **[Major] RFC 4180 Multiline CSV Parser Malfunction (`src/calc/pilot/logbook.ts`)**:
   `csvToFlights` naively splits the raw CSV string on `\n` or `\r\n` before parsing cell quotes. When a pilot logs flight remarks containing literal newlines (e.g. multiline notes wrapped in quotes per RFC 4180), each line is parsed as a distinct row. This creates corrupted "ghost" flight entries and loses remarks integrity.
2. **[Minor] Missing GACAR Regulatory Citations and Explanations in CBT Mock Exam Review (`src/pages/study/MockExam.tsx`)**:
   In `MockExam.tsx`, the post-exam question review list (`styles.reviewList`) displays the question prompt, user selection, and correct answer, but omits the rich `item.explain` (detailed rationale) and `item.cite` / `item.citeRef` (GACAR regulation deep-links) already authored across all 14,778 lines of `public/data/quiz.json`.

This report delivers complete root-cause analyses, mathematical/algorithmic specifications, and drop-in code recommendations for the implementer agent.

---

## 2. Deep Dive: Issue 1 — RFC 4180 Multiline CSV Parser (`src/calc/pilot/logbook.ts`)

### 2.1 Problem Observation & Root Cause
In `src/calc/pilot/logbook.ts`:
```typescript
export function csvToFlights(text: string): { flights: FlightDraft[]; skipped: number } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  ...
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r]);
    ...
```

Per RFC 4180 Section 2.6:
> "Fields containing line breaks (CRLF), double quotes, and commas should be enclosed in double-quotes."

When `flightsToCsv` serializes a flight record with multiline remarks:
```csv
date,type,reg,from,to,total,pic,night,ifr,ldg,nightLdg,appr,remarks
2024-05-20,C172,HZ-ABC,OERK,OEDF,2.5,2.5,0,0,1,0,,"Preflight complete.
Turbulence reported near Al-Kharj.
Safe landing RWY 33L."
```

The naive line split decomposes the document into 4 lines:
- Line 0: Header
- Line 1: `2024-05-20,C172,HZ-ABC,OERK,OEDF,2.5,2.5,0,0,1,0,,"Preflight complete.`
- Line 2: `Turbulence reported near Al-Kharj.`
- Line 3: `Safe landing RWY 33L."`

When Line 2 is passed to `parseCsvLine`, `cells[0]` is `'Turbulence reported near Al-Kharj.'`, which maps to the `date` column. Since `draft.date` is non-empty, Line 2 is parsed as a new flight entry with zero hours and a corrupted date, while the original flight remarks are truncated to `'Preflight complete.'`.

### 2.2 Algorithmic State-Machine Solution
A proper RFC 4180 CSV parser cannot split lines before tokenization. It must process the raw character stream through a finite state machine that tracks `inQuotes` state across newlines:

1. **State `inQuotes = true`**:
   - `""` (double double-quote): append literal `"` to `currentCell`, advance index `i++`.
   - `\r\n` or `\r` or `\n`: append literal `\n` to `currentCell` (normalizing newline characters).
   - `"` (single quote): transition `inQuotes = false`.
   - Any other character: append to `currentCell`.
2. **State `inQuotes = false`**:
   - `"`: transition `inQuotes = true`.
   - `,`: push `currentCell` to `currentRow`, reset `currentCell = ''`.
   - `\r\n` or `\n` or `\r`: push `currentCell` to `currentRow`, push `currentRow` to `rows`, reset `currentRow = []`, `currentCell = ''`.
   - Any other character: append to `currentCell`.
3. **End of Stream**:
   - If `currentCell` or `currentRow` contains data, push remaining `currentCell` to `currentRow`, and `currentRow` to `rows`.

### 2.3 Exact Proposed Implementation in `src/calc/pilot/logbook.ts`

```typescript
/**
 * Parse an entire RFC 4180 CSV document into a 2D array of rows and cells.
 * Correctly supports:
 * - Multiline quoted fields containing \r\n or \n
 * - Escaped quotes ("" -> ")
 * - Commas inside quoted fields
 * - Universal record breaks (\r\n, \n, \r)
 * - Leading UTF-8 Byte Order Mark (\uFEFF)
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip the second escaped quote
        } else {
          inQuotes = false;
        }
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentCell += '\n';
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export function csvToFlights(text: string): { flights: FlightDraft[]; skipped: number } {
  const rows = parseCsv(text);

  // Drop trailing empty rows
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop();
  }
  if (rows.length < 2) return { flights: [], skipped: 0 };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colAt = new Map<keyof Flight, number>();
  for (const field of CSV_FIELDS) {
    const idx = header.indexOf(field.toLowerCase());
    if (idx >= 0) colAt.set(field, idx);
  }

  const flights: FlightDraft[] = [];
  let skipped = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 0 || (cells.length === 1 && cells[0].trim() === '')) {
      continue;
    }
    const get = (k: keyof Flight): string => {
      const at = colAt.get(k);
      return at != null ? (cells[at] ?? '').trim() : '';
    };
    const draft: FlightDraft = {
      date: get('date'),
      type: get('type'),
      reg: get('reg'),
      from: get('from'),
      to: get('to'),
      total: get('total'),
      pic: get('pic'),
      night: get('night'),
      ifr: get('ifr'),
      ldg: get('ldg'),
      nightLdg: get('nightLdg'),
      appr: get('appr'),
      remarks: get('remarks'),
    };
    // A usable row needs at least a date or some logged time/landings.
    if (!draft.date && num(draft.total) === 0 && num(draft.ldg) === 0) {
      skipped++;
      continue;
    }
    flights.push(draft);
  }
  return { flights, skipped };
}
```

---

## 3. Deep Dive: Issue 2 — GACAR Citations & Explanations in CBT Mock Exam (`src/pages/study/MockExam.tsx`)

### 3.1 Problem Observation & Data Context
In `public/data/quiz.json`, every question schema adheres to:
```json
{
  "q": "What is the minimum flight visibility for VFR flight in Class D airspace?",
  "options": ["3 km", "5 km", "8 km", "1,500 m"],
  "answer": 1,
  "explain": "GACAR §91.165 sets 5 km flight visibility for VFR in Classes B, C, D and E below 10,000 ft MSL.",
  "cite": "GACAR Part 91, §91.165",
  "citeRef": {
    "kind": "regulations",
    "id": "part-91",
    "anchor": "sec-91-165"
  }
}
```

In `src/pages/study/MockExam.tsx` (lines 234–254), when the user finishes the exam (`done === true`), the question review block only renders:
```tsx
<li key={idx} className={`${styles.reviewItem} ${ok ? styles.reviewOk : styles.reviewBad}`}>
  <p className={styles.reviewQ}>{idx + 1}. {item.q}</p>
  <p className={styles.reviewA}>✓ {item.options[item.answer]}</p>
  {!ok && (
    <p className={styles.reviewYours}>
      {a == null ? t('study.noAnswer') : `✗ ${item.options[a]}`}
    </p>
  )}
</li>
```
This leaves out `item.explain`, `item.cite`, and the link generated from `item.citeRef`.

### 3.2 Routing & Deep-Linking Design
The codebase provides `linkHref(link: ContentLink | string)` in `src/lib/contentLinks.ts` which maps `{ kind: 'regulations', id: 'part-91', anchor: 'sec-91-165' }` to `/library/part-91#sec-91-165`.

By importing `linkHref` into `MockExam.tsx`, we can compute:
```typescript
const citeHref = item.citeRef ? linkHref(item.citeRef) : null;
```
If `citeHref` is non-null, `item.cite` renders as a styled `<Link to={citeHref} className={styles.citeLink}>{item.cite} ↗</Link>`, which navigates directly into the GACAR Library reader at the exact cited section. If `citeRef` is absent, it cleanly falls back to plain text `<span>{item.cite}</span>`.

### 3.3 Proposed Implementation in `src/pages/study/MockExam.tsx`

1. **Imports Update**:
```typescript
import { linkHref } from '@/lib/contentLinks';
```

2. **Component Review Item Update**:
```tsx
        <div className={styles.review}>
          <h2 className={styles.reviewHead}>{t('study.reviewAnswers')}</h2>
          <ul className={styles.reviewList}>
            {questions.map((item, idx) => {
              const a = answers[idx];
              const ok = a === item.answer;
              const citeHref = item.citeRef ? linkHref(item.citeRef) : null;
              return (
                <li
                  key={idx}
                  className={`${styles.reviewItem} ${ok ? styles.reviewOk : styles.reviewBad}`}
                >
                  <p className={styles.reviewQ}>
                    {idx + 1}. {item.q}
                  </p>
                  <p className={styles.reviewA}>✓ {item.options[item.answer]}</p>
                  {!ok && (
                    <p className={styles.reviewYours}>
                      {a == null ? t('study.noAnswer') : `✗ ${item.options[a]}`}
                    </p>
                  )}
                  {item.explain && (
                    <p className={styles.reviewExplain}>
                      <strong>{t('study.explanation')}:</strong> {item.explain}
                    </p>
                  )}
                  {item.cite && (
                    <p className={styles.reviewCite}>
                      <strong>{t('study.source')}:</strong>{' '}
                      {citeHref ? (
                        <Link to={citeHref} className={styles.citeLink}>
                          {item.cite} ↗
                        </Link>
                      ) : (
                        <span>{item.cite}</span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
```

3. **CSS Additions in `src/pages/study/Study.module.css`**:
```css
.reviewCite {
  margin: var(--space-1) 0 0;
  color: var(--text-dim);
  font-size: var(--fs-xs);
}

.citeLink {
  color: var(--brand-bright, var(--brand));
  text-decoration: underline;
  text-underline-offset: 2px;
  font-weight: var(--fw-semibold);
  transition: var(--transition-interactive);
}

.citeLink:hover {
  color: var(--brand-hover);
}
```

---

## 4. Verification & Non-Regression Matrix

| Verification Vector | Target Files | Expected Result |
|---------------------|--------------|-----------------|
| Static Type Checker | `npx tsc -b --noEmit` | 0 errors |
| Logbook Unit Tests | `npx vitest run tests/calc/logbook.test.ts` | 100% passing including multiline CSV test |
| Quiz Citations Integrity | `npx vitest run tests/integrity/quiz-citations.test.ts` | 100% passing |
| Adversarial Edge Cases | `npx vitest run tests/calc/adversarial-edge-cases.test.ts` | 100% passing |
| ISA & Altimetry Tests | `npx vitest run tests/calc/isa.test.ts tests/calc/altimetry.test.ts` | 100% passing |
