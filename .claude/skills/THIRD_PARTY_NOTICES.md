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
| `performing-security-headers-audit` | `index.html` CSP, headers in `vercel.json` / `netlify.toml` |
| `analyzing-sbom-for-supply-chain-vulnerabilities` | `package.json` / `package-lock.json` |
| `implementing-github-advanced-security-for-code-scanning` | `.github/` CI |
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
