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
| `walk-plan` | Render a developer's walkthrough of a plan so the design can be judged before anything is built: what gets built, the entry points, the data, the decisions, the call path, every function and model, and the rules traced on one worked value. Opens in annotate, so its diagrams draw. Changes nothing in the plan. |
| `review-plan` | Gate before `execute-plan`: delegate the cold read to the `plan-reviewer` agent, relay every finding, and settle the decisions with the developer before revising the plan. |
| `execute-plan` | Implement a plan task by task, validating each one, and write the execution report. |
| `review-code` | Gate after `execute-plan`: delegate to the `code-reviewer` agent, save the report, triage the findings. |
| `commit` | Stage the current work and write one atomic commit in the repo's own convention. |
| `hooks-create` | Author a working hook from a plain-English description, wire it in, and prove it fires. |
| `review-prose` | Rewrite one skill, agent, or document in place so it is short and plain, keeping every rule and every name other files depend on. Invoked by hand. |
| `annotate` | Open a local page where the developer comments line by line on markdown you are writing together, or on the outputs of a skill-creator eval iteration, then act on the comments when they press Send. Highlights code blocks and draws `mermaid` blocks from a bundled copy of Mermaid (MIT). Needs Node 22.18 or later. |
| `eval-skill` | Test a change to a skill, with the developer as the judge: set up worktrees to try the new version on real work, or run the old and new versions on the same pinned request, each sandboxed so it cannot read other folders, and put the results side by side on one page. The developer comments on what needs to change, and every comment comes back as one list of edits to approve or reject. Uses `skill-creator` when installed. Invoked by hand, because every run spends the account's usage. |

`handover` and `prime` are a pair: `handover` writes the file, `prime` consumes and deletes it.

`create-prd` → `generate-plan` → `review-plan` → `execute-plan` → `review-code` → `commit`
is the feature loop; each step reads what the previous one wrote.

`decompose-feature` comes before the loop when a feature is too large for one plan. It
writes a roadmap of slices, and each slice enters the loop at `generate-plan`.

`walk-plan` sits beside the loop. Run it after `generate-plan` or after a plan is revised.
It changes nothing in the plan.

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

`decompose-feature-v2` → `generate-plan-v2` → `execute-plan-v2` → `review-code-v2` →
`commit`. `walk-plan-v2` goes between the plan and the build when the developer wants it.

| Skill or agent | Purpose |
|-------|---------|
| `decompose-feature-v2` | Break a feature too large for one plan into `.agents/roadmaps/<feature>.md`: what is being built, why, and how the work splits into user stories in build order, each one plan's worth of work, with its high-level requirements and the questions its plan must answer. No research findings: research and discovery belong to each story's plan. |
| `generate-plan-v2` | Turn a feature request, ticket, or conversation into an implementation plan an executor can finish in one pass, in four steps: define, research and check, design, write. The developer corrects the definition, with two or three real examples the build is judged by, and approves the numbered experiments that will check its assumptions, before any code is read. The plan file is written first, and each agent is briefed with its path and one numbered experiment or topic. One agent maps the code, experiment agents measure, and web researchers read, all sent at once. The main thread reads the code the map points at. Every assumption about outside data is measured, after asking first when that costs money or needs a key, or it becomes a prerequisite. The developer confirms the Definition (what, why, the acceptance criteria including what happens when things go wrong, the approach and its decisions) and the Contract (what changes for the user, the models, how it works) before the Build part is written. Each task in the Build part lists the tests it writes first and the command that runs them. |
| `walk-plan-v2` | The developer's review of a written plan, when they want one, best in a fresh session. It prints the plan as one page: what gets built, the data flow before and after, each piece with the criterion that asks for it, and the decisions. It points at what is worth a second look, such as a piece no criterion asks for or a design that differs from the request. Only the changes the developer agrees to go into the plan. No agent. |
| `execute-plan-v2` | Implement a plan task by task, validating each one, and write the execution report. |
| `review-code-v2` | Gate after `execute-plan-v2`: delegate to the `code-reviewer-v2` agent, save the report, fix every finding that has one sound fix, and ask the developer only what is theirs to decide. |
| `code-reviewer-v2` | Read-only reviewer. Checks a finished implementation against its plan and execution report, and judges the design now that the code exists. Spawned by `review-code-v2`. |
| `plan-reviewer-v2` | Read-only reviewer. Reads a plan cold for correctness and needless complexity, verifies its claims against the code, and returns blocking issues and the smallest design that meets the goal, and marks each finding that is the developer's to decide. Never files wording, and never questions how much the plan builds. No skill spawns it while `walk-plan-v2` is the developer's review; kept until the Story F round decides. |
| `codebase-scout-agent-v2` | The one agent that reads the code, with no shell (Read, Glob, Grep). Traces the most similar existing feature end to end and returns a map with `file:line` for every entry: the route, the files that would change or be added, the patterns to copy, the wiring, what calls the code that changes, the traps, and what it did not cover. Spawned by `generate-plan-v2`, one per plan, briefed with the plan's path. |
| `external-research-agent-v2` | Read-only researcher. Researches one topic from outside the codebase (a library, an external API, a standard, or a technique), local docs first, and reports section-anchored links and local paths, each with why, plus pitfalls and breaking changes. Reads another project's code through its file list, stops at 30 fetches, and never measures data. Spawned by `generate-plan-v2`, one per numbered topic in the plan, and stops when its topic is missing. |
| `experiment-agent-v2` | Answers, by running read-only code, the questions a plan rests on that only running code answers: what real data holds, a query's result or speed, a library call's behavior, memory. Measures the whole set when free and reports every answer as `n of total`, saving what it measured. Saves the records the plan's examples name. Never reads credential files and never runs what it downloads. Spawned by `generate-plan-v2`, one per numbered experiment in the plan, and stops when its experiment is missing or not approved. |

## Hooks

| Hook | Enforces |
|------|----------|
| `require-read-before-edit` | Denies shell commands that modify files (redirects, in-place `sed`/`perl`, `tee`), so every change goes through Edit/Write and their required prior Read. Writes to `/dev/null` and `/tmp` pass. |
| `deny-credential-reads` | Denies reading a file that holds keys or passwords (`.env` and `.env.<name>`, `.envrc`, `.netrc`, package-registry and cloud credentials, private keys) through Read, Grep, or a shell command. `.env.example` and public keys pass. Fails open when `jq` is missing. Needs `jq`. |

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
