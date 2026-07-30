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

- [x] `src/hooks/useForm.ts` (0%, 110 lines) — validate-on-blur/change, submit gating +
      focus-first-invalid, successful submit toggling `isSubmitting`, `resetForm`.
- [x] `src/hooks/useViewMode.ts`, `useDebouncedValue.ts`, `usePrefersReducedMotion.ts` (all 0%).
- [x] `src/lib/prefs/updatesPrefs.ts` (0%) — clone `library-prefs-store.test.ts`.
- [x] `RadarWidget.buildBlips()` in `src/components/bento/widgets/RadarWidget.tsx` (0%) — exported
      the pure helper and pinned its corpus→polar mapping.
- [x] Wire the coverage ratchet into CI: both the app and `functions` jobs now run
      `npm run test:coverage`, so the thresholds gate merges (previously they ran `npm run test`,
      making the ratchet local-only).
- [x] Raise the `vitest.config.ts` thresholds to just below the new live numbers
      (now 75/72/77/76, up from 72/70/73/72).

## Phase 3 — Widget / peripheral-chat render smoke  *(lower risk)*

- [x] Hub controls `ViewToggle` / `SortSelect` (both 0%) — `tests/hub-controls.test.tsx`.
- [x] Peripheral chat UI `SourcesDigest`, `CrossRefChips`, `ExportActions` (all 0%) —
      `tests/chat-digest.test.tsx`. Ratchet raised again to 76/73/79/77.
- [x] Bento widgets `StatValue` / `ToolsWidget` / `LearnWidget` (all 0%) —
      `tests/bento-widgets.test.tsx`.
- [x] Library `SelectionPopover` (0%) — `tests/selection-popover.test.tsx`.
- [x] `SpeakButton` (24%) — `tests/speak-button.test.tsx` with a `speechSynthesis` stub.

Final app coverage after Phases 1–3: **78.9 / 74.5 / 81.6 / 79.9** (from 72.2 / 70.6 / 74.2 / 72.8).
The ratchet sits at 76/73/79/77 with headroom.

## Phase 4 — Pages coverage

`src/pages/` (99 modules) is deliberately **outside** the coverage `include` in
`vitest.config.ts`; pages are exercised by the Playwright E2E suite (`e2e/`) plus a few targeted
page unit tests. Two complementary tracks:

**Done — widen the cheap render-smoke net** (guards against render-time crashes, no architectural
change):

- [x] `tests/tool-pages-smoke.test.tsx` — the ~45 self-contained CalcShell tool pages (pre-existing).
- [x] `tests/static-pages-smoke.test.tsx` — the static i18n-driven pages (`About`, `NotFound`,
      `Offline`, and the four legal docs). Same parameterized-loop pattern.

**Open — the structural decision (team call):** whether to fold `src/pages/**` into the coverage
`include`. Doing so would drop the headline number sharply (pages are ~40% of `src`, mostly E2E- not
unit-covered) and would pressure unit-testing of data/auth/router-param pages that E2E serves better.
Recommendation: **keep pages E2E-owned**, keep growing the smoke nets above for crash-safety, and
expand `e2e/flows.spec.ts` for the data/auth flows — rather than folding pages into the unit-coverage
ratchet.
