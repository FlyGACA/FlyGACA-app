import { test, expect } from '@playwright/test';

/** Every key route loads, renders a heading, and sets its own document title. */
const ROUTES = [
  '/',
  '/tools',
  '/tools/crosswind',
  '/tools/e6b',
  '/library',
  '/library/part-1',
  '/library/reference/ac-68-1-basicmed',
  '/library/handbook/surveillance',
  '/chat',
  '/study',
  '/guides',
  '/guides/saudi-ppl-requirements',
  '/pricing',
  '/schools',
  '/about',
  '/disclaimer',
  '/terms',
  '/privacy',
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
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('the disclaimer is present on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/not affiliated with/i).first()).toBeVisible();
});
