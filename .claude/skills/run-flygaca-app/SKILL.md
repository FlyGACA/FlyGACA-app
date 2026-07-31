---
name: run-flygaca-app
description: Build, run, screenshot, and drive the Fly GACA frontend (Vite + React SPA). Use when asked to start the app, run the dev server, build it, run its tests, take a screenshot of a page, or interact with the running UI.
---

The Fly GACA frontend is a Vite + React + TypeScript single-page app. An agent
drives it by starting the Vite dev server and pointing the Playwright-based
driver at it: `.claude/skills/run-flygaca-app/driver.mjs`. The driver has two
modes — **screenshot routes**, and **run a flow** that types into real inputs
and asserts the recomputed output. (`chromium-cli` is not available here, so the
driver uses Playwright's chromium directly.)

Prefer the driver over hand-rolled Playwright: it already suppresses the
first-run tour, waits out the lazy dashboard, and freezes entry animations —
three traps that silently corrupt screenshots (see Gotchas).

All paths below are relative to the repo root (the unit).

## Prerequisites

Node 20+ (this session used v26.5.0) and the repo's npm deps. No `apt-get`, no
`npx playwright install`: `playwright-core` 1.61.1 wants chromium revision
**1228**, and that revision was already cached at
`~/Library/Caches/ms-playwright/chromium-1228`, so `chromium.launch()` resolves
on its own. `resolveChrome()` in the driver falls back to an explicit
`executablePath` (macOS/Linux/Windows layouts, plus `/opt/pw-browsers`) for
environments where the revision doesn't match or downloads are blocked;
override with `CHROME_PATH` if needed.

```bash
npm install
```

## Run (agent path)

Start the dev server in the background, poll until it serves, then drive it:

```bash
npm run dev > /tmp/vite.log 2>&1 &                                  # serves http://localhost:5173
curl -sf -o /dev/null -w '%{http_code}\n' http://localhost:5173     # → 200 once ready (~1 poll)

# screenshot mode — one or more routes
node .claude/skills/run-flygaca-app/driver.mjs / /tools /library/part-121

# flow mode — real interaction, asserted
node .claude/skills/run-flygaca-app/driver.mjs --flow crosswind
node .claude/skills/run-flygaca-app/driver.mjs --flow rtl
```

Screenshot mode reports title + console/page errors per route and writes
`$SHOTS_DIR/<slug>.png`:

```
✓ /  "Saudi Aviation Library - GACAR Study Guide — Fly GACA"  → /tmp/shots/home.png
    ✓ no console/page errors
```

Flow mode prints one line per assertion and exits non-zero if any fail:

```
flow: crosswind
  ✓ runway heading: 340°
  ✓ crosswind: 13.8 kt
  ✓ headwind: 11.6 kt
  ✓ wind angle: 50°
  ✓ inputs in URL: yes
  ✓ crosswind restored from URL: 13.8 kt
  ✓ disclaimer present: yes
```

`crosswind` types runway 34 / wind 290° / 18 kt into the reference calculator,
asserts all four outputs, asserts the inputs reached the querystring, then
cold-loads `?rwy=34&wdir=290&wspd=18` and asserts the same answer rebuilds.
`rtl` clicks the language toggle and asserts `<html dir>` flips to `rtl` and
`lang` to `ar`. **Adding a flow is the intended way to extend this** — drop a
function in the `flows` object returning `{name, got, want}` checks.

| env var | default | purpose |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | point at preview (`:4173`) or another host |
| `SHOTS_DIR` | `/tmp/shots` | where screenshots land |
| `CHROME_PATH` | auto-resolved | override the chromium binary |
| `SHOW_TOUR` | unset | set to `1` to let the first-run welcome tour appear |

Stop the dev server when done — but see the `pkill` gotcha below if an e2e run
may be in flight:

```bash
pkill -f "vite$"     # the dev server; leaves `vite preview` (e2e, :4173) alone
```

## Run (human path)

```bash
npm run dev          # → http://localhost:5173; Ctrl-C to stop
```

Nothing to see headless — use the agent path.

## Build

```bash
npm run build        # build:sitemap → tsc -b → vite build → prerender-head
```

Takes ~12 s and ends with `PWA … precache 253 entries` and
`prerender-head: wrote 403 route snapshots`.

## Test

```bash
npm run test         # vitest — 121 files, 863 tests
npm run test:e2e     # playwright — builds, serves :4173, 49 tests (~1 min)
```

**Neither suite fully passes on a machine with a populated `.env.local`** — and
the failures are the environment's fault, not the code's:

| suite | with the repo's `.env.local` | with Firebase keys blanked |
|---|---|---|
| `npm run test` | 5 failed / 858 passed | **863 passed** (121/121 files) |
| `npm run test:e2e` | 2 failed / 47 passed | **49 passed** |

Every failure is in a *"without Firebase config"* / *"not configured"* test —
`auth.test.ts`, `billing.test.ts`, `sync.test.ts`, and the e2e
`account local sign-in` + `pricing Go-Pro stays disabled` specs. See Gotchas for
the cause and the one-file workaround. CI is unaffected: it builds from
`.env.example`.

## Gotchas

- **A fresh browser context is a first-time visitor, so the 5-step welcome tour
  mounts as a modal over the hero** and swallows clicks. It is gated on
  `localStorage['flygaca:onboarding-seen']` (the value is the tour *version*,
  `src/lib/onboardingPrefs.ts`). The driver seeds that key in an `addInitScript`
  before any app code runs; `SHOW_TOUR=1` opts back in.
- **Waiting for `<h1>` is not enough.** Below-the-fold sections sit behind their
  own lazy chunk + `<Suspense>`, and the fallback is a *sized* empty div — the
  home page's `HomeDashboard` placeholder measures 520 px. Screenshot at `h1`
  and you get a large blank band that reads as a broken page; it resolves by
  `networkidle`. The driver waits for any tall `*allback*` div to detach.
- **Without reduced motion, screenshots capture animations mid-flight and the
  numbers are wrong.** The home page's `CountUp` stats photograph as **18 / 14 /
  5** instead of their true **74 / 55 / 20**. The driver sets
  `reducedMotion: 'reduce'` on every context (as the repo's own
  `playwright.config.ts` does, for the same reason).
- **The crosswind placeholders are `34` / `290` / `18` — the exact values the
  flow types in.** A screenshot cannot tell you whether those fields are filled;
  on a cold load `input.value` is `""` and only the placeholder shows. Assert the
  computed stats, never the input's appearance.
- **`LangToggle` renders "ع" but carries `aria-label="Switch language"`,** and
  aria-label wins for the accessible name — `getByRole('button', {name: /ع/})`
  never resolves. There are two toggles (header + footer); take `.first()`.
- **Both test suites fail when `.env.local` carries real Firebase config.** The
  repo's `.env.local` sets `VITE_FIREBASE_API_KEY` / `PROJECT_ID` / `APP_ID` plus
  `VITE_FIREBASE_EMULATOR=1`. Vite loads it in every mode, so tests asserting the
  *unconfigured* path instead find Firebase configured — and, with the emulators
  up (Firestore `:8080`, Auth `:9099`, UI `:4000`), reach a live backend and get
  `FirebaseError: 7 PERMISSION_DENIED`. To run either suite as CI sees it, blank
  the three keys in a mode-specific override, which outranks `.env.local` and is
  gitignored (`.env.*.local`) — then delete it:

  ```bash
  # unit tests run in mode "test"; the e2e build runs in mode "production"
  printf 'VITE_FIREBASE_API_KEY=\nVITE_FIREBASE_PROJECT_ID=\nVITE_FIREBASE_APP_ID=\nVITE_FIREBASE_EMULATOR=0\n' > .env.test.local
  npm run test; rm -f .env.test.local
  ```

  Do **not** conclude the app is broken from these failures, and do not "fix"
  the tests.
- **A full GACAR Part will not screenshot.** `/library/part-121` (632 KB of HTML)
  exceeds the timeout for a full-page shot *and* for the clipped fallback, so the
  driver skips the image and reports `screenshot skipped — page mounted, DOM
  verified`. That is a `✓`, not a failure.
- **`/library/part-121` logs a React duplicate-key console error**
  (`Encountered two children with the same key … sub-h`). Pre-existing, reported
  as a `⚠` warning, and it does not fail the route.
- **`pkill -f vite` also kills `vite preview`.** The e2e suite serves the
  production build on `:4173` via `vite preview`, so pkill-ing "vite" to clean up
  a dev server mid-run drops the e2e web server too and every spec fails with
  `net::ERR_CONNECTION_REFUSED at http://localhost:4173`. That error means you
  shot the server, not that the app is broken. Use `pkill -f "vite$"`-style
  precision, or just don't clean up while e2e is running.
- **Don't wait on the server with a foreground `sleep`** — this harness blocks it
  (`Blocked: sleep 45 followed by …`). Poll with `curl` as shown above; the dev
  server was ready on the first poll.

## Troubleshooting

- **`browserType.launch: Executable doesn't exist`** — the cached revision
  doesn't match `playwright-core`. Check `ls ~/Library/Caches/ms-playwright`
  (Linux: `~/.cache/ms-playwright`) against
  `node -e "console.log(require('./node_modules/playwright-core/browsers.json').browsers.find(b=>b.name==='chromium').revision)"`
  and set `CHROME_PATH` to the binary inside the matching `chromium-<rev>` dir.
- **Driver hangs, or `Timeout … waiting for #root`** — the dev server isn't
  serving. Confirm `curl http://localhost:5173` returns 200; check `/tmp/vite.log`.
- **`EADDRINUSE` on `npm run dev`** — a previous server is still up;
  `pkill -f "vite$"`.
- **A flow fails on `getByLabel(...)`** — the label text comes from
  `src/i18n/en.json` and is matched verbatim; if copy changed, re-read the key
  rather than guessing.
