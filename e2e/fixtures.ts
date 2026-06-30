import { test as base, expect } from '@playwright/test';

/**
 * Shared E2E fixture. Seeds `flygaca:onboarding-seen` before any page script
 * runs so the first-run welcome tour stays dismissed and the suite exercises
 * the steady-state app — otherwise the tour's modal scrim intercepts pointer
 * events on a fresh visit to `/`. The tour itself is covered by unit tests
 * (tests/onboarding-tour.test.tsx).
 *
 * The seeded value must match TOUR_VERSION in src/lib/onboardingPrefs.ts; bump
 * both together if the tour is versioned up.
 */
// `provide` is Playwright's fixture-value callback (positional — renamed from
// the usual `use` so the react-hooks lint rule doesn't mistake it for a hook).
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('flygaca:onboarding-seen', '1');
      } catch {
        /* storage unavailable — ignore */
      }
    });
    await provide(context);
  },
});

export { expect };
