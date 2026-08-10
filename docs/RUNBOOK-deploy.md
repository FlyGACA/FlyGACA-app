# RUNBOOK — Deploy (Firebase canonical + Vercel · Cloudflare · Netlify mirrors)

The app is one Vite build (`npm run build` → `dist/`) deployable to four static fronts.

- **Firebase Hosting** is the **canonical/production** front (decided 2026-07-06, closing
  SEO-PLAN P0.a): the `/api/chat` and `/api/feedback` Cloud Functions (the Captain Adel gateway,
  region `me-central1` — must match `functions/src/region.ts` and the `firebase.json` rewrites) are
  co-located there. The backend lives in this repo's `functions/` workspace, deployed separately via
  `npm run deploy:functions` — the frontend `npm run build` never rebuilds it. The `flygaca.com` DNS
  cutover to Firebase (see `../archive/docs/RUNBOOK-cutover.md`) completed 2026-07-31: the apex and
  `www` both resolve to Firebase Hosting now.
- **Vercel / Cloudflare / Netlify** are **mirror fronts**. They serve the same `dist/` and **proxy
  `/api/*` back to the Firebase gateway** (`https://flygaca-app.web.app/api/*`) so chat/content keep
  working. The proxy is same-origin to the browser, so the strict CSP (`connect-src 'self'`) is
  unchanged and no CORS is needed. They depend on the Firebase Functions being live.

> **Incident note (2026-07-05 → 06):** an accidental `firebase init` commit (`c1897f0`) flipped
> `firebase.json` `hosting.public` from `dist` to `y` and deleted the hosting `headers` block, so
> every green Firebase deploy published a one-file "Welcome to Firebase Hosting" placeholder. Fixed
> by restoring `public: "dist"` + the headers and deleting `y/`. The auto-generated
> `firebase-hosting-merge.yml` workflow (which raced `deploy.yml` on every push to `main` and
> deployed without the prerender) was removed at the same time — **`deploy.yml` is the only
> production deploy workflow**.

> **Incident note (2026-07-31):** `flygaca.com` was returning Vercel's `404 DEPLOYMENT_NOT_FOUND` on
> every request — DNS still pointed at Vercel's edge, but the domain wasn't bound to a live
> deployment there (the Vercel project itself, `fly-gaca/flygaca`, is still active and still builds
> preview deployments on push; only the `flygaca.com` domain association/alias stopped resolving —
> root cause on the Vercel side not fully diagnosed). Fixed by adding `flygaca.com` +
> `www.flygaca.com` as custom domains on the Firebase Hosting site and repointing their DNS records
> at Firebase — see the completed cutover in `../archive/docs/RUNBOOK-cutover.md`.

## Planned: region cutover `me-central1` → `me-central2` (in-Kingdom / PDPL)

The Functions deploy to **`me-central1`** (Doha, Qatar). For the PDPL the in-Kingdom region is
**`me-central2`** (Dammam) — also where Firestore already lives (`firestore.location` in
`firebase.json`), so co-locating the Functions there is the goal. This is **not a repo-only edit**:
the Hosting deploy validates the `/api/*` rewrites against the *live* Functions and refuses to
finalize a version whose rewrite points at a region where the function doesn't exist
(`Error: Unable to find a valid endpoint for function … present but in the wrong region`). So the
config flip is the **last** step, run only after the Functions already exist in `me-central2`.
Order:

1. **Pre-check availability** — confirm Cloud Functions (2nd gen / Cloud Run) is enabled for
   `me-central2` on the `flygaca-app` project by deploying one function there as a canary. This is
   the "pending Google access grant" item — don't start until it succeeds.
2. **Deploy the Functions to `me-central2` first** — creates the `me-central2` functions (the
   `me-central1` ones stay live for now). Verify the secrets (`GOOGLE_GENAI_API_KEY`, `MOYASAR_*`, …)
   bind in the new region. Note: the live Functions currently lag `main` (Stripe/RevenueCat-era
   names are still deployed) — bring prod current in the same deploy.
3. **Flip the repo config** (a small, reviewable PR): `REGION` in `functions/src/region.ts`, the
   three `/api/*` rewrites in `firebase.json`, and `FUNCTIONS_REGION` in
   `src/lib/services/firebase.ts` → `me-central2` (the `functions/tests/region.test.ts` drift-guard
   enforces the rewrite↔`REGION` match; the pinned `billing.test.ts` region assertion moves too).
   Deploy hosting so the frontend ships `FUNCTIONS_REGION=me-central2` and the rewrites resolve.
4. **Smoke-test in prod** — `/api/chat`, `/api/feedback`, `/api/moyasar-webhook`, and a callable
   (checkout) must all resolve.
5. **Delete the stranded region** — `firebase functions:delete <name> --region me-central1` for each.
6. **Update the PDPL copy** — `src/i18n/{en,ar}.json` says chat is processed in `me-central1`; update
   it to in-Kingdom (`me-central2`), reconciling with legal that the gateway being in-Kingdom is
   distinct from where the Gemini model call itself runs (see `Captain-Adel`'s in-Kingdom-model note)
   — don't overclaim.

## Build env vars (set in each platform's build settings)

All `VITE_*` are public, non-secret. **CI no longer copies `.env.example`** — it holds placeholders,
and a placeholder is truthy enough to boot Firebase and then fail every Auth call. Both deploy
workflows and the PR-preview workflow inject these from repo **Actions variables** (Settings →
Secrets and variables → Actions → Variables) and hard-fail in a `Verify build env` step if a
required one is empty. Required variables: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`,
`FIREBASE_DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`,
`RECAPTCHA_ENTERPRISE_SITE_KEY`, `MOYASAR_PUBLISHABLE_KEY`, plus optional `DATA_BASE_URL` /
`DATA_BUCKET`.

| Var                                                      | Value                 | Notes                                                |
| -------------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_MEASUREMENT_ID` | Actions variables     | turns on Auth/Firestore/Analytics                    |
| `VITE_API_BASE`                                          | `/api` (default)      | leave as-is — each host proxies `/api/*` to Firebase |
| `VITE_SITE_URL`                                          | `https://flygaca.com` | canonical origin for sitemap/SEO                     |
| `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`                     | (optional)            | App Check; also enforce on the Functions             |
| `VITE_FIREBASE_EMULATOR`                                 | **unset**             | never set in production                              |

## Verify before deploying (any host)

```bash
npm ci
npm run typecheck && npm run lint && npm run format:check && npm run test
npm run build && npm run check:bundle
# e2e (needs network access to download the browser):
npx playwright install --with-deps chromium && npm run test:e2e
```

## Firebase Hosting (canonical)

**Automated (preferred):** `.github/workflows/deploy.yml` builds and deploys hosting +
`firestore.rules` on every push to `main`, and on demand via Actions → **Deploy** → _Run
workflow_. It authenticates with a service account — add the JSON key as the repo secret
**`FIREBASE_SERVICE_ACCOUNT`** (Firebase console → Project Settings → Service accounts →
_Generate new private key_). Optionally add **`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`** to enable
App Check at build time (see `APP-CHECK-BACKEND.md`). The `VITE_FIREBASE_*` web config is public
and comes from `.env.example` at build time.

**Manual (`firebase login` first):**

```bash
npm run build
firebase hosting:channel:deploy preview --expires 7d   # optional preview URL
firebase deploy --only hosting                          # publish live
npm run deploy:rules                                    # deploy firestore.rules
```

Config: `firebase.json`, `.firebaserc`, `firestore.rules`. DNS cutover is in `../archive/docs/RUNBOOK-cutover.md`.

**Prerender:** the deploy workflow runs `npm run prerender` after the build, snapshotting the
high-value routes (home + hubs + every tool/guide) into `dist/<route>/index.html` so Firebase serves
real HTML, not just the SPA shell (static files win over the `**` → `/index.html` rewrite). It's
**non-fatal** (a failure never blocks the deploy). For a **manual** `npm run deploy`, install the
browser once first: `npx playwright install chromium` (otherwise prerender silently no-ops and you
ship the shell-only build). Mirror fronts (Vercel already wired; Cloudflare/Netlify) get the same by
adding `&& npm run prerender` to their build.

## Vercel (mirror) — `vercel login` first

```bash
npm i -g vercel
vercel link            # link to the Vercel project (first time)
vercel deploy --prod   # uses vercel.json (build + rewrites + headers)
```

Config: `vercel.json` (proxies `/api/(.*)` → Firebase, SPA fallback, mirrored headers/CSP).

## Cloudflare Workers — becoming canonical

> **Status:** the repo is configured for Cloudflare to serve `flygaca.com`, but the
> `flygaca-app` Worker **has never been deployed** — `CLOUDFLARE_API_TOKEN` /
> `CLOUDFLARE_ACCOUNT_ID` are unset, so every run of `deploy-cloudflare.yml` since June has taken
> the skip path and reported green. Until the console steps below are done, Firebase Hosting is
> still what visitors get.

**Automated (preferred):** `.github/workflows/deploy-cloudflare.yml` builds and deploys the
`flygaca-app` Worker (serving the `dist/` static assets) on every push to `main` (and on demand via
Actions → **Deploy (Cloudflare Workers — canonical)** → _Run workflow_). It runs the same gates as
`deploy.yml` — `Verify build env`, `check:bundle`, `check:perf`, `prerender` + coverage — because
once the custom domain is attached it *is* the production deploy. The deploy step is **gated on
secrets**, so it builds but skips publishing until you add both in repo Settings → Secrets → Actions:

- **`CLOUDFLARE_API_TOKEN`** — a token with the _Workers Scripts: Edit_ permission (plus account-level
  Workers access for uploading the static assets).
- **`CLOUDFLARE_ACCOUNT_ID`** — the account that owns the `flygaca-app` Worker.

**Manual (`wrangler login` first):**

```bash
npm i -g wrangler
npm run build
npx wrangler deploy --dry-run  # validate wrangler.toml + worker/index.ts, inspect the asset manifest
npx wrangler deploy            # reads name, main, [[routes]] and dist/ assets from wrangler.toml
```

Config: `wrangler.toml` (Workers + `[assets]` binding, `run_worker_first = ["/api/*"]`, the
`flygaca.com` custom domain, and `workers_dev = false` / `preview_urls = false`), `worker/index.ts`
(proxies `/api/*` → Firebase, preserves SSE and the raw webhook body, stamps `X-Forwarded-For`;
serves assets otherwise), `public/_redirects` (SPA fallback) and `public/_headers` (headers/CSP) —
both copied into `dist/` and honored natively by Workers static assets.

**Why `public/_headers` owns the security headers, not the Worker.** `run_worker_first` is scoped to
`/api/*`, so `worker/index.ts` never runs for a static path and cannot set headers there — the asset
layer does, from `_headers`. Widening `run_worker_first` to `true` would bill a Worker invocation on
every image and JS chunk just to restate a CSP that already has three other copies.
`tests/csp-parity.test.ts` keeps those four copies byte-identical.

**Why there is no `X-Robots-Tag` in `_headers` any more.** It would deindex the canonical
`flygaca.com`, and `_headers` has no host-conditional syntax to exempt one host. Instead: the Worker
publishes no second hostname (`workers_dev = false`), and the genuine mirrors carry their own rule —
`netlify.toml` unconditionally, `vercel.json` via a `missing: host` rule.

**Console steps (once, by hand):**

1. Create the API token and note the account ID; add both as repo secrets.
2. Point `flygaca.com` DNS at Cloudflare. **Keep the Firebase Hosting site alive** at
   `flygaca-app.web.app` — the Worker proxies `/api/*` to it and Phase 1 depends on it.
3. After the first deploy with `[[routes]]`, confirm the `flygaca.com` Custom Domain provisioned
   (Cloudflare creates the DNS record and certificate).
4. Add a **proxied** DNS record for `www`, then a **Redirect Rule**:
   `http.host eq "www.flygaca.com"` → `concat("https://flygaca.com", http.request.uri)`, 301,
   preserve query. Redirect Rules, not Bulk Redirects — this is one dynamic pattern, and it runs at
   the edge before any Worker.
5. **WAF:** add a skip rule for `/api/moyasar-webhook` (ideally all of `/api/*`) and make sure Bot
   Fight Mode does not challenge it. A server-to-server POST from Moyasar with no browser
   fingerprint is exactly what the bot heuristics challenge, and a challenged webhook fails
   silently. `confirmPayment` is the primary fulfilment path, so this degrades the backstop rather
   than breaking purchases — but you lose the backstop.
6. **Fix the dashboard git integration** (ROADMAP.md): it targets a Worker named `flygaca` while the
   repo deploys `flygaca-app`, so the `Workers Builds: flygaca` check fails on every commit. Repoint
   it or disconnect it — if both it and `deploy-cloudflare.yml` stay live you get two competing
   deploys of the canonical site.
7. Confirm `workers.dev` and Preview URLs show as **Disabled** after the deploy.
8. Promote `deploy-cloudflare.yml`'s "Note when skipped" step from `::notice::` to `::error::` +
   `exit 1` once the custom domain resolves.

**Post-deploy assertions:**

```bash
curl -sI https://flygaca.com/ | grep -i x-robots-tag        # expect NOTHING
curl -sI https://flygaca.com/ | grep -i content-security    # expect cdn.moyasar.com + cloudfunctions.net
curl -sI https://www.flygaca.com/library                    # expect 301 → https://flygaca.com/library
curl -s  https://flygaca.com/library | grep -c '<footer'    # expect ≥1 (prerendered body, not the shell)
```

Then hit `/api/chat` from two different source IPs and confirm `RateLimit-Remaining` decrements
**independently** — if they share a counter, the Worker's `X-Forwarded-For` stamp isn't landing and
the gateway's `trust proxy` hop count needs revisiting.

## Netlify (mirror) — `netlify login` first

```bash
npm i -g netlify-cli
netlify deploy --build --prod   # uses netlify.toml
```

Config: `netlify.toml` (build, `/api/*` proxy → Firebase, SPA fallback, mirrored headers/CSP).
(Netlify also honors the `_redirects`/`_headers` files — identical values, harmless overlap.)

## Post-deploy smoke (run on each deployed URL)

1. Home `/` loads; service worker registers (PWA).
2. A calculator route computes (e.g. crosswind) and copy-link works.
3. `/library` search → opens a reader.
4. **Chat streams** — confirms the `/api/*` proxy + SSE path end-to-end on that host.
5. EN ⇄ AR toggles and the layout flips RTL.
6. Security headers present (DevTools → Network → response headers: CSP, HSTS, etc.).

## Note — cross-origin alternative (not recommended)

Instead of the same-origin proxy, you could set `VITE_API_BASE=https://flygaca-app.web.app/api` on the
mirror hosts. That makes the browser call Firebase cross-origin, which then requires (a) adding that
origin to every host's CSP `connect-src` and (b) enabling CORS on the Cloud Functions (in the backend
repo). The proxy approach avoids both; prefer it.
