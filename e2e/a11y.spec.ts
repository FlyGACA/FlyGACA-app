import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** No serious/critical accessibility violations on the highest-traffic pages. */
const PAGES = [
  '/',
  '/tools/crosswind',
  '/library',
  '/library/part-1',
  '/chat',
  '/pricing',
  '/account',
  '/library/charts',
  '/study/sheets',
];

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    // Scan the settled page: the app disables entrance animations under
    // reduced-motion (stagger-grid children → opacity:1), so axe never samples
    // a card mid-fade — which would otherwise report transient low contrast.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    // Audit the resting UI, not a transient animation frame. The stagger-grid
    // entry fade-up briefly lowers card opacity, which axe catches as a
    // color-contrast failure mid-fade. Force the settled state (mirrors the
    // app's own prefers-reduced-motion rules) so the audit is deterministic.
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation:none!important;transition:none!important}.stagger-grid>*,.page-enter{opacity:1!important;translate:none!important}',
    });
    await expect(page.locator('h1').first()).toBeVisible();

    // The reader injects a very large (~500 KB) regulation document; auditing the
    // whole DOM times out axe. Audit the reader's own chrome and skip the
    // sanitized third-party body (its .content styles are verified separately).
    const isReader = path.startsWith('/library/part');
    if (isReader) test.slow();
    const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    if (isReader) builder.exclude('[data-testid="reader-body"]');
    const results = await builder.analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      serious,
      JSON.stringify(
        serious.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        null,
        2,
      ),
    ).toEqual([]);
  });
}

/**
 * The command palette is a modal the static page scan can't reach. Open it from
 * the header and audit the live dialog so the new keyboard surface is covered.
 */
test('a11y: command palette (open dialog)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation:none!important;transition:none!important}.stagger-grid>*,.page-enter{opacity:1!important;translate:none!important}',
  });
  await page.getByLabel('Search Fly GACA').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious,
    JSON.stringify(
      serious.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      null,
      2,
    ),
  ).toEqual([]);
});
