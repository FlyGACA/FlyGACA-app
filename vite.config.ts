import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/  (test config lives in vitest.config.ts)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/favicon.ico', 'img/flygaca-mark.png'],
      manifest: {
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
        icons: [
          { src: 'img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // The regulatory JSON corpus is large; precache the app shell only and
        // serve data with a network-first runtime strategy so it stays fresh
        // but remains available offline (mirrors the old freshness-aware sw.js).
        globPatterns: ['**/*.{js,css,woff2,png,svg,ico}', 'index.html'],
        globIgnores: ['**/data/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'flygaca-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
