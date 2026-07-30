# Fly GACA — Figma Design System (build handoff)

This folder contains runnable **Figma Plugin API** scripts to finish building the
Fly GACA design-system library, plus this status guide.

- **Figma file:** Fly GACA — Design System
- **URL:** https://www.figma.com/design/SDfpLhiA1eLEhXxD2KB7Ij
- **Run ID (state tag):** `flygaca-ds-20260624`
- **Source of truth:** `src/styles/tokens.css`, `src/styles/global.css`, components in `src/components`/`src/app`.

## Why scripts instead of the live MCP build

The Figma **Starter** plan caps the MCP server at **~6 tool calls per month** (it
applies even to a Full seat). The foundations below were created over those calls; the
budget is now spent for the month. The **Plugin API itself is free to run inside Figma**,
so the rest of the build is delivered as scripts you run yourself — no MCP limit.

### How to run a script (free)

1. Open the file in the Figma desktop or web app.
2. Install **Scripter** (Figma Community plugin) — it runs Plugin API JavaScript.
3. Paste a script file's contents into Scripter and press **Run**.

All scripts are **idempotent** (they skip anything already present), so re-running is safe.
*(Alternative: paste a script into the MCP `use_figma` tool — but that spends your monthly
budget. To do so, strip the `(async () => { … })();` wrapper and add `return summary;`.)*

## Status

### ✅ Done (live in the file — created via MCP, persisted)

| Collection | Mode | Variables |
|---|---|---|
| Primitives | Value | 28 raw colors — full Falcon palette + ivory/ink/moon/neon/bento |
| Color | Dark | 34 semantic — bg/surface/border*/brand*/link/accent*/gold/success/warning/danger/error/focus/text·*/cat·1-5/neon·*/text·on-brand/brand-tint*/·-bg tints/sheen-top |
| Spacing | Value | 10 — `space/1`…`space/16` (4→128px), scope GAP |
| Radius | Value | 5 — `radius/sm,md,lg,xl,pill`, scope CORNER_RADIUS |
| Typography | Value | (created empty — filled by script 01) |

All variables carry WEB code syntax (`var(--token)`) and targeted scopes; semantics alias
primitives (single Dark mode per Starter's 1-mode limit).

### ▶ Run next — `01-finish-foundations.js`

Adds the rest of Phase 1: **Typography variables** (families, weights, sizes 8, line-heights 3),
**9 effect styles** (`shadow/sm,card,pop,1,2,3` + `clay/base,hover,press`), **7 paint styles**
(`gradient/brand,wing,stroke` + `glow/teal,sage,neon-green,neon-cyan`), and **10 text styles**
(`Display,H1,H2,H3,Body-Lg,Body,Small,XS,Mono/Label,Mono/Value`).

Font fallbacks baked in (this account's fonts): Readex Pro has no Black(800) → **Bold**;
JetBrains Mono has no SemiBold(600) → **Medium**.

### ▶ Then — `02-core-components.js`

Reference component sets that bind to the variables/styles above and demonstrate the full
pattern (variant sets, variable-bound fills/strokes/padding/radius, effect + text styles):
**Button** (Style × State), **StatusPill** (5 tones), **ProgressBar**, **Disclaimer** (full/compact).
Treat these as the template; verify each visually after running.

### ⏳ Remaining components (same pattern, not yet scripted)

Atoms/molecules: form fields (Number/Select/Text), CaptainAvatar, SectionHeader, Breadcrumbs,
GroundingBadge, CrossRefChips, UpsellCard, BentoCard, SetupChecklist, Marquee, FlightDivider,
ScrollProgress, SyncedStamp, LangToggle, ExternalLink, CalcShell.
Organisms: Header (desktop nav + mobile dock + More sheet), Footer, Layout.

Plus Phase 2 (Cover/Getting-Started/Foundations doc pages + swatches/specimens) and Phase 4
(Code Connect mappings, a11y + naming + unresolved-binding audits, final screenshots).

> Ask Claude to generate any of these as additional scripts — they follow the `02-core-components.js`
> pattern. (Building them with live screenshot validation would need the MCP limit lifted, i.e. a
> Professional+ plan with a Full/Dev seat — which also unlocks multi-mode collections for a real Light theme.)

## Resume protocol (for a future MCP session)

1. Re-read `/tmp/dsb-state-flygaca-ds-20260624.json` (the state ledger).
2. Run a read-only `use_figma` that scans collections/variables/styles/pages by the
   `dsb`/`key` shared-plugin-data tags to rebuild the `{key → id}` map.
3. Continue from the first unbuilt item above.

## Mapping cheat-sheet (CSS token → Figma)

- Colors: `--falcon-*` etc. → `Primitives` (hidden); roles `--bg,--brand,--text,…` → `Color` (Dark).
- `--space-N` → `Spacing/space/N` (GAP). `--radius-*` → `Radius/radius/*` (CORNER_RADIUS).
- `--font-*`,`--fw-*`,`--fs-*`,`--lh-*` → `Typography` vars; composite type → text styles.
- `--shadow-*`,`--clay-shadow*` → effect styles. Gradients/glows → paint styles.
- Not bindable (documented only): `--z-*`, `--ease*`/`--dur*`/`--lift-hover`.
