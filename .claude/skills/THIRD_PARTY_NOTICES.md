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
