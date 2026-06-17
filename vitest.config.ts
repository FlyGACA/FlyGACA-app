import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app build does not depend on the
// Vitest toolchain. The React plugin is unused here — the component tests we do
// run (Disclaimer, CalcShell, …) compile fine under the default esbuild JSX.
export default defineConfig({
  test: {
    // Unit tests live in tests/; the Playwright E2E specs in e2e/ run under a
    // separate runner, so keep Vitest from trying to execute them.
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    coverage: {
      // Opt-in via `npm run test:coverage`; reports only, no failing gate.
      provider: 'v8',
      reporter: ['text', 'html'],
      // Focus on the unit-testable layers. Pages and app chrome are exercised
      // by the Playwright E2E suite, not here.
      include: ['src/calc/**', 'src/lib/**', 'src/components/**'],
    },
  },
});
