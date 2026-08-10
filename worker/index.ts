/**
 * Cloudflare Worker — the canonical production front for flygaca.com. Serves the
 * Fly GACA SPA from the bundled dist/ assets and proxies same-origin `/api/*`
 * requests to the Firebase-hosted gateway, so chat/content/webhooks work with no
 * CORS and no CSP change (`connect-src 'self'` stays valid). The Firebase Cloud
 * Functions (`chat`, `moyasarWebhook`) live in `functions/` and deploy separately.
 * See docs/RUNBOOK-deploy.md.
 *
 * Routing is driven by wrangler.toml: `run_worker_first = ["/api/*"]` guarantees
 * this Worker runs before the asset layer for `/api/*` (so the SPA fallback can
 * never swallow an API call), while every other path is served straight from the
 * static assets, with `not_found_handling = "single-page-application"` returning
 * index.html for client-side routes.
 *
 * Response headers for those asset responses — CSP, HSTS, cache-control, and the
 * crawl-file content types — come from `public/_headers`, applied by the asset
 * layer. This Worker deliberately does not restate them: it never runs for a
 * static path, so it *cannot* set them there, and widening `run_worker_first` to
 * catch them would bill an invocation on every image and JS chunk to duplicate a
 * string that already has three other copies to keep in sync.
 */

/** The canonical Firebase Hosting origin that fronts the Cloud Functions gateway. */
const API_ORIGIN = 'https://flygaca-app.web.app';

interface Env {
  /** Static-assets binding (configured under [assets] in wrangler.toml). */
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // Re-issue the request at the Firebase origin, preserving method, headers
      // (incl. the Firebase `Authorization` token, `X-Firebase-AppCheck`, and
      // Moyasar's `x-moyasar-signature`) and the RAW body — moyasarWebhook HMACs
      // the exact bytes it received (`verifyMoyasarSignature` in
      // functions/src/billing-core.ts), so nothing here may parse, re-encode or
      // buffer it. Returning the fetch response streams it back unchanged, which
      // is what preserves SSE framing on /api/chat.
      const proxied = new Request(`${API_ORIGIN}${url.pathname}${url.search}`, request);

      // The gateway's per-IP limiter and anonymous daily chat quota read the last
      // X-Forwarded-For hop — `app.set("trust proxy", 1)` in functions/src/gateway.ts
      // trusts exactly one. Interposing this Worker adds a hop, so without this the
      // trusted hop would be Cloudflare's egress IP: every visitor on earth would
      // share one 30 req/min bucket and one anonymous quota. Stamp the real client
      // IP so the Firebase edge appends its own hop after it.
      const clientIp = request.headers.get('CF-Connecting-IP');
      if (clientIp) proxied.headers.set('X-Forwarded-For', clientIp);

      try {
        return await fetch(proxied);
      } catch {
        return new Response('Bad gateway', { status: 502 });
      }
    }

    // Everything else: serve the static SPA assets (index.html fallback handled by
    // not_found_handling = "single-page-application"). `/.well-known/*` needs no
    // special case — it is an ordinary asset path, resolved before the fallback,
    // so the Apple Pay merchant-domain file is served byte-for-byte.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
