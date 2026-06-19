---
name: run-flygaca-app
description: Build, run, screenshot, and drive the Fly GACA frontend (Vite + React SPA). Use when asked to start the app, run the dev server, build it, run its tests, take a screenshot of a page, or interact with the running UI.
---

The Fly GACA frontend is a Vite + React + TypeScript single-page app. An agent
drives it by starting the Vite dev server and pointing the Playwright-based
driver at it — `.claude/skills/run-flygaca-app/driver.mjs` navigates routes,
waits for the SPA to mount, and writes a screenshot per route. (`chromium-cli`
is not available in this environment, so the driver uses Playwright's chromium
directly.)

All paths below are relative to the repo root (the unit).

## Prerequisites

No `apt-get` needed — a Playwright chromium is **pre-installed** at
`/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is already exported), and the
driver launches it via an explicit `executablePath`. Node 20+ and the repo's
npm deps are the only requirements.

> Do **not** run `npx playwright install` — browser downloads are blocked here
> (HTTP 403). The pre-installed binary is what the driver uses.

## Setup

```bash
npm install
```

## Build

```bash
npm run build        # build:sitemap → tsc -b → vite build, emits dist/
```

## Run (agent path)

Start the dev server in the background, wait for it to serve, then drive it:

```bash
npm run dev > /tmp/vite.log 2>&1 &                                  # serves http://localhost:5173
curl -sf -o /dev/null -w '%{http_code}\n' http://localhost:5173     # → 200 once ready (~0.3s)

node .claude/skills/run-flygaca-app/driver.mjs / /tools /library /chat
```

The driver takes one or more **routes** (default `/`), screenshots each, and
reports console/page errors. Output looks like:

```
✓ /  "Fly GACA — Saudi Aviation Library"  → /tmp/shots/home.png
    ⚠ 2 console error(s): Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
```

Screenshots → `/tmp/shots/<slug>.png` (e.g. `home.png`, `tools.png`). Exit code
is non-zero if any route fails to load/mount or throws a page error (console
errors are warnings, not failures).

| env var | default | purpose |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | point at preview (`:4173`) or another host |
| `SHOTS_DIR` | `/tmp/shots` | where screenshots land |
| `CHROME_PATH` | auto (`/opt/pw-browsers/chromium-*/chrome-linux/chrome`) | override the chromium binary |

Stop the dev server when done: `pkill -f vite`.

## Run (human path)

```bash
npm run dev          # → http://localhost:5173, open in a browser; Ctrl-C to stop
```

Useless headless — there's no window to see; use the agent path above instead.

## Test

```bash
npm run test         # vitest — 37 files, 199 tests pass (incl. i18n EN/AR parity)
```

`npm run test:e2e` (Playwright, builds + serves a preview on :4173) needs a
chromium matching Playwright's expected revision; the pre-installed binary is a
different revision and the download is blocked, so e2e doesn't run as-is here.
The `driver.mjs` agent path sidesteps this by launching the pre-installed binary
directly.

## Gotchas

- **`npx playwright install` fails (403).** Browser downloads are network-blocked.
  Use the pre-installed `/opt/pw-browsers` chromium — the driver already resolves it.
- **Playwright revision mismatch.** The installed Playwright expects a newer
  chromium revision than the one at `/opt/pw-browsers`, so `chromium.launch()` with
  no path can't find a browser. The driver passes an explicit `executablePath`,
  which bypasses the revision lookup and works fine for nav/screenshot.
- **`ERR_CERT_AUTHORITY_INVALID` console errors are expected** — an external
  resource (analytics/font CDN) fails its TLS check in this sandbox. The app
  renders correctly; these are warnings, not app errors.
- **Don't use a foreground `sleep` to wait for the server** — it's blocked in this
  harness. Poll with `curl` (as above) instead.

## Troubleshooting

- **`browserType.launch: Executable doesn't exist … run npx playwright install`**:
  the pre-installed binary wasn't found. Check `ls /opt/pw-browsers/` and set
  `CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome` to the listed dir.
- **Driver hangs / `Timeout … waiting for #root`**: the dev server isn't serving.
  Confirm `curl http://localhost:5173` returns 200 and check `/tmp/vite.log`.
- **`EADDRINUSE` on `npm run dev`**: a previous server is still up — `pkill -f vite`
  first.
