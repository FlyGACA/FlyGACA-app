import { test, expect } from '@playwright/test';

test('crosswind calculator computes from the worked example', async ({ page }) => {
  await page.goto('/tools/crosswind');
  await page.getByRole('button', { name: 'Try an example' }).click();
  // The outputs list switches from em-dashes to knot values once inputs resolve.
  await expect(page.locator('dd', { hasText: 'kt' }).first()).toBeVisible();
});

test('library full-text search finds passages and links into the reader', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('searchbox').first().fill('medical');
  await expect(page.getByRole('heading', { name: 'In-text matches' })).toBeVisible();

  const firstHit = page
    .locator('a[href*="/library/"]')
    .filter({ hasText: /medical/i })
    .first();
  await firstHit.click();
  await expect(page).toHaveURL(/\/library\//);
  await expect(page.locator('h1').first()).toBeVisible();
});

test('language toggle flips the document to Arabic / RTL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch language' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('chat degrades gracefully when the backend is not connected', async ({ page }) => {
  await page.goto('/chat');
  await page.getByRole('textbox').first().fill('What is GACAR Part 91?');
  await page.getByRole('button', { name: 'Send' }).click();
  // No backend in the preview build → the assistant returns the not-ready notice.
  await expect(page.getByText(/backend isn't connected/i)).toBeVisible();
});
