# RUNBOOK — Deploy (Firebase canonical + Vercel · Cloudflare · Netlify mirrors)

The app is one Vite build (`npm run build` → `dist/`) deployable to four static fronts.

- **Firebase Hosting** is the **canonical/production** front: the `/api/chat` and `/api/content`
  Cloud Functions (the Captain Adel gateway, region `me-central2`) are co-located there. The backend
  lives in this repo's `functions/` workspace, deployed separately via `npm run deploy:functions` —
  the frontend `npm run build` never rebuilds it.
- **Vercel / Cloudflare / Netlify** are **mirror fronts**. They serve the same `dist/` and **proxy
  `/api/*` back to the Firebase gateway** (`https://flygaca-app.web.app/api/*`) so chat/content keep
  working. The proxy is same-origin to the browser, so the strict CSP (`connect-src 'self'`) is
  unchanged and no CORS is needed. They depend on the Firebase Functions being live.

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

Config: `firebase.json`, `.firebaserc`, `firestore.rules`. DNS cutover is in `RUNBOOK-cutover.md`.

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
