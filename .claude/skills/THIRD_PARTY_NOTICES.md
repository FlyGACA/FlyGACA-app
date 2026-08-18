# Third-Party Notices — vendored Claude Code skills

This directory contains skills vendored from third-party, community-maintained sources. They are
developer tooling for Claude Code only; they are not part of any shipped product and are never
served to end users.

## Anthropic-Cybersecurity-Skills

- **Project:** Anthropic-Cybersecurity-Skills (a community project — **not affiliated with
  Anthropic PBC**, despite the name)
- **Author:** Mahipal Jangra (@mukul975)
- **Source:** https://github.com/mukul975/Anthropic-Cybersecurity-Skills
- **License:** Apache License 2.0 (each vendored skill folder retains its upstream `LICENSE`)
- **Pinned upstream commit:** `4c0b700ac5d280ba46695062077f0fe922ce3602`

### What was vendored, and why these

Upstream ships 817 skills across 29 domains. Only a defensive, frontend- and gateway-relevant
subset was taken — curated from the Web Application Security, API Security, Supply Chain and
DevSecOps domains. The other domains (malware analysis, forensics, SOC/OT-ICS, red teaming) have no
bearing on this React/Vite/Firebase/Capacitor PWA and were **not** vendored.

This set **restores** the same seven skills this repo carried before the `a6c98e3` deletion
incident (2026-08-16) took `.claude/` with it, re-pinned to a current upstream commit.

| Vendored skill | Maps to in this repo |
| --- | --- |
| `analyzing-sbom-for-supply-chain-vulnerabilities` | npm dependency surface, `package-lock.json` |
| `detecting-typosquatting-packages-in-npm-pypi` | npm dependencies |
| `implementing-secret-scanning-with-gitleaks` | `.env` handling, Firebase config, `firestore.rules` |
| `testing-api-security-with-owasp-top-10` | `functions/` Express gateway — `/api/chat`, `/api/feedback`, the licensed `/v1/ask` surface |
| `performing-oauth-scope-minimization-review` | `src/lib/services/auth.ts`, `entitlements.ts` |
| `implementing-jwt-signing-and-verification` | `src/lib/services/auth.ts`, `functions/src/api-key-core.ts` |
| `performing-security-headers-audit` | the strict CSP (`connect-src 'self'`) and the Worker/Netlify/Vercel `/api/*` rewrites |
### What was intentionally omitted

For each vendored skill, only `SKILL.md`, `references/**`, and the upstream `LICENSE` were copied.
The bundled `scripts/` and `assets/` were **deliberately excluded** to avoid introducing unreviewed
third-party executables — every one of the 817 upstream skills ships a `scripts/` directory. If a
skill's workflow refers to a helper script, consult the pinned upstream commit above rather than
running anything from here.

### Updating from upstream

`.claude/settings.json` registers the upstream repo as a Claude Code marketplace, so
`/plugin install cybersecurity-skills@anthropic-cybersecurity-skills` pulls the full 817-skill set
on demand. It is **registered but not enabled** on purpose: enabling it alongside these vendored
copies would put two skills of each vendored name on the path. Use the plugin to review what
changed upstream, or to reach a skill outside the curated set, then port any delta into the
vendored copy rather than running both.

### Fly GACA guardrail

These skills are **advisory developer tooling**. Where any of them conflicts with this repo's
`CLAUDE.md` conventions, **CLAUDE.md wins** — in particular: entitlement is **server-owned** and the
client only ever reads it to gate UI (a skill suggesting client-side authorization checks does not
override that); the strict CSP stays `connect-src 'self'` and new API surface goes under `/api/*`
rather than widening it; and `npm run verify` plus `functions/`'s own gate remain the definition of
green.

`testing-api-security-with-owasp-top-10` is written for penetration-testing engagements. Use it
**only against this project's own endpoints**, and prefer the Firebase emulator or a preview
deployment over probing production.
