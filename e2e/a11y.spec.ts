import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** No serious/critical accessibility violations on the highest-traffic pages. */
const PAGES = [
  '/',
  '/tools/crosswind',
  '/library',
  '/chat',
  '/pricing',
  '/account',
  '/library/charts',
  '/study/sheets',
];

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

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
