import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { bootI18n } from './i18n';
import './styles/tokens.css';
import './styles/global.css';
import './styles/native.css';
import { router } from './router';
import { initNative } from './lib/native-bridge';
import { captureReferral } from './lib/share';
import { initAnalytics } from './lib/analytics';
import { canonicalRedirect, isMirrorHost } from './lib/seo';
import { applyTheme, readTheme } from './lib/theme';

// Reflect the persisted theme on <html> before first paint. The inline script in
// index.html already does this for the cockpit case to avoid a colour flash; this
// is the canonical, belt-and-suspenders application (and restores Falcon cleanly).
applyTheme(readTheme());

// Mirror/preview fronts (*.web.app, *.vercel.app, *.netlify.app, *.pages.dev)
// serve the same build for redundancy but must not be indexed as duplicates of
// flygaca.com. Emit noindex (still follow links so equity flows to the canonical).
// Host-conditional at runtime, so flygaca.com and the prerender host stay
// indexable. Belt-and-suspenders to the static X-Robots-Tag headers on the mirrors.
if (isMirrorHost(window.location.hostname)) {
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, follow';
  document.head.appendChild(robots);
}

// A duplicate host (e.g. captadel.com) serves this same build — fold it straight
// onto the canonical origin, preserving the path, before booting anything. This
// is the host-agnostic safety net; an edge 301 (vercel.json) handles it sooner
// where the duplicate is served by Vercel.
const redirectTo = canonicalRedirect(window.location);
if (redirectTo) {
  window.location.replace(redirectTo);
} else {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element #root not found');

  // Capture an inbound ?ref= (from a shared link), stash it, and strip it from
  // the URL before the router reads the location — keeps the canonical clean.
  captureReferral();

  // Load only the active language's strings before the first render — no flash of
  // untranslated keys, and the other language stays off the boot path.
  void bootI18n().then(() => {
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });

  // Native shell bootstrap (no-op on the web). Deep links route through the
  // same data router the rest of the app uses.
  void initNative({ onDeepLink: (path) => void router.navigate(path) });

  // Web product analytics + Core Web Vitals. No-op in the native shell and in
  // dev/test — see lib/analytics.ts.
  initAnalytics();
}
