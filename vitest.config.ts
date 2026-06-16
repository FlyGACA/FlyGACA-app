import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the app build does not depend on the
// Vitest toolchain. Tests are pure (calc + i18n) and render no components, so
// no Vite plugins are needed here.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
  },
});
