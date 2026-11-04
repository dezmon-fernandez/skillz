# skillz

Reusable Claude Code skills, subagents, and hooks. Each one is a base meant to be copied
into a project and adapted there.

## Skills

| Skill | Purpose |
|-------|---------|
| `prime` | Load project context at the start of a session. Consumes a pending `.agents/handover.md` if one exists. |
| `handover` | Distill the live session into `.agents/handover.md` so a fresh session can resume via `/prime`. |
| `note` | Add one note on what went well or went wrong to the end of `.agents/notes.md`, with its evidence and the skill it is about as its tag, so the harness can be improved from it later. Append-only: pruning is a separate job. A repo that installs it adds `.agents/notes.md merge=union` to its `.gitattributes`, so two branches that both add notes merge with no conflict when merged locally. Invoked by hand only. |
| `create-prd` | Turn a conversation or notes into `.agents/PRD.md`, the source of truth `/prime` reads. |
| `decompose-feature` | Break a feature too large for one plan into `.agents/roadmaps/<feature>.md`: dependency-ordered slices, one architecture decision each, with the background and working rules that carry the effort across context clears. |
| `piv-plan-implementation` | Turn a ticket or feature request into a context-rich implementation plan through a short clarifying interview, codebase analysis, and external research. |
| `piv-implement` | Implement a plan task by task, validating at every step. |
| `piv-review-changes` | Review recently changed files for bugs, security issues, and standards compliance, and write a report. |
| `piv-fix-review-findings` | Triage a review's findings, fix the chosen ones one at a time with tests, defer and log the rest, then validate. |
| `commit` | Stage the current work and write one atomic commit in the repo's own convention. |
| `hooks-create` | Author a working hook from a plain-English description, wire it in, and prove it fires. |
| `review-prose` | Rewrite one skill, agent, or document in place so it is short and plain, keeping every rule and every name other files depend on. Invoked by hand. |
| `clear-writing` | Rebuild one skill, agent, or document so it scans: each part in the form its job takes (a procedure as one command per line, a comparison as a table, a decision as question, recommendation and cost, a briefing as one short paragraph), a bold label per part, a blank line between groups. Every rule is kept; a procedure's sentences become commands. Shown side by side with the original before it is kept. Invoked by hand. |
| `annotate` | Open a local page where the developer comments line by line on markdown you are writing together, or on the outputs of a skill-creator eval iteration, then act on the comments when they press Send. Highlights code blocks and draws `mermaid` blocks from a bundled copy of Mermaid (MIT). Needs Node 22.18 or later. |
| `eval-skill` | Test a change to a skill, with the developer as the judge: set up worktrees to try the new version on real work, or run the old and new versions on the same pinned request, each sandboxed so it cannot read other folders, and put the results side by side on one page. The developer comments on what needs to change, and every comment comes back as one list of edits to approve or reject. Uses `skill-creator` when installed. Invoked by hand, because every run spends the account's usage. |
| `run-workflow` | Run a project's workflow end to end from its own config: each step (prime, plan, build, review, or whatever the config names) in its own `claude -p` session, the config's answers sent at each stop in speed mode, or the developer answering on the page in slot-in mode. Every decision is logged, a read-only watcher notes what to improve after every turn, and a read-only reporter writes one report at the end. One status page per Mac at `127.0.0.1:8790` lists every run. A hook blocks every git write the steps try. Needs Node 22.18 or later, `claude`, `git`, `caffeinate` and `lsof`. Invoked by hand, because every step spends the account's usage. |

`handover` and `prime` are a pair: `handover` writes the file, `prime` consumes and deletes it.

`create-prd` → `piv-plan-implementation` → `piv-implement` → `piv-review-changes` →
`piv-fix-review-findings` → `commit` is the feature loop; each step reads what the previous one
wrote. The four `piv-` skills and the `piv-research-agent` and `piv-codebase-analyst` agents are
copied from the agentic-coding-course repo at `13a0c2d`, the planning loop the other sets are
measured against: verbatim, except that the two agents (`research-agent` and `codebase-analyst`
there) carry a `piv-` prefix so they never mix with another set's. They name skills that are not
copied here (`piv-validate`, `piv-commit`, `piv-create-pr`, `piv-review-pr`); a session that
reaches one says it is missing.

`decompose-feature` comes before the loop when a feature is too large for one plan. It
writes a roadmap of slices, and each slice enters the loop at `piv-plan-implementation`.

## Agents

| Agent | Purpose |
|-------|---------|
| `piv-research-agent` | Explores one part of the codebase or one outside topic and reports back. Spawned several at once by `piv-plan-implementation`. |
| `piv-codebase-analyst` | Maps how an existing codebase or subsystem is built: its architecture, how data and control flow, its conventions and integration points, and the risks a change would hit. Spawned beside `piv-research-agent` by `piv-plan-implementation` for medium and high complexity work. |
| `code-quality-pragmatist` | Reviews recent code for over-engineering and unnecessary complexity relative to the project's actual needs, and recommends simplifications. Invoked by hand. |

## Second set (`dk-`)

A second version of the feature loop, tried beside the first. Its skills run only when typed,
so a request to plan still reaches `piv-plan-implementation`. Each `dk-` file names only `dk-`
siblings, so the two sets never mix. Once one set wins, the other is deleted.

`dk-decompose-feature` → `dk-generate-plan` → `dk-execute-plan` → `dk-review-code` →
`commit`. `dk-walk-plan` goes between the plan and the build when the developer wants it.

| Skill or agent | Purpose |
|-------|---------|
| `dk-decompose-feature` | Break a feature too large for one plan into `.agents/roadmaps/<feature>.md`: what is being built, why, and how the work splits into user stories in build order, each one plan's worth of work, with its high-level requirements and the questions its plan must answer. No research findings: research and discovery belong to each story's plan. |
| `dk-generate-plan` | Turn a feature request, ticket, or conversation into an implementation plan an executor can finish in one pass, in five steps, written one command per line on piv's skeleton. 1. Understand: the feature written back at a high level, before any code is read; the developer corrects it. 2. Research: the scout lists every similar feature and maps the code, and outside researchers read, each briefed with the plan's path and one item; the main thread takes each part of a report to where the plan uses it, and reads what no report covers. 3. Requirements: a table of what the user can do in each similar feature against this plan, requirements in a product manager's words that cover each input going wrong, real examples, and rare experiments; the developer corrects them. 4. Design: asked when the options differ in what the user sees, which system does the work, scope, a settled line, or lost data; decided otherwise; the developer confirms. 5. The Build part, each task carrying the tests it makes pass, each as its input, the user action when one drives it, and its output (for a screen, what the user sees), then a checklist before the report. |
| `dk-walk-plan` | The developer's review of a written plan, when they want one, best in a fresh session. It prints the plan as one page: what gets built, the data flow before and after, each piece with the requirement that asks for it, and the decisions. It points at what is worth a second look, such as a piece no requirement asks for or a design that differs from the request. Only the changes the developer agrees to go into the plan. No agent. |
| `dk-execute-plan` | Implement a plan task by task, validating each one, and write the execution report. |
| `dk-review-code` | Gate after `dk-execute-plan`: delegate to the `dk-code-reviewer` agent, save the report, fix every finding that has one sound fix, and ask the developer only what is theirs to decide. |
| `dk-code-reviewer` | Read-only reviewer. Checks a finished implementation against its plan and execution report, and judges the design now that the code exists. Spawned by `dk-review-code`. |
| `dk-codebase-scout-agent` | The one agent that reads the code, with no shell (Read, Glob, Grep). Lists every similar feature with what a user can do in each against the plan, traces the most similar one end to end, and returns a map with `file:line` for every entry: the route, the files that would change or be added, the patterns to copy, the wiring, what calls the code that changes, the traps, and what it did not cover. Spawned by `dk-generate-plan`, one per plan, briefed with the plan's path. |
| `dk-external-research-agent` | Read-only researcher. Researches one topic from outside the codebase (a library, an external API, a standard, or a technique), local docs first, and reports section-anchored links and local paths, each with why, plus pitfalls and breaking changes. Reads another project's code through its file list, stops at 30 fetches, and never measures data. Spawned by `dk-generate-plan`, one per numbered topic in the plan, and stops when its topic is missing. |
| `dk-experiment-agent` | Answers, by running read-only code, the questions a plan rests on that only running code answers: what real data holds, a query's result or speed, a library call's behavior, memory. Measures the whole set when free and reports every answer as `n of total`, saving what it measured. Saves the records the plan's examples name. Never reads credential files and never runs what it downloads. Spawned by `dk-generate-plan`, one per numbered experiment in the plan, and stops when its experiment is missing or not approved. |

## Hooks

| Hook | Enforces |
|------|----------|
| `require-read-before-edit` | Denies shell commands that modify files (redirects, in-place `sed`/`perl`, `tee`), so every change goes through Edit/Write and their required prior Read. Writes to `/dev/null` and `/tmp` pass. |
| `deny-credential-reads` | Denies reading a file that holds keys or passwords (`.env` and `.env.<name>`, `.envrc`, `.netrc`, package-registry and cloud credentials, private keys) through Read, Grep, or a shell command. `.env.example` and public keys pass. Fails open when `jq` is missing. Needs `jq`. |

## Install into a project

Skills and agents are directories to copy:

```sh
cp -R skills/prime skills/handover /path/to/project/.claude/skills/
cp agents/piv-research-agent.md /path/to/project/.claude/agents/
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

`AGENTS.md` says how these must be built. Add a new one by creating its directory and
adding a row to the table above.

## Build and check

Some skills ship a file a build makes, such as `annotate`'s compiled stylesheet in
`skills/annotate/scripts/annotate.css`. The tooling lives only here: `package.json` and
`node_modules` are never copied into a project, only what the build writes into `skills/`.

```sh
npm ci            # once, from the lockfile
npm run build     # compiles every generated file in skills/
npm run check     # rebuilds, fails if a committed generated file is stale, runs the skills' tests
```

Never edit a generated file by hand; edit its source and build. In a Claude Code session here,
`.claude/hooks/rebuild-annotate-css.sh` rebuilds `annotate.css` after Claude edits the page or its
Tailwind source; your own edits need `npm run build`. `.github/workflows/check.yml` runs
`npm run check` on every push and pull request, so a stale build never merges.

## Maintaining copies in other repos

`/sync-skills` (a repo-local skill in `.claude/skills/`) pushes the base out to a project
repo and harvests generalizable improvements back. It keeps no list of repos — name the
path when you invoke it, so no local paths are stored in this repo.
