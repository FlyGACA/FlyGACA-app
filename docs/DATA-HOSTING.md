# Serving the `/data` corpus off Firebase Hosting

The regulatory corpus under `public/data` is ~130 MB (`airports-extra.json` 21 MB,
`library-search.json` 19 MB, the `library/` reference HTML 40 MB, `charts/` 15 MB,
`ebooks/` 11 MB, `parts/` 7 MB, …). Firebase Hosting stores this in **every release**, so a
burst of deploys can exhaust the Hosting storage quota (`HTTP 429 … exceeded the Hosting storage
quota`). Serving the corpus from a bucket keeps each Hosting release ~12 MB.

## How the app finds the corpus

Every `/data/*` fetch and asset URL funnels through **`dataUrl()`** in `src/lib/content.ts`:

```
const DATA_BASE = import.meta.env.VITE_DATA_BASE_URL ?? '/data';
export const dataUrl = (p) => (p.startsWith('/data/') ? DATA_BASE + p.slice('/data'.length) : p);
```

Applied at the four fetch/asset points — `fetchJson` (all JSON), `useFetchText` (reader HTML),
`chartSrc` (chart images), and `offlineCache.saveDoc/removeDoc` (offline cache keys). Call sites
keep their `'/data/...'` literals unchanged. When `VITE_DATA_BASE_URL` is unset the corpus is
fetched same-origin from `/data` exactly as before.

## Cutover (owner steps)

1. **Create a public bucket** in the `flygaca-app` project, e.g. `gs://flygaca-data`.
   - Grant `roles/storage.objectViewer` to `allUsers` on the bucket (public read).
   - Set **CORS** allowing the app origin:
     ```json
     [
       {
         "origin": ["https://flygaca.com"],
         "method": ["GET"],
         "responseHeader": ["*"],
         "maxAgeSeconds": 3600
       }
     ]
     ```
   - Confirm the deploy service account (`FIREBASE_SERVICE_ACCOUNT`) has
     `roles/storage.objectAdmin` on the bucket (the `Offload data corpus` step authenticates with it).
2. **Set two repo variables** (Settings → Secrets and variables → Actions → Variables):
   - `DATA_BASE_URL` = `https://storage.googleapis.com/flygaca-data/data` (public read URL; the
     build inlines it as `VITE_DATA_BASE_URL`).
   - `DATA_BUCKET` = `gs://flygaca-data` (rsync target for the `Offload data corpus` step).
3. **Deploy** (`deploy.yml`). With both vars set, CI mirrors `public/data` → the bucket, strips
   `dist/data` from the Hosting release, and the built app fetches the corpus from the bucket. The
   Hosting release drops from ~141 MB to ~12 MB.

Already in place, no action needed:

- CSP `img-src` includes `storage.googleapis.com` / `firebasestorage.googleapis.com` (chart
  images); `connect-src` already allows `*.googleapis.com` (JSON/HTML fetches).
- The service-worker `NetworkFirst` rules match `/data/` anywhere in the path, so offline caching
  works whether the corpus is same-origin or on the bucket.
- `rag-chunks.json` (RAG-backend-only, never fetched by the app) is excluded from the Hosting
  release via `firebase.json` `ignore`.

## Alternative host

Any public object store works — point `DATA_BASE_URL` at it and adjust the `Offload data corpus`
step (e.g. Cloudflare R2 via `wrangler r2`, since the app already deploys a Cloudflare mirror). Add
its origin to the CSP `img-src`/`connect-src` if it isn't a `*.googleapis.com` host.
