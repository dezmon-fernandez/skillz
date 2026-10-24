# skillz

Reusable Claude Code skills, subagents, and hooks. Each one is a base meant to be copied
into a project and adapted there.

## Skills

| Skill | Purpose |
|-------|---------|
| `prime` | Load project context at the start of a session. Consumes a pending `.agents/handover.md` if one exists. |
| `handover` | Distill the live session into `.agents/handover.md` so a fresh session can resume via `/prime`. |
| `create-prd` | Turn a conversation or notes into `.agents/PRD.md`, the source of truth `/prime` reads. |
| `decompose-feature` | Break a feature too large for one plan into `.agents/roadmaps/<feature>.md`: dependency-ordered slices, one architecture decision each, with the background and working rules that carry the effort across context clears. |
| `generate-plan` | Turn a feature request, ticket, or conversation into a context-rich implementation plan, settling every open question with the operator first. |
| `walk-plan` | Render a developer's walkthrough of a plan so the design can be judged before anything is built: what gets built, the entry points, the data, the decisions, the call path, every function and model, and the rules traced on one worked value. Read-only. |
| `review-plan` | Gate before `execute-plan`: delegate the cold read to the `plan-reviewer` agent, relay every finding, and settle the decisions with the developer before revising the plan. |
| `execute-plan` | Implement a plan task by task, validating each one, and write the execution report. |
| `review-code` | Gate after `execute-plan`: delegate to the `code-reviewer` agent, save the report, triage the findings. |
| `commit` | Stage the current work and write one atomic commit in the repo's own convention. |
| `hooks-create` | Author a working hook from a plain-English description, wire it in, and prove it fires. |
| `review-prose` | Rewrite one skill, agent, or document in place so it is short and plain, keeping every rule and every name other files depend on. Invoked by hand. |
| `annotate` | Open a local page where the developer comments line by line on markdown you are writing together, or on the outputs of a skill-creator eval iteration, then act on the comments when they press Send. Needs Node 22.18 or later. |

`handover` and `prime` are a pair: `handover` writes the file, `prime` consumes and deletes it.

`create-prd` → `generate-plan` → `review-plan` → `execute-plan` → `review-code` → `commit`
is the feature loop; each step reads what the previous one wrote.

`decompose-feature` comes before the loop when a feature is too large for one plan. It
writes a roadmap of slices, and each slice enters the loop at `generate-plan`.

`walk-plan` sits beside the loop. Run it after `generate-plan` or after a plan is revised.
It writes nothing.

## Agents

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Read-only reviewer. Checks a finished implementation against its plan and execution report, and judges the design now that the code exists. Spawned by `review-code`. |
| `plan-reviewer` | Read-only reviewer. Reads a plan cold, verifies its claims against the code, and returns blocking issues, the smallest design that meets the goal, and the decisions the operator should confirm. Spawned by `review-plan`. |
| `codebase-research-agent` | Read-only explorer. Investigates one slice of the codebase and reports the files to read, each with why, plus its findings and `file:line` citations. Spawned in parallel by `generate-plan`, one per subsystem. |
| `external-research-agent` | Read-only researcher. Researches one topic from outside the codebase (a library, an external API, a standard, or a technique), local docs first, and reports section-anchored links and local paths, each with why, plus pitfalls and breaking changes. Spawned in parallel by `generate-plan`, one per topic. |
| `code-quality-pragmatist` | Reviews recent code for over-engineering and unnecessary complexity relative to the project's actual needs, and recommends simplifications. Invoked by hand. |

## Second set (`-v2`)

A second version of the feature loop, tried beside the first. Its skills run only when typed,
so a request to plan still reaches `generate-plan`. Each `-v2` file names only `-v2`
siblings, so the two sets never mix. Once one set wins, the other is deleted.

`decompose-feature-v2` → `generate-plan-v2` → `review-plan-v2` → `execute-plan-v2` →
`review-code-v2` → `commit`, with `walk-plan-v2` beside it.

| Skill or agent | Purpose |
|-------|---------|
| `decompose-feature-v2` | Break a feature too large for one plan into `.agents/roadmaps/<feature>.md`: dependency-ordered slices, each one plan's worth of work and no smaller, with the background and working rules that carry the effort across context clears. |
| `generate-plan-v2` | Turn a feature request, ticket, or conversation into an implementation plan an executor can finish in one pass. The developer agrees the scope first, agents research, and the developer gives the go-ahead before the plan is written. The plan opens with a Design part the developer confirms before anything is built: what gets built, the acceptance criteria, the entry points, the data, the decisions, the call path, the models it serves and stores, and the rules traced on one worked value. |
| `walk-plan-v2` | Print a plan's Design part so the design can be judged before anything is built, or write one for a plan that has none. Read-only. |
| `review-plan-v2` | Gate before `execute-plan-v2`: delegate the cold read to the `plan-reviewer-v2` agent, revise the plan where a finding has one sound fix, and ask the developer only what is theirs to decide. The developer confirms the plan from its report before anything is built. |
| `execute-plan-v2` | Implement a plan task by task, validating each one, and write the execution report. |
| `review-code-v2` | Gate after `execute-plan-v2`: delegate to the `code-reviewer-v2` agent, save the report, fix every finding that has one sound fix, and ask the developer only what is theirs to decide. |
| `code-reviewer-v2` | Read-only reviewer. Checks a finished implementation against its plan and execution report, and judges the design now that the code exists. Spawned by `review-code-v2`. |
| `plan-reviewer-v2` | Read-only reviewer. Reads a plan cold, verifies its claims against the code, and returns blocking issues and the smallest design that meets the goal, and marks each finding that is the developer's to decide. Spawned by `review-plan-v2`. |
| `codebase-scout-agent-v2` | Read-only scout. Traces the most similar existing feature end to end and reports the route, the files the new feature would change or add, and the slices that need a researcher. Spawned first by `generate-plan-v2`, one per plan. |
| `codebase-research-agent-v2` | Read-only explorer. Investigates one slice of the codebase and reports the files to read, each with why, plus what exists today, the data touched, and `file:line` citations. Spawned in parallel by `generate-plan-v2`, one per slice the scout names. |
| `external-research-agent-v2` | Read-only researcher. Researches one topic from outside the codebase (a library, an external API, a standard, or a technique), local docs first, and reports section-anchored links and local paths, each with why, plus pitfalls and breaking changes. Spawned in parallel by `generate-plan-v2`, one per topic. |

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
