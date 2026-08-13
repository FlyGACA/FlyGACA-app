# Unit tests

Vitest specs for the frontend, grouped by the layer under test. `npm run test` runs everything
here except `rules/`; `npm run test:coverage` adds the coverage ratchet that gates CI.

The backend has its own suite in [`functions/tests/`](../functions/tests/) with its own gate
(`npm run lint && npm test && npm run build` inside `functions/`) — root `npm run verify` does not
cover it. The Playwright end-to-end and a11y specs live in [`e2e/`](../e2e/).

## Layout

| Folder | What lives here |
| --- | --- |
| `calc/` | Pure calculator + domain logic — `src/calc/**` (aviation math, chat, pilot, library, study, app helpers). |
| `hud/` | The airspace-sim engine — `src/calc/hud/**`. Split out because it is a self-contained simulation. |
| `lib/` | Typed frontend services, prefs stores, and cross-cutting modules — `src/lib/**`. |
| `components/` | Rendered component behaviour — `src/components/**`. |
| `hooks/` | Shared React hooks — `src/hooks/**`. |
| `pages/` | Page-level behaviour and route smoke tests — `src/pages/**`. |
| `app/` | Shell, routing and flavor wiring — `src/app/**`, `src/router.tsx`, `src/flavors/**`. |
| `scripts/` | Node pipeline helpers under `scripts/` (corpus sync, flavor slicing, markdown splitting, …). |
| `integrity/` | Cross-cutting drift guards that don't test one module — see below. |
| `helpers/` | Shared test utilities (`render`, `freshModule`). Not a test folder. |
| `rules/` | Firestore security-rules tests. Emulator-backed, run by `npm run test:rules` under `vitest.rules.config.ts`; **excluded** from the default run. |

`setup.ts` stays at the root of `tests/` because `vitest.config.ts` references it directly.

## `integrity/` — the drift guards

These fail the build when two things that must agree stop agreeing. They are the reason several
conventions in `CLAUDE.md` are described as "enforced" rather than "preferred":

- `i18n-parity` — every key present in both `en.json` and `ar.json`.
- `client-server-mirrors` — client mirrors (`chatQuota`, `entitlements`, `features`) match their
  `functions/src/*-core.ts` counterparts.
- `pricing-server-parity` — quoted prices match the server's charge params.
- `csp-parity` — the single CSP in `firebase.json` still allows the money-path origins.
- `bento-motion-parity` — `framer-motion` values match the CSS motion tokens.
- `data-shape` / `quiz-citations` / `guides-content` — corpus and authored-content invariants.
- `airport-shards` — the committed long-tail aerodrome shards agree with their `_manifest.json`,
  and shard selection stays a **superset** of what `inRegion` matches (picking one shard too few
  would silently drop aerodromes from the directory rather than fail loudly).

## Conventions

- Import source through the `@/` alias (`@/calc/isa`), not a relative path — it stays correct
  wherever a spec sits.
- Reach outside `tests/` only for things with no alias (`../../scripts/…`, `../../functions/src/…`).
- Filesystem reads resolve from `process.cwd()` (the repo root), so they are location-independent.
- New spec goes in the folder matching its subject; name it after the module under test.
