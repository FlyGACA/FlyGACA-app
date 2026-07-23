import { defineConfig } from "vitest/config";

// Local config so the functions tests don't inherit the app's root vitest setup.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      // Opt-in via `npm run test:coverage` (a local ratchet, same as the app's root
      // vitest.config.ts — CI runs `npm test`, so run this before pushing).
      provider: "v8",
      reporter: ["text", "html"],
      // Measure the whole backend source, not just what the tests happen to import,
      // so an entirely-untested new module counts against coverage (same posture as
      // the app's root vitest.config.ts).
      all: true,
      include: ["src/**"],
      // `index.ts` is the deploy manifest (re-exports + trigger wiring), exercised by
      // the emulator/deploy, not unit tests — excluded like the app excludes its
      // build-only chrome.
      exclude: ["src/index.ts"],
      // A ratchet, not a target: set just below the current numbers so coverage can't
      // silently regress, while today's run passes. Raise as cover grows.
      // (`npm run test:coverage` prints the live figures.)
      thresholds: {
        statements: 66,
        branches: 66,
        functions: 77,
        lines: 67,
      },
    },
  },
});
