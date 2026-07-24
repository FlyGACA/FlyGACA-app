# Test coverage analysis — July 2026

A snapshot of where the automated tests stand today and where the gaps carry the
most risk. Numbers come from `npm run test:coverage` (frontend, v8) and
`npx vitest run --coverage --coverage.all` inside `functions/` (backend, v8).
This is an assessment + proposal, not a change to the suites themselves.

## Headline numbers

| Suite | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/calc` + `src/lib` + `src/components`) | 67.9% | 69.1% | 69.9% | 68.1% |
| Backend (`functions/src`, all files) | 35.3% | 46.0% | 45.7% | 34.4% |

The frontend numbers are healthy and gated by a ratchet in `vitest.config.ts`
(statements 65 / branches 64 / functions 68 / lines 65). The backend number
looks alarming but is **mostly by design**: the backend deliberately splits pure
logic into `*-core.ts` files, which are exhaustively tested (105 passing tests),
and leaves the thin I/O "wiring" files uncovered. The real question is whether
that untested wiring is genuinely trivial — in a few security-critical cases it
is not.

Test-file counts today: **130** frontend unit specs, **14** backend specs,
**1** Firestore-rules suite (`npm run test:rules`), **3** Playwright E2E specs
(`e2e/`).

## What is already well covered (don't regress)

- **`src/calc/**` — 97% statements.** The pure aviation math (METAR/TAF/NOTAM
  parsing, crosswind, altimetry, weight & balance, TAS/ISA, holding, sun times,
  logbook, currency) is the crown jewel of the suite. Every tool has a spec.
- **Backend `*-core.ts` files — effectively 100%.** `billing-core`,
  `chat-quota-core`, `rate-limit-core`, `referral-core`, `feedback-core`,
  `api-key-core`, `staff-core`, `student-core`, `school-core` all have dedicated
  specs. This is the right pattern.
- **Typed frontend services** `api.ts` (97%), `billing.ts` (91%), `content.ts`
  (96%), `jsonld.ts`/`seo.ts` (100%), and the prefs stores (`libraryPrefs`,
  `guidePrefs`, `toolPrefs`, `studyProgress`) are all in the 90s.
- **i18n parity** is enforced structurally (`tests/i18n-parity.test.ts`).

## Proposed areas to improve, in priority order

### 1. Backend gateway request handlers — highest risk (`functions/src/gateway.ts`, 24.9%) — ✅ addressed

> **Update:** `functions/tests/gateway-routes.test.ts` now drives the real Express
> `app` over an in-process HTTP server (firebase-admin + the RAG flow mocked,
> with a small in-memory Firestore) and asserts the enforcement paths: anonymous
> 401, blank-message 400, paid-user quota bypass, free-question consumption,
> credit spend after the daily allowance, `quota_exceeded` 429, disallowed-Origin
> 403 + preflight/suffix allow, the `/v1/ask` API-key surface (401 / invalid-key
> 401 / metered 200), and feedback 204/400. `gateway.ts` moved 24.9% → 74%; the
> remaining gap is the SSE streaming branch (lower risk). §2, §4, §5 remain open.

This is the single most important gap. `gateway.ts` is the Express entry point:
auth, App Check enforcement, CORS origin allow-listing, free-quota consumption,
paid-credit metering, and the `/chat`, `/v1/ask`, `/feedback` routes. Today the
tests cover only the *pure exported helpers* — `parseRequest`, `authenticate`,
`notFoundHandler`, `errorHandler` — and leave the **route handlers themselves
untested** (lines ~261–457). That means the actual enforcement paths have no
regression net:

- `consumeFreeQuota` / `consumeCredit` — the metering that decides whether a
  request is free, paid from credit, or rejected. A bug here is either lost
  revenue or a free-tier bypass.
- `readEntitlement` gating of the Pro/streaming path.
- `isAllowedOrigin` CORS enforcement (a regression here is a security issue).
- The `/v1/ask` API-key surface: key extraction, hash lookup, per-key rate limit.

**Proposal:** add a `gateway-routes` spec using `supertest` (or Express's request
mock) against the exported `app`, with `firebase-admin` and the Genkit flow
mocked. Assert: anonymous vs. authed quota outcomes, 429 on rate-limit, 401 on
missing API key, 403 on a disallowed origin, and that a free user never reaches
the Pro path. This is the highest value-per-test work available.

### 2. Backend Stripe & RAG wiring (`billing.ts` 0%, `captain-adel.ts` 0%, `corpus.ts` 44%) — ✅ the two priorities addressed

> **Update:** `functions/tests/billing-webhook.test.ts` and
> `functions/tests/corpus-citations.test.ts` cover the money path and the
> citation path. `billing.ts` moved 0% → 59% — the `stripeWebhook` handler is now
> tested end-to-end (signature 400, at-least-once idempotency, subscription /
> pass / credits / referral routing, and the roll-back-and-500 on a handler
> error) with Stripe + an in-memory Firestore mocked; the remaining gap is the
> checkout/portal callables. `corpus.ts` moved 44% → 89% — `searchHref`,
> `toChatSource` (lineage-aware citation assembly), and BM25 `retrieve` via the
> `__setIndexForTest` hook. **This completes the plan (§1–§5).**
>
> **Follow-up:** `functions/tests/captain-adel-flow.test.ts` now also covers
> `captain-adel.ts` (0% → 100% lines) — the server-side grounding logic that the
> analysis had left open: the deterministic refusal that never calls the model on
> a low-confidence retrieval, the grounded/partial verdict thresholds, history
> mapping, and flash/pro model selection, with Genkit/Gemini mocked.

- **`billing.ts` (0%)** is the Stripe webhook handler — per `CLAUDE.md` the
  *only writer* of `users/{uid}.entitlement`. The pure decision logic lives in
  `billing-core.ts` and is tested, but the webhook plumbing (signature
  verification branch, event-type routing, idempotency, entitlement write) is
  not. Given this is the money path, at least the event-routing and the
  "ignore unknown/duplicate event" branches deserve tests with a mocked Stripe
  client.
- **`corpus.ts` (44%)** is RAG retrieval — the citation accuracy that the whole
  "Captain Adel cites the exact Part/section" promise rests on. Worth raising:
  the chunk-selection and citation-shaping branches (lines ~223–248) are the
  ones that, if broken, produce wrong or missing citations.
- **`captain-adel.ts` (0%)** is the Genkit/Gemini flow. Harder to test in
  isolation; lower priority than the two above, but the prompt assembly is
  already partially covered by `captain-adel-prompt.test.ts`.

### 3. Frontend offline / sync data integrity (`sync.ts` 48%, `useOfflineSync.ts` 0%, `offlineCache.ts` 78%) — ✅ addressed in this PR

> **Update:** `tests/sync-io.test.ts` and `tests/offline-sync.test.tsx` now cover
> the `sync.ts` I/O helpers (`loadAccount` + the write-throughs) and the
> `useOfflineBookmarkSync` hook. `sync.ts` moved 48% → 92% and `useOfflineSync.ts`
> 0% → 83%; the "client never serializes `entitlement`" invariant is now an
> explicit assertion. §1, §2, §4, §5 remain open.


`sync.ts` maps Firestore docs ⇄ Profile/Flight/Entitlement. The pure mappers are
tested, but the I/O helpers (lines ~118–182) — the read/merge/write paths that
decide what the client persists — are not. The load-bearing invariant here is
that **the client never writes the server-only `entitlement` field**
(`profileToDoc` omits it, enforced by `firestore.rules`). There is a rules test,
but no unit test pinning `profileToDoc`'s omission of `entitlement` as a
first-class assertion. A pilot losing/duplicating logbook entries on a flaky
connection is the failure this guards against.

**Proposal:** unit-test `profileToDoc`/`docToProfile` round-trips (explicitly
asserting `entitlement` is never serialized), and give `useOfflineSync` a
render-hook test for its online-gated, slug-deduped bookmark-warming.

### 4. Untested frontend hooks & small stores (all 0%) — ✅ the two priorities addressed

> **Update:** `tests/bookmark-gate.test.tsx` and `tests/referral.test.ts` cover
> the two flagged priorities. `useBookmarkGate.ts` 0% → 100% (all four
> add/remove × free/Pro branches, including the free-user `/pricing` route) and
> `referral.ts` 0% → 96% (normalize, `?ref=` capture, shareable link, and the
> `getReferralCode` fetch across configured/unconfigured/empty/error paths). The
> remaining tiny stores (`updatesPrefs`, `useDebouncedValue`, `useReducedMotion`,
> `useViewMode`) are still open but low-risk.

Low individual risk but cheap to cover and currently invisible to the ratchet:
`referral.ts`, `updatesPrefs.ts`, `useBookmarkGate.ts`, `useDebouncedValue.ts`,
`useReducedMotion.ts`, `useViewMode.ts`. Two are worth prioritizing:

- **`useBookmarkGate.ts` (0%)** encodes a real product/billing rule: adding a
  bookmark requires Pro, removing is always allowed, free users route to
  `/pricing`. That one-directional gate is exactly the kind of logic that breaks
  silently on a refactor — it deserves a test.
- **`referral.ts` (0%)** transports the `?ref=` code into checkout. A regression
  means silently dropped referral attribution (revenue/growth impact).

### 5. `CalcShell.tsx` (52%) — the shared calculator frame — ✅ addressed

> **Update:** `tests/calc-shell-presets.test.tsx` adds the affordances the base
> `calc-shell.test.tsx` didn't reach — the share button (Web Share + clipboard
> fallback), the "How it works" collapsible, and the full Pro preset lifecycle
> (save → list → load-navigates → remove, plus the blank-name guard). `useFeature`
> is forced to Pro (matching the current `FREE_FOR_EVERYONE` promo) and
> `react-router` is partially mocked to spy on navigation. `CalcShell.tsx` moved
> 52% → 85%. Only §2 (below) remains.

Every tool renders inside `CalcShell` (copy-link · try-an-example ·
ask-Captain-Adel · disclaimer). The individual calculators are well tested, but
the shell's own interactive affordances (the copy-link handler, the
"try an example" seeding, the Ask-Adel hand-off) are under-covered (lines
~134–136, 224–273). A component test with Testing Library would cover the
buttons once and protect every tool page at the frame level.

## What we should *not* chase

Large swaths of `src/components` sit at 0% — `bento/*` widgets, `aerodrome/*`
visuals, hero/marquee/decorative components. These are presentational and are
(correctly) covered by the Playwright E2E suite and visual review, not unit
tests. Chasing their line coverage would be low-value busywork. The coverage
`include` in `vitest.config.ts` already scopes the ratchet to the
unit-testable layers; keep it that way.

## Suggested sequencing

1. **Gateway route handlers** (§1) — biggest risk reduction, unblocks raising
   the backend from ~35% toward parity with the frontend.
2. **Stripe webhook + corpus citation branches** (§2) — protects the money path
   and the citation promise.
3. **`sync.ts` mappers + `entitlement` omission** (§3) — data-integrity net for
   offline/multi-device pilots.
4. **`useBookmarkGate` + `referral`** (§4) — cheap, protects billing/growth
   rules.
5. **`CalcShell`** (§5) — one test, broad protection across all tools.

Once §1–§3 land, the backend `functions/` suite should adopt a coverage ratchet
of its own (mirroring the frontend's `vitest.config.ts` thresholds) so the newly
covered wiring can't silently regress.

## Follow-up — July 2026 (B2B org seat provisioning)

The B2B org-admin feature (`/business/admin`, self-serve seat provisioning)
landed **after** this analysis was written, so it wasn't in the original scope —
and it came in with the same gap the analysis flags for the rest of the backend:
its business rules were inline in an untested callable wrapper. A fresh
`npm run test:coverage` put `src/lib/org.ts` and `functions/src/org.ts` at ~0%,
on code that decides **seat access and billed seat counts** — the highest-risk
class of untested code by the analysis's own ranking (§1–§2).

Addressed in this change:

- **Extracted `functions/src/org-core.ts`** (pure, Firebase-free) from the
  `provisionSeats` callable, per the repo convention that "every business rule
  lives in a pure `*-core.ts`": request validation (`parseProvisionInput`), the
  **seat-limit guardrail** (`checkSeatLimit` — the over/under-provisioning
  decision), and idempotent invite-doc assembly (`buildInvite`). `functions/tests/org-core.test.ts`
  covers them exhaustively — boundary at the limit, one-over rejection with the
  verbatim `resource-exhausted` message, malformed-email handling, and
  normalize/idempotency. The callable is now a thin passthrough over the core.
  (This also removed a stale "circular dependency" dynamic import — `org.ts`
  already imports `school-core` statically.)
- **`tests/org-client.test.ts`** pins the client's load-bearing contract: the
  `/business/admin` wrappers **never throw** — an unconfigured/undeployed/
  unauthorised call resolves to a safe empty result (`[]` / `null`) so the page
  renders a "no access" state — plus request shaping and response unwrapping.

Still open from the original plan: the org/cohort **read** callables
(`getMyOrgs`, `getCohortReadiness`) and `provisionSeats`' Firestore wiring
(ownership gate, the seat-count read) remain emulator-test candidates, the same
§1–§2 wrapper work outstanding for `gateway`/`billing`. The next backend step is
still the coverage ratchet on `functions/` so these newly-pure rules can't
regress.
