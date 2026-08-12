# Third-Party Notices — vendored Claude Code skills

This directory contains a small, curated subset of skills vendored from a third-party,
community-maintained collection. They are developer tooling for Claude Code only; they are not part
of the Fly GACA application bundle and are never shipped to end users.

## Anthropic-Cybersecurity-Skills

- **Project:** Anthropic-Cybersecurity-Skills (a community project — **not affiliated with
  Anthropic PBC**)
- **Author:** Mahipal Jangra (@mukul975)
- **Source:** https://github.com/mukul975/Anthropic-Cybersecurity-Skills
- **License:** Apache License 2.0 (each vendored skill folder retains its upstream `LICENSE`)
- **Pinned upstream commit:** `13a1c4afd9bdd54dd23470073ea7c558b2923912`

### What was vendored, and why these

Only a defensive, frontend-relevant subset was taken — curated from the upstream Web Application
Security, API Security, and DevSecOps domains. The other 23 upstream domains (malware analysis,
forensics, SOC/OT-ICS, red teaming, etc.) were intentionally **not** vendored: they have no bearing
on this React/Vite/Firebase/Capacitor PWA.

| Vendored skill | Maps to in this repo |
| --- | --- |
| `detecting-typosquatting-packages-in-npm-pypi` | npm dependencies |
| `implementing-secret-scanning-with-gitleaks` | `.env.example`, Firebase config, `firestore.rules` |
| `testing-api-security-with-owasp-top-10` | `src/lib/api.ts`, `/api/chat` + `/api/content` |
| `performing-oauth-scope-minimization-review` | `src/lib/auth.ts`, `entitlements.ts` |
| `implementing-jwt-signing-and-verification` | `src/lib/auth.ts` |

### What was intentionally omitted

For each vendored skill, only `SKILL.md`, `references/**`, and the upstream `LICENSE` were copied.
The bundled `scripts/` (Python/PowerShell) and `assets/` were **deliberately excluded** to avoid
introducing unreviewed third-party executables into this repository. If a skill's workflow refers to
a helper script, consult the pinned upstream commit above rather than running anything from here.

## taste-skill

- **Project:** taste-skill — an "anti-slop" frontend design-direction skill collection
- **Author:** Leon (@Leonxlnx)
- **Source:** https://github.com/Leonxlnx/taste-skill
- **License:** MIT (each vendored skill folder retains a copy of the upstream `LICENSE`)
- **Pinned upstream commit:** `06d6028b5c623016c59ce8536f578e5a1127b499`

### What was vendored, and why

All 13 skills from the upstream `skills/` directory were vendored — implementation skills (which
output code) and image-generation skills (which produce design-reference boards). They are
on-demand design-taste aids for layout, typography, motion, and spacing.

| Vendored skill (= skill `name`) | Upstream `skills/` folder |
| --- | --- |
| `design-taste-frontend` (flagship v2) | `taste-skill` |
| `design-taste-frontend-v1` | `taste-skill-v1` |
| `gpt-taste` | `gpt-tasteskill` |
| `image-to-code` | `image-to-code-skill` |
| `redesign-existing-projects` | `redesign-skill` |
| `high-end-visual-design` | `soft-skill` |
| `full-output-enforcement` | `output-skill` |
| `minimalist-ui` | `minimalist-skill` |
| `industrial-brutalist-ui` | `brutalist-skill` |
| `stitch-design-taste` | `stitch-skill` (its `DESIGN.md` sample → `references/`) |
| `imagegen-frontend-web` | `imagegen-frontend-web` |
| `imagegen-frontend-mobile` | `imagegen-frontend-mobile` |
| `brandkit` | `brandkit` |

### What was intentionally omitted

Only each skill's `SKILL.md` (plus `stitch-design-taste`'s `DESIGN.md` reference) and the upstream
MIT `LICENSE` were copied. The repo-root `scripts/` (incl. `skill.sh`), `assets/`, `examples/`, and
`research/` were **deliberately excluded** to avoid introducing unreviewed third-party executables
or marketing material. Consult the pinned upstream commit above for anything not vendored here.

### Fly GACA guardrail

These skills are design-direction aids only — developer tooling for Claude Code, never shipped in
the app bundle. They are written for landing pages / portfolios and may suggest free-form palettes,
GSAP, or physical-axis CSS. Where any of their guidance conflicts with this repo's **enforced**
`CLAUDE.md` conventions, **CLAUDE.md wins**:

- **Tokens only** — colours/spacing come from `src/styles/tokens.css` (the Falcon palette); no
  hard-coded values.
- **Logical properties only** — no physical `left`/`right`; RTL must mirror automatically.
- **Bilingual + RTL parity** — new copy needs a key in **both** `src/i18n/en.json` and `ar.json`
  (`tests/i18n-parity.test.ts` fails otherwise).
- **The `<Disclaimer />` never drifts** — never inline or reword the not-affiliated / verify-against-
  GACA text.

Reconcile any palette, motion, or layout idea from these skills with the design tokens and the
`CalcShell`/CSS-Modules patterns before using it.

## diagram-design

- **Project:** diagram-design — "editorial diagrams your designer won't hate"
- **Author:** Cathryn Lavery (@cathrynlavery)
- **Source:** https://github.com/cathrynlavery/diagram-design
- **License:** MIT (upstream `LICENSE` retained at `.claude/skills/diagram-design/LICENSE`)
- **Pinned upstream commit:** `4da4dfb80b1f3d2f11678726b0db58c33c1d7e9d` (v2.2.0)

### What was vendored

The whole skill — `SKILL.md`, all 30 `references/`, `assets/` (4 templates + 94 worked examples +
the 55-icon sheet), and `scripts/` — plus the three slash commands (`/export-diagram`,
`/import-drawio`, `/import-mermaid`) at `.claude/commands/`. The commands resolve the skill through
`../skills/diagram-design/…`, which keeps working because `commands/` and `skills/` stay siblings
under `.claude/`.

Not vendored: the upstream `.claude-plugin/` and `.codex-plugin/` manifests (this is a vendored
skill, not an installed plugin), `docs/screenshots/`, the repo-root `scripts/` test + lint harness,
and `scripts/fixtures/` (referenced by two reference docs only to say which sample file a worked
example was generated from — not needed at runtime).

### The `scripts/` exception, and why it was made

The existing convention in this file is that upstream `scripts/` are **excluded** to avoid
introducing unreviewed third-party executables. That exclusion is **deliberately widened here**,
because `references/import-drawio.md` and `references/import-mermaid.md` both invoke these two
scripts directly and the commands explicitly forbid reading a `.drawio` file without them —
dropping them would ship two visibly broken commands.

They were reviewed before vendoring (2,141 lines across two files):

- **Imports are stdlib only** — `argparse`, `base64`, `zlib`, `struct`, `re`, `json`, `html`,
  `dataclasses`, `pathlib`, `typing`, `xml.etree.ElementTree`, and `urllib.parse.unquote`
  (string decoding, *not* a network call).
- **No** `subprocess`, `os.system`, `os.popen`, `eval`, `exec`, `__import__`, `pickle`, or socket /
  HTTP client of any kind. No writes outside an explicit `--out` path.
- Both are pure parsers: they decode a diagram file to a normalized JSON structure on stdout. The
  module docstring's own claim — *"this script never makes a design decision"* — matches the code.

One residual note: they parse untrusted XML via `xml.etree.ElementTree`. Modern CPython does not
resolve external entities there, so this is not an XXE vector, but a hostile `.drawio` could still
be a decompression or deeply-nested-input hazard. Treat `.drawio` files from outside the org the way
you'd treat any untrusted input.

### Brand skin — this is a local modification

Upstream ships a neutral editorial skin (white-smoke paper, jet-black ink, atomic-tangerine accent,
Instrument Serif / Geist / Geist Mono) and `SKILL.md` §0 is a first-run gate that refuses to emit
default-skinned diagrams into a branded project. That gate is **pre-satisfied**, so the skill is
usable on first run without an onboarding detour. Two files carry the delta:

1. **`references/style-guide.md`** — the declared single source of truth for tokens. Retokenized to
   the **Falcon palette**: ivory paper, falcon-night ink,
   `--falcon-teal` as `accent` (the brand primary, so a diagram reads as Fly GACA at a glance), and
   `--falcon-gold` as `link` (the heritage accent the brand reserves for sparing use, which suits
   external/API arrows). Canonical source is `src/styles/tokens.css` in the Fly GACA app; if that
   file changes, mirror it here.
2. **`assets/template.html`, `template-dark.html`, `template-full.html`** — the scaffolds the skill
   copies to start a diagram. Their `:root` custom properties *and* the literal hex values inside
   their SVG bodies were both retokenized; `template-terminal.html` keeps its fixed terminal palette
   (the style guide states that skin is opt-in and unaffected by brand onboarding) but follows the
   font change.

**Typography was changed for a correctness reason, not taste.** Upstream's display and sans faces
(Instrument Serif, Geist) have **no Arabic coverage**. Every Fly GACA surface is bilingual EN/AR, so
an Arabic node label would fall back mid-diagram or render as tofu. The display face is now
**Cairo** (already the brand's Arabic/heading face), sans is **Inter**, mono is **JetBrains Mono**.
This knowingly overrides upstream's *"Never JetBrains Mono as a blanket 'dev' font"* rule — here it
is not a generic dev default, it is the declared brand mono. The intent behind that rule (mono is
for technical content only) is preserved in full.

**The 94 `assets/example-*.html` files were deliberately left unmodified.** They are reference for
*layout and structure*, which is what the `type-*.md` docs cite them for — not colour. Keeping them
pristine means a future upstream re-sync is a clean diff, with our delta confined to the style guide
and the four templates.

One caveat specific to this repo: `.gitattributes` normalizes line endings, so the eight upstream
files that shipped with CRLF (`example-bar-dark`, `example-datalake{,-dark,-full}`,
`example-gantt-dark`, `example-line-dark`, `example-scatter-dark`, `icons.html`) plus
`references/primitive-icons.md` are stored here with LF. Content is unchanged; only line endings
differ from upstream. Expect that as noise on the first re-sync diff.

### Updating from upstream

`.claude/settings.json` registers the upstream repo as a Claude Code marketplace, so
`/plugin install diagram-design@diagram-design` pulls the latest version. It is **registered but not
enabled** on purpose: enabling it alongside the vendored copy puts two skills named
`diagram-design` on the path. Use the plugin to review what changed upstream, then port the delta
into the vendored copy — re-applying the brand skin above — rather than running both.

### Fly GACA guardrail

Diagrams produced by this skill are **documentation artifacts** — they live in `docs/`, READMEs and
design reviews, and are never imported into the app bundle. `check:bundle` / `check:perf` are
therefore unaffected. Two repo rules still bind anything you carry back into the app:

- **Tokens only** — if a diagram's palette and `src/styles/tokens.css` ever disagree, `tokens.css`
  wins and the style guide here is what gets corrected.
- **The `<Disclaimer />` never drifts** — a diagram that reproduces product chrome must not reword
  the not-affiliated / verify-against-GACA text.
