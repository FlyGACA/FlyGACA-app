/**
 * Cloudflare Pages Function — proxies `/api/*` to the Firebase-hosted Fly GACA
 * gateway. The browser only ever sees a same-origin `/api` request, so chat /
 * content work on the Cloudflare front with no CORS and no CSP change
 * (`connect-src 'self'` stays valid). Method, headers (incl. the Firebase
 * `Authorization` token), body, and the response stream (SSE) pass through.
 *
 * NOTE: This `functions/` directory is for Cloudflare Pages ONLY. It is NOT the
 * Firebase Cloud Functions — those (`chat`, `protectedContent`) live in the
 * separate `flygaca/flygaca` backend repo and are deployed on the Firebase
 * project. See docs/RUNBOOK-deploy.md.
 */

/** The canonical Firebase Hosting origin that fronts the Cloud Functions gateway. */
const API_ORIGIN = 'https://flygaca-app.web.app';

/** Minimal shape of the Cloudflare Pages Function context we rely on. */
interface PagesContext {
  request: Request;
  params: { path?: string | string[] };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, params } = context;
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '');
  const { search } = new URL(request.url);
  const target = `${API_ORIGIN}/api/${path}${search}`;
  // Re-issue the request at the Firebase origin, preserving method/headers/body;
  // returning the fetch response streams it back unchanged (preserves SSE).
  return fetch(new Request(target, request));
}
