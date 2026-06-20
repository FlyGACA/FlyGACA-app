import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Kept separate from vite.config.ts so the app build does not depend on the
// Vitest toolchain.
export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
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
