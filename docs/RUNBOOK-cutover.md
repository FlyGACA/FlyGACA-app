# RUNBOOK — cutover (parity-first)

How the modern app (`gacafly/FlyGACA-app`) replaces the legacy PWA at flygaca.com. Cutover is
**parity-first**: ship only once the parity checklist passes and a preview channel has been smoke-
tested. Firebase Hosting is the host; the legacy site stays as the rollback.

## 1. Parity checklist (must all hold)

- [ ] All routes resolve (smoke spec green): tools hub + **54 live tools**, library (regulations /
      reference / handbooks) + reader + full-text search + **VFR charts**, study (quiz · flashcards ·
      groundschool · exam · paths · packs · **sheets**), guides, account/dashboard/logbook/settings,
      pricing, schools, about, legal.
- [ ] **Bilingual + RTL**: `npm run test` (i18n parity) green; language toggle flips `<html dir/lang>`.
- [ ] **Disclaimer** present site-wide (Footer on every page; CalcShell on every tool; explicit on
      library/chat/charts/sheets). No fabricated GACAR figures (reg-lookup tools + met-brief link out
      to official sources, never invent values).
- [ ] CI green: `build` (typecheck · lint · format · test · build · **bundle budget**) + `e2e·a11y`.
- [ ] Bundle budget holds (`npm run check:bundle`); Leaflet/firebase stay lazy.
- [ ] `sitemap.xml` + `robots.txt` regenerate at build; canonical + hreflang present per route.

## 2. Production config (the secret flip)

Set in the host build env (public, non-secret) — see `RUNBOOK-firebase.md`:

- [ ] `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` /
      `VITE_FIREBASE_APP_ID`
- [ ] `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` (App Check) — then **enforce App Check** on the Functions
- [ ] `VITE_SITE_URL=https://flygaca.com` (canonical/sitemap origin)
- [ ] Stripe price IDs configured in the `createCheckoutSession` Function; Stripe in live mode
- [ ] Leave `VITE_FIREBASE_EMULATOR` unset
- [ ] `firebase deploy --only firestore:rules` (`npm run deploy:rules`)

Native (iOS) IAP via RevenueCat is wired when the `@revenuecat/purchases-capacitor` plugin is added
to the shell (see `RUNBOOK-native.md`); not required for the web cutover.

## 3. Preview channel → prod smoke

```bash
npm run build
firebase hosting:channel:deploy cutover --expires 7d   # preview URL, not production
```

On the preview URL, manually verify: home loads; a tool computes; library search → reader; charts
pan/zoom; a study sheet opens; chat degrades gracefully (or streams once the backend is reachable);
sign-in (Google + email) and a logbook round-trip against the real project; Pro checkout reaches
Stripe; EN⇄AR/RTL; Lighthouse pass on home + a tool + library.

## 4. Cutover + rollback

```bash
firebase deploy --only hosting           # publish to the live Firebase site
# point the flygaca.com DNS / domain mapping at Firebase Hosting
```

- **Rollback:** repoint DNS to the legacy host (Cloudflare Worker) — it is unchanged and stays live
  throughout. Firebase Hosting also keeps prior releases (`firebase hosting:rollback`).
- Post-cutover: watch error rates + `/api/chat` latency; confirm `sitemap.xml` is reachable and
  submit it to Search Console.

## Done-when

Parity checklist ✅ · preview smoke ✅ · secret flip ✅ · DNS switched · legacy retained for rollback.
