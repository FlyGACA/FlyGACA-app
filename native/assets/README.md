# Per-flavor app art

Source art for the standalone prep apps lives here — outside the generated
`ios/` project so it survives regeneration. One folder per flavor id (the ids
in `src/flavors/registry.ts`):

```
native/assets/
  elp/          icon.png · splash.png · splash-dark.png
  ppl-exam/     …
  conversion/   …
  medical/      …
  aip/          …
```

- **icon.png** — 1024×1024, **no alpha** (the App Store icon rejects
  transparency). Same Falcon mark, one accent variation per flavor so the suite
  reads as a family but each listing is distinct (Apple 4.3 — see
  `docs/STORE-SUITE.md`).
- **splash.png / splash-dark.png** — 2732×2732, artwork centred in the middle
  ~1200px (Capacitor crops to every device), background `#0A0E12`.

`npm run flavor:ios -- <id>` runs `@capacitor/assets` against the flavor's
folder after generating `ios/`. Missing art only warns — the build keeps the
Capacitor placeholder so TestFlight iteration isn't blocked — but real art must
land before an App Store submission.
