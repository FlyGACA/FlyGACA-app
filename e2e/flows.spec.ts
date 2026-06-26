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
  // Chat now requires a signed-in user; seed a local (Firebase-off) session so the composer renders.
  await page.addInitScript(() => localStorage.setItem('flygaca:session', 'pilot@example.com'));
  await page.goto('/chat');
  await page.getByRole('textbox').first().fill('What is GACAR Part 91?');
  await page.getByRole('button', { name: 'Send' }).click();
  // No backend in the preview build → the assistant returns the not-ready notice.
  await expect(page.getByText(/backend isn't connected/i)).toBeVisible();
});

test('chat renders a streamed answer, grounding badge and source', async ({ page }) => {
  // Mock the SSE endpoint with a token stream + a grounded final event.
  await page.route('**/api/chat**', async (route) => {
    const body =
      'data: {"type":"token","delta":"VFR minima "}\n' +
      'data: {"type":"token","delta":"apply here."}\n' +
      'data: {"type":"final","answer":"VFR minima apply here.","kind":"grounded",' +
      '"sources":[{"citation":"§91.155","url":"/library/part-91#sec-91-155",' +
      '"verbatim":"Minimum flight visibility…"}]}\n' +
      'data: [DONE]\n';
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });
  await page.addInitScript(() => localStorage.setItem('flygaca:session', 'pilot@example.com'));
  await page.goto('/chat');
  await page.getByRole('textbox').first().fill('VFR minima?');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('VFR minima apply here.')).toBeVisible();
  // Scope to the grounding badge — the PWA "offline ready" toast is also role=status.
  await expect(page.getByRole('status').filter({ hasText: 'Grounded' })).toBeVisible();
  // `exact` so this matches the source citation, not the "Show the exact text of §91.155" follow-up.
  await expect(page.getByText('§91.155', { exact: true })).toBeVisible();
});

test('account local sign-in and sign-out round-trip', async ({ page }) => {
  await page.goto('/account');
  await page.getByLabel('Email').fill('pilot@example.com');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Signed-in view exposes a sign-out control.
  const signOut = page.getByRole('button', { name: 'Sign out' });
  await expect(signOut).toBeVisible();
  await signOut.click();
  // Back to the sign-in form.
  await expect(page.getByLabel('Email')).toBeVisible();
});

test('pricing Go-Pro stays disabled when billing is not configured', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('button', { name: 'Go Pro' })).toBeDisabled();
});

test('VFR charts render a Leaflet image overlay', async ({ page }) => {
  await page.goto('/library/charts');
  await expect(page.locator('h1').first()).toBeVisible();
  // The lazy Leaflet map mounts and lays an image overlay for the active sheet.
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('img.leaflet-image-layer').first()).toBeVisible();
});

test('study sheets embed a PDF', async ({ page }) => {
  await page.goto('/study/sheets');
  await expect(page.locator('h1').first()).toBeVisible();
  const embed = page.locator('iframe[class*="embed"]');
  await expect(embed).toHaveAttribute('src', /\.pdf$/);
});

test('met-brief builds official-source links for a route', async ({ page }) => {
  await page.goto('/tools/met-brief');
  await page.getByRole('textbox').first().fill('OERK OEJN');
  await expect(page.getByText('OERK', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /METAR/ }).first()).toBeVisible();
});
