# Project subagents

Claude Code loads every `*.md` here as a project-scoped subagent (see
[the subagent docs](https://code.claude.com/docs/en/sub-agents)). They are
checked in so the whole team — and every Claude session — works from the same
rules, and so the invariants this repo enforces in CI are also enforced at
authoring time.

| Agent | Use it for |
| --- | --- |
| `flight-tool-smith` | Adding or reworking a `/tools/*` calculator — all five coordinated edits |
| `i18n-ar-steward` | EN/AR key parity, Saudi-MSA copy, RTL and token correctness |
| `drift-sentinel` | Read-only audit of the `tests/integrity/` guards before a release |
| `functions-backend` | Anything under `functions/` — gateway, billing, entitlement, rules |
| `perf-budget` | `check:bundle` / `check:perf` failures, dependency weight, chunking |
| `corpus-curator` | `public/data/` shapes, sharding, pipelines, offline caching |

These encode repo-specific rules that a generic agent cannot know: the
registry-plus-i18n-plus-route recipe for a tool, the superset invariant for
shard selection, the server-only entitlement boundary, why `framer-motion` is
deliberately unpinned in `manualChunks`, and why `rsync -d` makes a corpus
rename a production event.

## Conventions

- `name` matches the filename; lowercase and hyphens only.
- `description` says **when to delegate**, in the words someone would actually
  use for the task. Auditors say "use proactively".
- `tools` is narrowed on purpose. `drift-sentinel` and `perf-budget` are
  read-only — they report findings and never edit source to make a gate pass.
- `model` is omitted (inherits the session) except where a cheaper tier is
  clearly enough.

Related but distinct: `.claude/skills/` holds *skills* (reusable procedures
loaded into the current context); agents run in their own context window and
return a summary. Use a skill for "how to do X here", an agent for "go do X and
tell me what happened".
