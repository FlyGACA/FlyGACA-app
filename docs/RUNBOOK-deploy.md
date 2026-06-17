# RUNBOOK — Deploy (Firebase canonical + Vercel · Cloudflare · Netlify mirrors)

The app is one Vite build (`npm run build` → `dist/`) deployable to four static fronts.

- **Firebase Hosting** is the **canonical/production** front: the `/api/chat` and `/api/content`
  Cloud Functions (the Captain Adel gateway, region `me-central2`) are co-located there. The backend
  lives in the separate `flygaca/flygaca` repo — this repo never rebuilds it.
- **Vercel / Cloudflare / Netlify** are **mirror fronts**. They serve the same `dist/` and **proxy
  `/api/*` back to the Firebase gateway** (`https://flygaca-app.web.app/api/*`) so chat/content keep
  working. The proxy is same-origin to the browser, so the strict CSP (`connect-src 'self'`) is
  unchanged and no CORS is needed. They depend on the Firebase Functions being live.

## Build env vars (set in each platform's build settings)

All `VITE_*` are public, non-secret (values in `.env.example`):

| Var | Value | Notes |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_MEASUREMENT_ID` | from `.env.example` | turns on Auth/Firestore/Analytics |
| `VITE_API_BASE` | `/api` (default) | leave as-is — each host proxies `/api/*` to Firebase |
| `VITE_SITE_URL` | `https://flygaca.com` | canonical origin for sitemap/SEO |
| `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` | (optional) | App Check; also enforce on the Functions |
| `VITE_FIREBASE_EMULATOR` | **unset** | never set in production |

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
`firestore.rules` on every push to `main`, and on demand via Actions → **Deploy** → *Run
workflow*. It authenticates with a service account — add the JSON key as the repo secret
**`FIREBASE_SERVICE_ACCOUNT`** (Firebase console → Project Settings → Service accounts →
*Generate new private key*). Optionally add **`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`** to enable
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

## Vercel (mirror) — `vercel login` first

```bash
npm i -g vercel
vercel link            # link to the Vercel project (first time)
vercel deploy --prod   # uses vercel.json (build + rewrites + headers)
```
Config: `vercel.json` (proxies `/api/(.*)` → Firebase, SPA fallback, mirrored headers/CSP).

## Cloudflare Pages (mirror) — `wrangler login` first

```bash
npm i -g wrangler
npm run build
npx wrangler pages deploy dist --project-name flygaca-app
```
Config: `wrangler.toml`, `functions/api/[[path]].ts` (proxies `/api/*` → Firebase, preserves SSE),
`public/_redirects` (SPA fallback) and `public/_headers` (headers/CSP) — both copied into `dist/`.

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
