# RUNBOOK — Deploy (Firebase — the single front)

The app is one Vite build (`npm run build` → `dist/`) served from **one** front: **Firebase Hosting**.

- **Firebase Hosting** hosts the SPA and co-locates the `/api/*` Cloud Functions gateway (the Captain
  Adel `chat` + the `moyasarWebhook`), region `me-central1` — must match `functions/src/region.ts`
  and the `firebase.json` rewrites. The backend lives in this repo's `functions/` workspace, deployed
  separately via `npm run deploy:functions` — the frontend `npm run build` never rebuilds it. The
  `flygaca.com` DNS cutover to Firebase (see `../archive/docs/RUNBOOK-cutover.md`) completed
  2026-07-31: the apex and `www` both resolve to Firebase Hosting.
- **One front, one CSP.** The security headers + CSP live only in `firebase.json`; there are no
  mirror configs to keep in sync. `tests/csp-parity.test.ts` guards that the single policy keeps
  allowing the money-path origins (`cdn.moyasar.com`, `api.moyasar.com`,
  `me-central1-flygaca-app.cloudfunctions.net`).
- **The Vercel / Cloudflare / Netlify mirror fronts were removed** (2026-08) to consolidate on one
  platform — see the note at the end of this file for the history.

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
ship the shell-only build).

## `www` → apex, and captadel.com

`www.flygaca.com` → apex is a **Firebase console** concern: add `www.flygaca.com` to the Hosting site
as a **redirect** domain (it 301s to the apex). This is where the old `vercel.json` `www → apex`
redirect went when the mirror configs were removed. `captadel.com` / `www.captadel.com` are
Captain-Adel's own domains (Cloud Run), not custom domains on this Firebase site, so they can't be
redirected in `firebase.json`; the app folds them to `flygaca.com` at runtime (`src/lib/seo/seo.ts`
`DUPLICATE_HOSTS` + `src/main.tsx`) — a client-side 302 after JS boot, which is enough for the
low-traffic legacy domain.

## Post-deploy smoke (run on flygaca.com)

1. Home `/` loads; service worker registers (PWA).
2. A calculator route computes (e.g. crosswind) and copy-link works.
3. `/library` search → opens a reader.
4. **Chat streams** — confirms the `/api/*` gateway + SSE path end-to-end.
5. EN ⇄ AR toggles and the layout flips RTL.
6. Security headers present (DevTools → Network → response headers: CSP, HSTS, etc.).
7. `flygaca-app.web.app` carries `<meta name="robots" content="noindex">` (the canonical
   flygaca.com must NOT) — confirms the duplicate-host protection.

## History — the Vercel / Cloudflare / Netlify mirrors (removed 2026-08)

The app briefly ran behind three extra static fronts (Vercel, Netlify, and a Cloudflare Worker) that
served the same `dist/` and proxied `/api/*` back to Firebase. A planned move to make the Cloudflare
Worker the canonical front was configured but **never deployed** (its secrets were never set). The
project consolidated onto **Firebase as the single front** (2026-08) to cut the operational surface —
four copies of the CSP, four deploy paths, four DNS/SSL setups — down to one. The mirror configs
(`vercel.json`, `netlify.toml`, `wrangler.toml`, `worker/index.ts`, `public/_headers`,
`public/_redirects`, `deploy-cloudflare.yml`) were deleted. If a CDN in front of Firebase is ever
wanted again, prefer a **DNS-only / pass-through** setup (e.g. Cloudflare grey-cloud) over a second
build-and-serve front, so there's still one source of truth for the build and headers.
