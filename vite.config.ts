import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Inject search-engine ownership-verification <meta> tags into the initial HTML,
 * but only when the matching token env var is set — so the shipped index.html
 * stays clean for forks/previews that don't own the Search Console property.
 */
function verificationMeta(env: Record<string, string>): Plugin {
  const tags = [
    ['google-site-verification', env.VITE_GSC_TOKEN],
    ['msvalidate.01', env.VITE_BING_TOKEN],
  ]
    .filter(([, token]) => token)
    .map(([name, token]) => `    <meta name="${name}" content="${token}" />`)
    .join('\n');
  return {
    name: 'flygaca-verification-meta',
    transformIndexHtml(html) {
      return tags ? html.replace('</head>', `${tags}\n  </head>`) : html;
    },
  };
}

// https://vite.dev/config/  (test config lives in vitest.config.ts)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split the stable framework libraries into their own long-cached
          // chunks so the app chunk stays lean and a release only busts the
          // app bundle, not React/router/i18n.
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-i18n': ['i18next', 'react-i18next'],
            // framer-motion is intentionally NOT a manual chunk: it is only reached
            // through the lazily-imported home dashboard, so leaving it un-pinned lets
            // Rollup fold it into that async chunk and keep it off the initial path.
          },
        },
      },
    },
    plugins: [
      react(),
      verificationMeta(env),
      VitePWA({
        // 'prompt' so a waiting service worker surfaces an in-app "reload to update"
        // toast (see src/components/pwa/PwaPrompts) instead of swapping silently.
        registerType: 'prompt',
        includeAssets: ['img/favicon.ico', 'img/flygaca-mark.png'],
        manifest: {
          id: '/',
          name: 'Fly GACA — Saudi Aviation Library',
          short_name: 'Fly GACA',
          description:
            "A fast, free reference library of Saudi civil-aviation regulations (GACAR) for the Kingdom's pilots, instructors and cadets.",
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#0A0E12',
          theme_color: '#0A0E12',
          lang: 'en',
          dir: 'ltr',
          categories: ['education', 'reference', 'travel'],
          icons: [
            {
              src: 'img/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'img/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Library',
              url: '/library',
              icons: [{ src: 'img/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Captain Adel',
              url: '/chat',
              icons: [{ src: 'img/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Flight tools',
              url: '/tools',
              icons: [{ src: 'img/icon-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          // The regulatory JSON corpus is large; precache the app shell only and
          // serve data with a network-first runtime strategy so it stays fresh
          // but remains available offline (mirrors the old freshness-aware sw.js).
          globPatterns: ['**/*.{js,css,woff2,png,svg,ico,webp}', 'index.html'],
          globIgnores: ['**/data/**'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Offline navigations to deep client routes (e.g. /library/...) resolve
          // to the precached SPA shell; /api and /data are excluded so the proxy
          // and the network-first data rules below keep handling them.
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/data\//],
          // Purge superseded precaches from earlier releases on activate.
          cleanupOutdatedCaches: true,
          // Two-tier network-first data cache (first match wins). Both stay
          // network-first so online reads are always freshest; the split keeps the
          // few very large/volatile files (the ~19 MB search index, the ~21 MB
          // worldwide airports set, chart JPGs) in their own bounded cache so they
          // can't evict the regulatory docs a pilot explicitly saved for offline.
          runtimeCaching: [
            {
              // Rule A — heavy/volatile assets, isolated so they don't crowd out
              // the regulatory corpus or blow the storage quota.
              urlPattern: ({ url }) =>
                /^\/data\/(library-search\.json|airports(-extra)?\.json|charts\/)/.test(
                  url.pathname,
                ),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'flygaca-data-heavy',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Rule B — the regulatory corpus: Parts/library/ebook HTML plus the
              // small JSON indexes. Shares the `flygaca-data` cache that
              // offlineCache.saveDoc warms, so explicitly-saved docs, auto-cached
              // bookmarks and incidentally-fetched pages all live together. The
              // entry ceiling is high enough for all 74 GACAR Parts + their index
              // + bookmarks without LRU-evicting a saved doc.
              urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'flygaca-data',
                // Fall back to cache quickly when offline/slow instead of hanging.
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 350, maxAgeSeconds: 60 * 60 * 24 * 30 },
                // Only cache successful (or opaque) responses, never errors.
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  };
});
