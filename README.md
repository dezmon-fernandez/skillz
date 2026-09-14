# skillz

Reusable Claude Code skills, subagents, and hooks. Each one is a base meant to be copied
into a project and adapted there.

## Skills

| Skill | Purpose |
|-------|---------|
| `prime` | Load project context at the start of a session. Consumes a pending `.agents/handover.md` if one exists. |
| `handover` | Distill the live session into `.agents/handover.md` so a fresh session can resume via `/prime`. |
| `create-prd` | Turn a conversation or notes into `.agents/PRD.md`, the source of truth `/prime` reads. |
| `generate-plan` | Turn a feature request, ticket, or conversation into a context-rich implementation plan, settling every open question with the operator first. |
| `review-plan` | Poke holes in a plan before any code is written, checking its claims against the real code. |
| `execute-plan` | Implement a plan task by task, validating each one, and write the execution report. |
| `review-code` | Gate after `execute-plan`: delegate to the `code-reviewer` agent, save the report, triage the findings. |
| `commit` | Stage the current work and write one atomic commit in the repo's own convention. |
| `hooks-create` | Author a working hook from a plain-English description, wire it in, and prove it fires. |

`handover` and `prime` are a pair: `handover` writes the file, `prime` consumes and deletes it.

`create-prd` → `generate-plan` → `review-plan` → `execute-plan` → `review-code` → `commit`
is the feature loop; each step reads what the previous one wrote.

## Agents

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Read-only reviewer. Checks a finished implementation against its plan and execution report, and judges the design now that the code exists. Spawned by `review-code`. |
| `plan-reviewer` | Read-only reviewer. Reads a plan cold, verifies its claims against the code, and returns blocking issues, the smallest design that meets the goal, and the decisions the operator should confirm. Spawned by `review-plan`. |
| `code-quality-pragmatist` | Reviews recent code for over-engineering and unnecessary complexity relative to the project's actual needs, and recommends simplifications. Invoked by hand. |

## Hooks

| Hook | Enforces |
|------|----------|
| `require-read-before-edit` | Denies shell commands that modify files (redirects, in-place `sed`/`perl`, `tee`), so every change goes through Edit/Write and their required prior Read. Writes to `/dev/null` and `/tmp` pass. |

## Install into a project

Skills and agents are directories to copy:

```sh
cp -R skills/prime skills/handover /path/to/project/.claude/skills/
cp agents/code-reviewer.md /path/to/project/.claude/agents/
```

A hook is a script plus a settings fragment. Copy the script, then merge `hooks.json` into
the project's `.claude/settings.json` — merge, never overwrite, or you drop the hooks
already registered there:

```sh
cp hooks/require-read-before-edit/require-read-before-edit.js /path/to/project/.claude/hooks/
```

Or pull the skills with the skills CLI:

```sh
npx skills add dezmon-fernandez/skillz
```

## Layout

```
skills/
  <name>/
    SKILL.md          # frontmatter (name, description) + instructions
    references/       # optional long-form reference material
agents/
  <name>.md           # frontmatter (name, description, tools) + the agent's prompt
hooks/
  <name>/
    <name>.js         # the hook script
    hooks.json        # the fragment to merge into .claude/settings.json
```

`CLAUDE.md` says how these must be built. Add a new one by creating its directory and
adding a row to the table above.

## Maintaining copies in other repos

`/sync-skills` (a repo-local skill in `.claude/skills/`) pushes the base out to a project
repo and harvests generalizable improvements back. It keeps no list of repos — name the
path when you invoke it, so no local paths are stored in this repo.
