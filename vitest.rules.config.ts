import { defineConfig } from 'vitest/config';

// Firestore security-rules tests. These talk to the Firestore emulator over the
// network, so they run in a node environment with no jsdom/i18n setup and are
// kept out of the default `npm run test` suite (which has no emulator). Launch
// with `npm run test:rules`, which wraps this in `firebase emulators:exec`.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.{test,spec}.ts'],
    environment: 'node',
    globals: true,
    // The emulator boot + rules round-trips are slower than a pure unit test.
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
