# Fly GACA — Figma / MCP Design System Rules

> Reference for integrating Figma designs into the FlyGACA codebase via the Model Context Protocol.
> Follow these rules when translating any Figma frame, component, or token into code.

---

## 1. Design Token Definitions

### Location
`src/styles/tokens.css` — the **single source of truth**. Never hard-code a colour, size, or shadow outside this file.

### Structure
All tokens are CSS Custom Properties on `:root`. There are no token transformation pipelines (no Style Dictionary, no Theo). Figma tokens must be mapped to the CSS variables below.

### Falcon Palette (Primitive Tokens)
```css
--falcon-night: #0a0e12   /* primary canvas */
--falcon-deep:  #0f1a24   /* elevated card on dark */
--falcon-mist:  #1a2a38   /* dividers / subtle borders */
--falcon-teal:  #2d6e8a   /* primary brand */
--teal-bright:  #4a9cb8   /* hover / links on dark */
--falcon-sage:  #8fc9a8   /* secondary accent / success */
--sage-bright:  #b5ddc2   /* highlight / focus ring */
--falcon-gold:  #c8a04a   /* heritage accent — use sparingly */
--falcon-clay:  #cf6b52   /* warm clay — caution / hold states */
--ivory:        #f5f2ed   /* light reading surface */
```

### Semantic Tokens (use these in components — never the primitives directly)
```css
/* Surfaces */
--bg, --surface, --surface-raised, --border, --border-bright

/* Text */
--text, --text-muted, --text-dim, --text-on-brand

/* Brand roles */
--brand, --brand-hover, --link, --accent, --accent-bright,
--gold, --success, --warning, --danger, --focus

/* Validation */
--color-error, --color-error-bg
--color-success, --color-success-bg
--color-warning, --color-warning-bg

/* Gradients (wordmark hairlines, CTAs) */
--grad-brand   /* teal → sage, 102deg */
--grad-wing    /* teal-bright → sage, 155deg */
```

### Typography Tokens
```css
/* Families */
--font-sans:  'Cairo', system-ui, …          /* UI / headings / Arabic */
--font-body:  'Atkinson Hyperlegible', …     /* body copy — legibility */
--font-mono:  ui-monospace, 'JetBrains Mono', …

/* Fluid type scale */
--fs-display: clamp(2.6rem, 1.5rem + 4.6vw, 4.6rem)
--fs-h1:      clamp(2rem, 1.5rem + 2.1vw, 3rem)
--fs-h2:      clamp(1.55rem, 1.3rem + 1.1vw, 2.15rem)
--fs-h3:      1.3rem
--fs-lg:      1.15rem
--fs-base:    1rem
--fs-sm:      0.9rem
--fs-xs:      0.78rem  /* eyebrows / mono labels */

/* Weights */
--fw-regular: 400  --fw-medium: 500  --fw-semibold: 600
--fw-bold:    700  --fw-black:  800

/* Line heights */
--lh-tight: 1.15  --lh-snug: 1.35  --lh-body: 1.65
```

### Spacing Tokens (4 px base)
```css
--space-1: 0.25rem   (4px)
--space-2: 0.5rem    (8px)
--space-3: 0.75rem   (12px)
--space-4: 1rem      (16px)
--space-5: 1.5rem    (24px)
--space-6: 2rem      (32px)
--space-8: 3rem      (48px)
--space-10: 4rem     (64px)
--space-12: 6rem     (96px)
--space-16: 8rem     (128px)
```

### Border Radius
```css
--radius-sm:   8px
--radius-md:   14px
--radius-lg:   20px   /* default for clay cards */
--radius-xl:   28px
--radius-pill: 999px  /* buttons, chips */
```

### Elevation / Shadows
```css
--shadow-sm:   0 1px 2px rgba(0,0,0,.4)
--shadow-card: 0 8px 28px rgba(0,0,0,.45)
--shadow-pop:  0 18px 50px rgba(0,0,0,.55)

/* Claymorphism system (2026 tactile depth) */
--clay-border:        3px solid color-mix(in srgb, var(--brand) 40%, transparent)
--clay-shadow:        0 6px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)
--clay-shadow-hover:  0 10px 28px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12)
--clay-shadow-press:  0 2px 8px rgba(0,0,0,.3), inset 0 2px 4px rgba(0,0,0,.2)
--clay-radius: var(--radius-lg)
```

### Motion Tokens
```css
--ease:       cubic-bezier(0.4, 0, 0.2, 1)     /* standard */
--ease-entry: cubic-bezier(0.16, 1, 0.3, 1)    /* kinetic entry */
--dur:        0.2s
--dur-slow:   0.4s
--dur-entry:  620ms    /* card scale+fade settle */
--dur-stagger: 70ms   /* delay between staggered grid items */
--lift-hover: 1.015   /* micro scale-lift on hover */
```

### Bento / Neon Tokens (dashboard only)
```css
--neon-green: #2bffb0   /* active / live / ON */
--neon-cyan:  #3fe0ff   /* data tracks / radar */
--bento-gutter:  #08090b
--bento-surface: #0c141c

/* Neon glows (hover illumination) */
--glow-neon-green, --glow-neon-cyan
```

### Z-Index Scale
```css
--z-base: 0  --z-raised: 10  --z-dropdown: 20
--z-sticky: 40  --z-overlay: 100  --z-modal: 200
--z-toast: 300  --z-tooltip: 400
```

---

## 2. Component Library

### Location
```
src/
  app/          Header, Footer, Layout, RouteFallback
  components/
    bento/      BentoCard, BentoGrid, HomeDashboard, useCardGlow
                widgets/  (AdelFeature, Compliance, Radar, RegStream, Search,
                            Study, Tools, StatValue)
    calc/       NumberField, TextField, ResultStat, Grids — calc primitives
    CalcShell           shared frame for every calculator page
    Disclaimer          the legal disclaimer (NEVER inline or reword)
    LangToggle          EN/AR language switch
    SectionHeader       glowing accent bar + title + count
    StatusPill          live/pending status indicator
  pages/        one folder per route (Home/, library/, tools/, chat/, …)
```

### Component Patterns

**CalcShell** — wrapper for every calculator tool:
```tsx
<CalcShell
  title={t('crosswind.title')}
  intro={t('crosswind.intro')}
  category="Performance"
  onExample={() => { /* load example values */ }}
  adelPrompt={() => `Ask Captain Adel: …`}
  formula={<>…math explanation…</>}
  related={[{ to: '/tools/density-altitude', label: 'Density Altitude' }]}
>
  {/* inputs and outputs go here */}
</CalcShell>
```

**BentoCard** — interactive tile for the home dashboard:
```tsx
<BentoCard span="md" tone="cyan" to="/library" label="Open the library">
  {/* tile content */}
</BentoCard>
// span: 'sm' | 'md' | 'lg' | 'tall' | 'wide'
// tone: 'default' | 'cyan' | 'green'
```

**SectionHeader** — section divider with glowing accent bar:
```tsx
<SectionHeader
  title="Navigation Aids"
  tone="var(--cat-1)"   /* per-category accent colour */
  count="12 documents"
/>
```
The `--tone` CSS variable sets the bar color and its glow. Any token value is valid.

**NumberField** — labelled numeric input for calculators:
```tsx
<NumberField
  label="Wind Speed"
  value={wspd}
  onChange={setWspd}
  unit="kt"
  placeholder="18"
  hint="Reported wind speed from ATIS"
  error={error}
/>
```

**Disclaimer** — always use this component; never reword:
```tsx
<Disclaimer />         /* full */
<Disclaimer compact /> /* one-liner for page footers */
```

---

## 3. Frameworks & Libraries

| Layer | Technology |
|---|---|
| Framework | React 18 (function components only) |
| Language | TypeScript 5 strict |
| Routing | react-router-dom v6, `lazyNamed()` for code-split routes |
| i18n | i18next + react-i18next (en/ar, runtime switch) |
| Animation | framer-motion (bento tiles only; lazy-imported) |
| Maps | Leaflet (Aerodromes tool) |
| Native shell | Capacitor 6 (iOS/Android; inert on web) |
| Build | Vite 6 + @vitejs/plugin-react |
| TypeScript build | `tsc -b && vite build` (composite projects) |
| PWA | vite-plugin-pwa, workbox, network-first for `/data/*` |
| Testing | Vitest + @testing-library/react + Playwright |
| Linting | ESLint 9 + typescript-eslint |
| Formatting | Prettier |
| Deployment | Firebase Hosting (`firebase deploy --only hosting`) |

---

## 4. Asset Management

### Storage
All static assets live in `public/` and are served at the URL root:
```
public/
  img/
    flygaca-mark.png      nav logo mark (34×34 reference)
    icon-192.png          PWA icon
    icon-512.png          PWA icon
    apple-touch-icon.png  iOS homescreen
    og-card.png           social preview (1200×630)
    favicon-*.png         favicons
  captain/                Captain Adel avatar images
  data/                   regulatory JSON corpus (never in the JS bundle)
```

### Referencing Assets in Code
```tsx
<img src="/img/flygaca-mark.png" alt="" width={34} height={34} />
```
Vite copies `public/` verbatim; no import needed. `vite-plugin-pwa` precaches `img/*.{png,ico,svg}`.

### Asset Optimisation
- Images are already hand-optimised PNGs; no Vite image plugin is used
- The large regulatory corpus (`/data/*.json`, up to ~19 MB) is **never bundled** — fetched at runtime via `fetchJson()` in `src/lib/content.ts`
- The Vite build splits vendor chunks: `vendor-react`, `vendor-i18n` — these are separately cached

---

## 5. Icon System

There is **no icon library**. Icons are handled three ways:

1. **Inline SVG** — for data-viz (WindDiagram, RadarWidget). SVG attributes use camelCase (JSX rules).
2. **Emoji / Unicode** — for status/alert decorators: `⚠` (error prefix in CSS `::before`), `→` (CTA arrows).
3. **Text CTAs** — navigation and card CTAs use plain translated text, not icon glyphs.

When adding icons from Figma:
- Export as inline SVG components inside `src/components/icons/`
- Apply `fill="currentColor"` so they inherit `color`
- Use `aria-hidden="true"` if decorative; add a `title` + `role="img"` if semantic
- Size with `inline-size` / `block-size` tokens (never `width`/`height` px hard-codes)

---

## 6. Styling Approach

### CSS Modules (primary)
Every component has a co-located `*.module.css`. Class names are camelCase.
```tsx
import styles from './MyComponent.module.css'
// ...
<div className={styles.card}>
```

### Global Utilities (`src/styles/global.css`)
A small set of composable utility classes are available globally:

| Class | Purpose |
|---|---|
| `.container` | 1180px max-width, centred with `margin-inline: auto` |
| `.container-narrow` | 760px max-width |
| `.btn` | Base button (all variants extend this) |
| `.btn-primary` | Brand-fill button |
| `.btn-clay` | Claymorphism secondary button |
| `.btn-clay-primary` | Claymorphism primary button (hero CTAs) |
| `.btn-ghost` | Transparent outline button |
| `.page-enter` | CSS entry animation (fade-up, 620ms) |
| `.stagger-grid` | Applies staggered `fade-up` to direct children (up to 12) |
| `.card-clay` | Claymorphism card surface |
| `.skeleton` | Shimmer loading placeholder |
| `.sr-only` | Visually hidden, screen-reader accessible |
| `.touch-target` | Enforces 44×44px min touch area |

### RTL / Logical Properties — Mandatory
**All** spatial properties must use CSS logical properties so Arabic (RTL) mirrors automatically:

| Physical (❌ banned) | Logical (✅ required) |
|---|---|
| `width` | `inline-size` |
| `height` | `block-size` |
| `left`, `right` | `inset-inline-start`, `inset-inline-end` |
| `top`, `bottom` | `inset-block-start`, `inset-block-end` |
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

The only exceptions are explicit graphical elements (SVG coordinates, certain transforms) where logical equivalents don't apply.

### Responsive Design Breakpoints
Breakpoints live in each component's CSS Module (no global breakpoint tokens):
```css
@media (max-width: 960px) { /* tablet */ }
@media (max-width: 860px) { /* nav collapse */ }
@media (max-width: 600px) { /* mobile single-col */ }
```
Always pair with `@media (prefers-reduced-motion: reduce)` to disable animations.

### Claymorphism Pattern (2026 house style)
Interactive cards and buttons use the claymorphism system:
```css
.myCard {
  background: var(--surface);
  border: var(--clay-border);
  border-radius: var(--clay-radius);   /* 20px */
  box-shadow: var(--clay-shadow);
  transition:
    box-shadow var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.myCard:hover {
  box-shadow: var(--clay-shadow-hover);
  transform: translateY(-2px);
}
.myCard:active {
  box-shadow: var(--clay-shadow-press);
  transform: scale(0.97);
}
```

### Category Accent Colours
When rendering grouped content (tools grid, library categories), per-category accent colours are cycled from this array:
```ts
const CAT_TOKENS = [
  'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)',
  'var(--cat-4)', 'var(--cat-5)',
]
// Applied as inline CSS property on each card:
style={{ '--cat-color': CAT_TOKENS[i % CAT_TOKENS.length] } as CSSProperties}
```
**Note:** `--cat-1` through `--cat-5` must be defined in `tokens.css` before shipping. Map them to Falcon hues (teal, sage, gold, clay, and a fifth accent).

---

## 7. Project Structure

```
FlyGACA-app/
├── public/
│   ├── data/            regulatory JSON corpus (GACAR, AIP, etc.)
│   └── img/             static image assets
├── src/
│   ├── app/             chrome: Layout, Header, Footer, RouteFallback
│   ├── calc/            pure math modules (no DOM, no i18n) — unit-testable
│   ├── components/
│   │   ├── bento/       home dashboard tile system (framer-motion)
│   │   └── calc/        shared calculator UI primitives
│   ├── i18n/
│   │   ├── en.json      English translation keys
│   │   ├── ar.json      Arabic translation keys (must stay in parity)
│   │   └── index.ts     i18next boot + <html lang/dir> sync
│   ├── lib/             typed frontend services
│   │   ├── api.ts       /api/chat + /api/content endpoints
│   │   ├── auth.ts      Firebase Auth
│   │   ├── content.ts   fetchJson, CORPUS index, searchHref
│   │   ├── entitlements.ts  pure predicate — UI gating only
│   │   ├── native-bridge.ts Capacitor plugin bridge
│   │   ├── tools.ts     TOOLS catalog + TOOL_CATEGORIES
│   │   ├── useFetchJson.ts  data-fetch hook
│   │   ├── usePageMeta.ts   <title> + og meta updater
│   │   └── useUrlState.ts   URL-synced input state
│   ├── pages/
│   │   ├── Home/        hero + bento dashboard
│   │   ├── library/     Library, Document, Charts
│   │   ├── tools/       ToolsIndex + ~55 individual tool pages
│   │   ├── chat/        Captain Adel chat
│   │   ├── study/       GroundSchool, StudyHub, Paths
│   │   ├── account/     sign-in, profile
│   │   └── …            About, Pricing, Schools, NotFound, legal
│   ├── styles/
│   │   ├── tokens.css   ← SINGLE TOKEN SOURCE (all CSS vars)
│   │   └── global.css   ← layout primitives + global utilities
│   ├── main.tsx         app boot + i18n init
│   └── router.tsx       single route table (all lazy except Home)
├── tests/               Vitest unit + i18n-parity
├── scripts/             build-sitemap.mjs, build-airspaces-from-aip.mjs
├── firebase.json        hosting + CSP headers
├── vite.config.ts       Vite + PWA config
└── CLAUDE.md            primary AI collaboration guidelines
```

### Route Registration Pattern
All pages are lazily code-split using a typed helper:
```tsx
// src/router.tsx
function lazyNamed<M, K extends keyof M>(loader: () => Promise<M>, key: K) {
  return lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));
}

const Library = lazyNamed(() => import('./pages/library/Library'), 'Library');
// Route: { path: '/library', element: <Library /> }
```

### Porting a New Figma Page to Code
1. **Math** → `src/calc/<tool>.ts` (pure, write Vitest spec)
2. **Page** → `src/pages/tools/<Tool>/` using `CalcShell` + `useUrlState`
3. **i18n** → add keys to both `en.json` and `ar.json` (parity enforced by CI)
4. **Route** → register in `src/router.tsx` with `lazyNamed`
5. **Catalog** → set `live: true` in `public/data/tools.json`

---

## 8. Figma → Code Translation Rules

### Token Mapping
When Figma uses a named style, map it to the nearest CSS custom property:

| Figma style | CSS token |
|---|---|
| Falcon Night (fill) | `var(--bg)` or `var(--falcon-night)` |
| Falcon Deep (fill) | `var(--surface)` |
| Surface Raised | `var(--surface-raised)` |
| Falcon Teal (fill) | `var(--brand)` |
| Teal Bright | `var(--brand-hover)` or `var(--link)` |
| Falcon Sage | `var(--accent)` |
| Text/Primary | `var(--text)` |
| Text/Muted | `var(--text-muted)` |
| Text/Dim | `var(--text-dim)` |
| Border | `var(--border)` |
| Border Bright | `var(--border-bright)` |
| Brand Gradient | `var(--grad-brand)` |
| Clay Shadow | `var(--clay-shadow)` |

### Typography
- All headings: `font-weight: var(--fw-bold)` unless specified
- Body: `font-family: var(--font-body)` (Atkinson Hyperlegible)
- Nav / UI labels: `font-family: var(--font-sans)` (Cairo — also handles Arabic)
- Numbers in calculators: `font-variant-numeric: tabular-nums`

### Spacing Grid
The Figma 4px grid maps exactly to the spacing tokens. Round to the nearest `--space-N` value. Never use arbitrary pixel values.

### Accessibility Requirements (non-negotiable)
- All interactive elements: minimum `44px` touch target (`min-height: 44px; min-width: 44px`)
- Focus rings: `outline: 2px solid var(--focus); outline-offset: 2px`
- RTL: use logical properties throughout (see section 6)
- Reduced motion: the `@media (prefers-reduced-motion: reduce)` block in `global.css` covers all animations; make sure new animations also respect it

### Bilingual Copy
Every piece of user-visible text must have a key in **both** `src/i18n/en.json` and `src/i18n/ar.json`. The CI i18n parity test (`tests/i18n-parity.test.ts`) fails on any mismatch. Arabic text uses Cairo (the `--font-sans` stack) and RTL layout flips automatically.

### Disclaimer
Never implement the legal disclaimer as inline text. Always render:
```tsx
import { Disclaimer } from '../../components/Disclaimer';
<Disclaimer />        /* full text */
<Disclaimer compact /> /* abbreviated for tool footers */
```

### Component File Convention
```
src/pages/tools/MyTool/
  MyTool.tsx         /* component — named export matching route key */
  MyTool.module.css  /* CSS Module — colocated */
```

---

## 9. Figma Handoff Checklist

Before writing code from a Figma frame:

- [ ] All colours resolve to a token in `tokens.css` — no hex codes in component CSS
- [ ] All spacing uses `--space-N` tokens — no arbitrary `px` values
- [ ] Interactive states included (default, hover, focus, active, disabled)
- [ ] RTL variants reviewed (does the layout mirror correctly with logical properties?)
- [ ] Both EN and AR copy strings identified and added to i18n bundles
- [ ] Touch targets ≥ 44×44px for all interactive elements
- [ ] Reduced-motion alternative identified for any animation
- [ ] `<Disclaimer />` present if the tool produces regulatory guidance
- [ ] New route registered in `router.tsx` and catalog entry in `tools.json`
