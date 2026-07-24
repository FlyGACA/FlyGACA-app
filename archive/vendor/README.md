# vendor/

Third-party content vendored into this repo as plain files (git history stripped).
These are **reference collections** — they are not wired into the app build or into
this repo's `.claude/` Claude Code config, so they don't affect the aviation app or
its curated skill/agent set.

| Directory | Upstream | Pinned commit | License |
|-----------|----------|---------------|---------|
| `agency-roster/` | https://github.com/ziri22/agency-roster | `bc5384b2eb92ad37657e3cc395447c272737ec2a` | MIT |
| `agency-agents/` | https://github.com/Raheel2774/agency-agents | `217a63b8b6b6ea5752fd436a05996c796ba0ec66` | MIT |

- **agency-roster** — 888 markdown "skills" (`skills/<division>/<agent>/SKILL.md`) for
  Claude Code / Cursor / any markdown-skill AI tool.
- **agency-agents** — 258 subagent definitions (`<domain>/<agent>.md`, with
  `name`/`description` frontmatter) across 21 domains.

Each upstream retains its own `LICENSE` file inside its directory. To refresh from
upstream, re-clone the repo at a newer commit and replace the directory, then update
the pinned commit above.
