# FlyGACA iOS App Screenshot Guide

> **Moved.** The native iOS apps — and their screenshot pipeline — now live in the separate
> [`ay2m/FlyGACA`](https://github.com/ay2m/FlyGACA) repo (the monorepo's `apple/` tree was retired
> 2026-08). This monorepo no longer carries the capture scripts, the XCUITest flow, or the
> `npm run screenshots:*` / `npm run ios:generate` commands this guide used to describe.

To capture or regenerate App Store screenshots, work in `ay2m/FlyGACA`:

- **Mac-free HTML mockups** — `apple/Scripts/html-render/` (`node apple/Scripts/html-render/render.js`,
  and `render-landscape.js`), rendered with Playwright + Chromium from each app's real bundled
  content. See that folder's `README.md`.
- **Pixel-exact simulator captures** (needs a Mac + Xcode) — `apple/Scripts/capture-screenshots.sh`
  + `process-screenshots.sh`, with the intended XCUITest flow documented in
  `apple/AppleTests/ScreenshotTests.swift`.
- **The shipped store screenshots** live per-app in the App Store metadata repos
  (`FlyGACA/ELPT`, `FlyGACA/AIP`, plus the parked `FlyGACA/PPL` · `CPL` · `IR` · `ATPL`), under
  `appstore/screenshots/`.

The committed images under [`archive/screenshots/`](./archive/screenshots/) here are a point-in-time
snapshot from before the split; see [`archive/screenshots/README.md`](./archive/screenshots/README.md).
