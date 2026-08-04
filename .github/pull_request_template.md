<!--
Thanks for contributing to Fly GACA! Fill in the sections below.
Keep the structure — it mirrors how changes are described and reviewed here.
Delete this comment before submitting.
-->

## What & why

<!-- What does this change do, and why? Link the ROADMAP / SEO-PLAN item or issue it closes. -->

## Changes

<!-- Bullet the concrete changes. Note new files, new i18n keys, new tests. -->

-

## Verification

<!-- Paste the result of `npm run verify` (and the `functions/` gate if you touched functions/). -->

- [ ] `npm run verify` is green (typecheck · lint · format:check · test · build · check:bundle · check:perf)
- [ ] Touched `functions/`? Ran `npm run lint && npm test && npm run build` inside `functions/`
- [ ] New user-facing copy has a key in **both** `src/i18n/en.json` and `ar.json` (i18n parity holds)
- [ ] CSS uses design tokens + logical properties only — no hard-coded colours, no physical `left`/`right`
- [ ] The not-affiliated / verify-against-GACA disclaimer is unchanged (used `<Disclaimer />`, not reworded)
- [ ] No build output committed (`dist/`, `public/sitemap.xml`, `public/robots.txt` stay generated)

<!--
Any red CI check that is a known infra limit (e.g. the Firebase Hosting
preview-channel quota) and unrelated to this diff — call it out here.
-->
