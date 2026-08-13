import { test, expect } from './fixtures';

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
  // Match on the accessible name only, not the role: LangToggle is now a real
  // <a hrefLang> that navigates to the /ar URL (it used to be a <button>), so
  // getByRole('button') matches nothing. getByLabel survives that change and
  // any future one, because aria-label is what the control actually promises.
  await page.getByLabel('Switch language').first().click();
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

test('account session round-trip: signed-in view and sign-out', async ({ page }) => {
  // This suite runs `vite preview` over dist/, i.e. a *production* bundle, and
  // CI has no Firebase config. AccountSignedOut picks its card accordingly:
  //   isAuthAvailable() ? <FirebaseSignIn/> : import.meta.env.DEV ? <LocalSignIn/> : <AuthUnavailable/>
  // so the local email form — which this test used to fill — exists only in a dev
  // server and can never render here. Seed the session directly instead (the same
  // affordance the chat spec uses) and assert what production actually ships.
  await page.addInitScript(() => localStorage.setItem('flygaca:session', 'pilot@example.com'));
  await page.goto('/account');
  const signOut = page.getByRole('button', { name: 'Sign out' });
  await expect(signOut).toBeVisible();
  await signOut.click();
  // Signed out in a config-less production build → the explicit "unavailable"
  // notice, never a fake sign-in form that would imply a session it can't create.
  await expect(page.getByText(/Sign-in is temporarily unavailable/i)).toBeVisible();
});

test('pricing Go-Pro stays disabled when billing is not configured', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('button', { name: 'Go Pro' })).toBeDisabled();
  // The exam-prep band routes to the storefront.
  await expect(page.getByRole('link', { name: 'Browse exam prep' })).toBeVisible();
});

test('exam-prep storefront lists certificate & subject packs with prices', async ({ page }) => {
  await page.goto('/study/packs');
  await expect(page.getByRole('heading', { name: 'Exam Prep' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Certificates & ratings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Subject packs' })).toBeVisible();
  // A paid pack is locked (pack access ignores the FREE_FOR_EVERYONE promo) and shows its price.
  // Assert the shape of the price, not a specific amount: this previously pinned
  // "SAR 39", the pack moved to SAR 49, and the stale assertion sat undetected
  // while CI was disabled. What the storefront must guarantee is that a locked
  // pack advertises a one-time price at all.
  const medical = page.getByRole('link', { name: /Aviation medical/ });
  await expect(medical).toContainText(/SAR\s*\d+\s*·\s*one-time/);
});

test('the checkout route mounts and fails closed when billing is not configured', async ({
  page,
}) => {
  // Firebase/Moyasar are unconfigured in the preview build, so getReadyAuth resolves
  // null and checkout must say so rather than render a dead form or throw. The point
  // of the assertion is that /checkout is reachable and self-explanatory at all: this
  // route had no test of any kind while both of its auth reads were racing the SDK.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/checkout?kind=pass');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText("Billing isn't connected in this build.");
  expect(errors).toEqual([]);
});

test('the checkout return leg reports rather than silently failing', async ({ page }) => {
  // The post-payment leg with no backend: it must still resolve to a message, never
  // sit on "Confirming your payment…" forever — that spinner in front of a real buyer
  // is the worst state this page can be in.
  await page.goto('/checkout/return?id=pay_test');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Confirming your payment…')).toBeHidden();
});

test('a paid pack page offers Buy but disables it when billing is off', async ({ page }) => {
  await page.goto('/study/packs/medical');
  // Firebase/Moyasar unconfigured in the preview → the buy button is the disabled placeholder.
  await expect(page.getByRole('button', { name: 'Available at launch' })).toBeDisabled();
});

test('the free sampler pack opens and its timed exam runs', async ({ page }) => {
  await page.goto('/study/packs/airspace-vfr');
  await expect(page.getByRole('link', { name: 'Start pack quiz' })).toBeVisible();
  // The per-pack timed exam is a free surface for this pack.
  await page.goto('/study/exam?pack=airspace-vfr');
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
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
