import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app build does not depend on the
// Vitest toolchain. Tests are pure (calc + i18n) and render no components, so
// no Vite plugins are needed here.
export default defineConfig({
  test: {
    // Unit tests live in tests/; the Playwright E2E specs in e2e/ run under a
    // separate runner, so keep Vitest from trying to execute them.
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
  },
});
