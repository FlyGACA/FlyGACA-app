# RUNBOOK — Deploy (Firebase canonical + Vercel · Cloudflare · Netlify mirrors)

The app is one Vite build (`npm run build` → `dist/`) deployable to four static fronts.

- **Firebase Hosting** is the **canonical/production** front (decided 2026-07-06, closing
  SEO-PLAN P0.a): the `/api/chat` and `/api/feedback` Cloud Functions (the Captain Adel gateway,
  region `me-central2` in the repo — must match `functions/src/region.ts` and the `firebase.json`
  rewrites; **the deployed functions are still `me-central1`**, see the cutover section below) are
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

> **Incident note (2026-08-04):** a second accidental `firebase init` (same class as `c1897f0`
> above) scaffolded over the backend in the working tree — `functions/src/index.ts` was reduced to
> the stock template (**every** export gone, i.e. an empty deploy manifest), `functions/package.json`
> lost genkit/express/helmet and downgraded `firebase-admin`, `tsconfig.json` lost `skipLibCheck`,
> `dataconnect/schema.gql` + `dataconnect.yaml` were replaced, and `firebase.json` gained a duplicate
> `apphosting` backend. Caught before any deploy and reverted from git (nothing was committed). Had
> it deployed, `--only functions` would have read the empty manifest as "delete every live
> function". **Before running `firebase init` in this repo, commit or stash first, then read the
> diff** — `init` overwrites existing config without asking.

## Region cutover `me-central1` → `me-central2` (in-Kingdom / PDPL) — IN PROGRESS

For the PDPL the in-Kingdom region is **`me-central2`** (Dammam) — where Firestore already lives
(`firestore.location` in `firebase.json`) — so co-locating the Functions there is the goal.

**Repo status: done.** Commit `3007ae1` (2026-08-03) flipped all three pinned values —
`functions/src/region.ts`, the three `/api/*` rewrites in `firebase.json`, and `FUNCTIONS_REGION` in
`src/lib/services/firebase.ts`. The `functions/tests/region.test.ts` drift-guard passes.

**Production status: not started.** Verified against `flygaca-app` on 2026-08-04:

| Live function                                 | Region        | In repo at `main`?                      |
| --------------------------------------------- | ------------- | --------------------------------------- |
| `chat`                                        | `me-central1` | yes — needs moving                      |
| `createCheckoutSession`                       | `me-central1` | no — replaced by `createCheckoutConfig` |
| `stripeWebhook`                               | `me-central1` | no — Stripe replaced by Moyasar         |
| `revenuecatWebhook`, `linkRevenueCatIdentity` | `me-central1` | no — RevenueCat dropped                 |
| `grantSchoolLicence`, `revokeSchoolLicence`   | `me-central1` | no — replaced by `claimSchoolSeat`      |
| `protectedContent`                            | `me-central1` | no                                      |
| `ext-firestore-*` (4)                         | `us-central1` | Firebase Extensions, unrelated          |

So this is **not only a region move**. Production is a full generation behind `main`: `moyasarWebhook`
and every other current export (`confirmPayment`, `cancelAutoRenew`, `getReferralCode`,
`renewMoyasarSubscriptions`, `claimStaffAccess`, `claimSchoolSeat`, `claimFoundingAccess`,
`getMyOrgs`, `getCohortReadiness`, `provisionSeats`) **has never been deployed**. The first deploy is
simultaneously a region cutover _and_ the Stripe/RevenueCat → Moyasar billing migration. Treat the
billing half as the risky half.

Sequencing constraint: the Hosting deploy validates the `/api/*` rewrites against the _live_
Functions and refuses to finalize a version whose rewrite points at a region where the function
doesn't exist (`Error: Unable to find a valid endpoint for function … present but in the wrong
region`). **Functions must exist in `me-central2` before hosting is deployed.**

### Blocker: the required secrets do not exist

Checked 2026-08-04 — all three return 404 on `flygaca-app`. The deploy will fail without them:

```bash
npx firebase functions:secrets:set GOOGLE_GENAI_API_KEY  --project flygaca-app  # chat gateway
npx firebase functions:secrets:set MOYASAR_SECRET_KEY    --project flygaca-app  # billing callables
npx firebase functions:secrets:set MOYASAR_WEBHOOK_SECRET --project flygaca-app # moyasarWebhook
npx firebase functions:secrets:access GOOGLE_GENAI_API_KEY --project flygaca-app  # verify
```

(The live `chat` predates this code and sources its key some other way — don't assume it carries
over.)

### Order

1. **Pre-check `me-central2` availability** — confirm Cloud Functions 2nd gen / Cloud Run is enabled
   for `me-central2` on `flygaca-app` by deploying a single function there as a canary. Don't start
   until it succeeds.
2. **Set the three secrets** (above). Verify each reads back.
3. **Deploy the Functions** — `npm run deploy:functions`. This creates the full current export set in
   `me-central2`; the eight `me-central1` functions stay live and untouched. Confirm the secrets bind
   in the new region (`firebase functions:log`), and that `renewMoyasarSubscriptions`' schedule
   registered.
4. **Register the Moyasar webhook** — point it at `https://flygaca.com/api/moyasar-webhook` in the
   Moyasar dashboard and confirm the signing secret matches `MOYASAR_WEBHOOK_SECRET`. Until this is
   done, payment confirmations drop silently: the charge succeeds, the entitlement never gets
   written. Do this **before** the app starts sending users to Moyasar checkout.
5. **Deploy hosting** — `npm run deploy` (build → prerender → coverage check → hosting). The rewrites
   now resolve, and the frontend ships `FUNCTIONS_REGION=me-central2` so callables land in the new
   region.
6. **Smoke-test in prod** — `/api/chat` (streamed answer + citation), `/api/feedback`, a callable
   (`createCheckoutConfig`), and a Moyasar test charge end-to-end through to the `entitlement` write.
7. **Retire the old generation** — only once step 6 is clean:
   ```bash
   for fn in chat createCheckoutSession stripeWebhook revenuecatWebhook \
             linkRevenueCatIdentity grantSchoolLicence revokeSchoolLicence protectedContent; do
     npx firebase functions:delete "$fn" --region me-central1 --project flygaca-app
   done
   ```
   **Check for live Stripe/RevenueCat subscribers first.** Deleting those webhooks ends renewal
   processing for anyone still on them — that's a billing migration decision, not a cleanup step.
   `chat` is the only one of the eight that is purely a region move.
8. **Update the PDPL copy** — `src/i18n/{en,ar}.json` (key at `…privacy…`, currently "Chat questions
   are processed in a nearby Google Cloud region (me-central1)") → in-Kingdom `me-central2`.
   Reconcile with legal that the _gateway_ being in-Kingdom is distinct from where the Gemini model
   call itself runs (see `Captain-Adel`'s in-Kingdom-model note) — don't overclaim. Both bundles, or
   `tests/i18n-parity.test.ts` fails.
9. **Update the docs** — flip this section to done, and correct `CLAUDE.md` (which still describes the
   deploy region as `me-central1`).

## Build env vars (set in each platform's build settings)

All `VITE_*` are public, non-secret (values in `.env.example`):

| Var                                                      | Value                 | Notes                                                |
| -------------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_MEASUREMENT_ID` | from `.env.example`   | turns on Auth/Firestore/Analytics                    |
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

## Cloudflare Workers (mirror)

**Automated (preferred):** `.github/workflows/deploy-cloudflare.yml` builds and deploys the
`flygaca-app` Worker (serving the `dist/` static assets) on every push to `main` (and on demand via
Actions → **Deploy (Cloudflare Workers mirror)** → _Run workflow_). The deploy step is **gated on
secrets**, so it builds but skips publishing until you add both in repo Settings → Secrets → Actions:

- **`CLOUDFLARE_API_TOKEN`** — a token with the _Workers Scripts: Edit_ permission (plus account-level
  Workers access for uploading the static assets).
- **`CLOUDFLARE_ACCOUNT_ID`** — the account that owns the `flygaca-app` Worker.

**Manual (`wrangler login` first):**

```bash
npm i -g wrangler
npm run build
npx wrangler deploy            # reads name, main and dist/ assets from wrangler.toml
```

Config: `wrangler.toml` (Workers + `[assets]` binding, `run_worker_first = ["/api/*"]`),
`worker/index.ts` (proxies `/api/*` → Firebase, preserves SSE; serves assets otherwise),
`public/_redirects` (SPA fallback) and `public/_headers` (headers/CSP) — both copied into `dist/`
and honored by Workers static assets.

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
