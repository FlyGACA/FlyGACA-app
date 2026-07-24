# archive/

Everything in here is **not part of the Fly GACA app**. Nothing under `archive/` is imported by
`src/`, executed by an npm script, referenced by a GitHub workflow, or shipped in `dist/`. It is
kept only so the material stays recoverable from `main` instead of living in git history alone.

`archive/` is excluded from the CI gate (`eslint.config.js`, `.prettierignore`), so files here are
never linted, formatted, type-checked, or bundled.

## What's in here

### `vendor/` — third-party reference collections

Vendored as plain files with git history stripped. Neither collection is wired into the app build
or into this repo's `.claude/` config.

| Directory               | Upstream                                      | Pinned commit                              | License |
| ----------------------- | --------------------------------------------- | ------------------------------------------ | ------- |
| `vendor/agency-roster/` | <https://github.com/ziri22/agency-roster>     | `bc5384b2eb92ad37657e3cc395447c272737ec2a` | MIT     |
| `vendor/agency-agents/` | <https://github.com/Raheel2774/agency-agents> | `217a63b8b6b6ea5752fd436a05996c796ba0ec66` | MIT     |

- **agency-roster** — 888 markdown "skills" (`skills/<division>/<agent>/SKILL.md`).
- **agency-agents** — 258 subagent definitions (`<domain>/<agent>.md`) across 21 domains.

Each upstream keeps its own `LICENSE` inside its directory. To refresh, re-clone the repo at a
newer commit, replace the directory, and update the pinned commit above.

### `agent-configs/` — per-tool skill folders

Twelve editor/agent config folders that used to sit at the repo root: `.agent`, `.codex`,
`.cursor`, `.gemini`, `.kiro`, `.opencode`, `.qoder`, `.roo`, `.trae`, `.windsurf`, `.codebuddy`,
`.continue`. Each is a skill-installer artifact carrying one copy of `ui-ux-pro-max/SKILL.md` plus
relative symlinks into `.claude/skills/` and `.agents/skills/`.

The twelve copies had already drifted into **seven distinct versions** of the same `SKILL.md`.
`.claude/` and `.agents/` remain at the repo root — those are the live, curated skill sets, managed
by `skills-lock.json`.

**These tools discover skills only at the repo root, so while archived they do not load.** To
reactivate one, move it back and shorten its symlink targets by the two `../` segments that the
move added:

```sh
git mv archive/agent-configs/.cursor .cursor
find .cursor -type l -exec sh -c \
  'ln -sfn "$(readlink "$1" | sed "s|^\.\./\.\./||")" "$1"' _ {} \;
find .cursor -xtype l   # must print nothing
```

### `scripts/` — scripts nothing calls

Not referenced by any npm script, GitHub workflow, or other script. Each still runs if you invoke
it directly with `node`.

| File                                   | Why it's here                                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/gen-avatar-live.mjs`          | No references anywhere in the repo.                                                                                                                                                                                   |
| `scripts/build-og-card.mjs`            | Manual one-off; needs `fonts.gstatic.com` network access. The live OG pipeline is `npm run gen:og` → `scripts/build-og-images.mjs`.                                                                                   |
| `scripts/captain-derivatives.mjs`      | Produces favicons / social crops from the Captain Adel art; run by hand after `npm run gen:captain`.                                                                                                                  |
| `scripts/build-airspaces-from-aip.mjs` | One-off AIP → airspace extraction.                                                                                                                                                                                    |
| `functions-scripts/mint-api-key.mjs`   | From `functions/scripts/`. Its siblings (`grant-org`, `grant-school-seats`, `grant-staff-access`, `school-cohort-report`) are documented in `docs/b2b/` and stayed put; this one had no references.                   |
| `figma-ds/`                            | Manual Figma Plugin API pastes (`01-finish-foundations.js`, `02-core-components.js`) plus the handoff `README.md`, formerly `docs/design/figma-ds/`. Run inside Figma via the Scripter plugin — never from this repo. |

## Restoring something

`git mv` it back to its original path and re-add it to whatever should call it (an npm script in
`package.json`, a workflow step, or an import). For `agent-configs/`, also fix the symlinks as
shown above.
