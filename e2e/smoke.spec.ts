import { test, expect } from '@playwright/test';

/** Every key route loads, renders a heading, and sets its own document title. */
const ROUTES = [
  '/',
  '/tools',
  '/tools/crosswind',
  '/tools/e6b',
  '/tools/met-brief',
  '/library',
  '/library/charts',
  '/library/part-1',
  '/library/reference/ac-68-1-basicmed',
  '/library/handbook/surveillance',
  '/chat',
  '/learn',
  '/study',
  '/study/sheets',
  '/guides',
  '/guides/saudi-ppl-requirements',
  '/pricing',
  '/schools',
  '/about',
  '/disclaimer',
  '/terms',
  '/privacy',
  '/safety',
];

for (const path of ROUTES) {
  test(`loads ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page).toHaveTitle(/Fly GACA/);
  });
}

test('unknown route renders the 404 page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByText('404')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'This page took a wrong turn' }),
  ).toBeVisible();
});

test('the disclaimer is present on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/not affiliated with/i).first()).toBeVisible();
});
