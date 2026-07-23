# Testing Roadmap

A phased plan for raising unit-test coverage where it protects the highest-risk code first.
Companion to `ROADMAP.md` (product) — this one tracks the **test suite**.

## Where we are

`npm run test:coverage` measures the unit-testable layers only (`src/calc`, `src/hooks`,
`src/lib`, `src/components` — pages and app chrome are excluded by `vitest.config.ts` and covered
by the Playwright E2E suite). The current baseline sits right on the ratchet floor:

| Metric | Coverage |
| --- | --- |
| Statements | ~72% |
| Branches | ~71% |
| Functions | ~74% |
| Lines | ~73% |

The aviation-math core (`src/calc/*`) and the `src/lib` root are well covered. The gaps cluster in
(1) the account/billing/entitlement **services**, (2) a handful of untested **hooks**, and (3) the
**bento/dashboard widgets**. Separately, the backend (`functions/`) has solid `*-core.ts` unit
tests but **no coverage gate**.

## Conventions for new tests

Reuse the existing patterns — don't invent new scaffolding:

- Render with `renderWithRouter` from `tests/helpers/render.tsx` (adds a `LocationProbe`).
- Global `tests/setup.ts` already boots i18next (en/ar), installs a `MockStorage`, clears the
  content cache, and stubs `scrollIntoView` — assert against real English strings.
- Mock Firebase callables with the `vi.hoisted` holder + `vi.mock('@/lib/services/firebase')` +
  `vi.mock('firebase/functions')` idiom — see `tests/org-client.test.ts`.
- Mock Firestore with `vi.mock('firebase/firestore')` recording into a holder — see
  `tests/sync-io.test.ts`.
- Hooks: `renderHook` + `waitFor` + `act` — see `tests/fetch-hooks.test.tsx`,
  `tests/pwa-hooks.test.ts`.
- Widgets: seed `localStorage`, then **dynamic** `await import(...)` — see
  `tests/dashboard-widgets.test.tsx`.
- `useSyncExternalStore` stores: see `tests/library-prefs-store.test.ts`.

## Phase 1 — Account / billing / entitlement services + backend gate  *(highest risk)*

This is the code that gates money and access. `CLAUDE.md` requires the client mirrors to match the
server core.

- [ ] `tests/staff.test.ts` — `src/lib/services/staff.ts`: pure `looksLikeStaff()` matching + all
      `claimStaffAccessIfEligible` no-op/happy paths (callable `claimStaffAccess`).
- [ ] `tests/school.test.ts` — `src/lib/services/school.ts` (0%): `claimSchoolSeatIfEligible`
      (callable `claimSchoolSeat`).
- [ ] `tests/waitlist.test.ts` — `src/lib/services/waitlist.ts` (0%): `addDoc` payload shape +
      the `'unavailable'` throw when the db is null.
- [ ] `tests/study-progress-sync.test.ts` — `src/lib/services/studyProgressSync.ts` (16%):
      local-first no-op paths + the initial upload payload/path.
- [ ] Broaden existing suites to lift the uncovered branches in `services/account.ts` (~66%),
      `services/billing.ts` (~62%), `services/auth.ts` (~72%).
- [ ] Backend coverage gate: add `@vitest/coverage-v8` + a ratchet threshold to
      `functions/vitest.config.ts` and a `test:coverage` script, so the `functions` CI job can't
      silently regress.

## Phase 2 — Untested hooks + pure widget helpers  *(cheap wins → raise the ratchet)*

- [ ] `src/hooks/useForm.ts` (0%, 110 lines) — validate-on-blur/change, submit gating +
      focus-first-invalid, successful submit toggling `isSubmitting`, `resetForm`.
- [ ] `src/hooks/useViewMode.ts`, `useDebouncedValue.ts`, `usePrefersReducedMotion.ts` (all 0%).
- [ ] `src/lib/prefs/updatesPrefs.ts` (0%) — clone `library-prefs-store.test.ts`.
- [ ] `RadarWidget.buildBlips()` in `src/components/bento/widgets/RadarWidget.tsx` (0%) — export
      the pure helper and pin its corpus→polar mapping.
- [ ] Raise the `vitest.config.ts` thresholds to just below the new live numbers.

## Phase 3 — Widget / peripheral-chat render smoke  *(lower risk)*

- [ ] 0% bento widgets on Home/Dashboard (`LearnWidget`, `ToolsWidget`, `StatValue`, hub
      `ViewToggle`/`SortSelect`, library `SectionPopover`) via the seed-then-import pattern.
- [ ] Peripheral chat UI: `SpeakButton` (24%), `SourcesDigest`, `CrossRefChips`, `AlertActions`.

## Phase 4 — Structural decision  *(team call, no code yet)*

`src/pages/` (99 modules) is entirely outside coverage measurement. Decide between:

- Widening the `tests/tool-pages-smoke.test.tsx` parameterized loop to more self-contained pages, or
- Formally declaring pages E2E-owned and expanding the Playwright `e2e/flows.spec.ts` set.
