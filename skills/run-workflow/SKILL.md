---
name: run-workflow
disable-model-invocation: true
argument-hint: "<config path> <request>"
description: >-
  Start a project's workflow (the steps its run config names, such as prime, plan, build and review) running end to
  end, each step in its own Claude Code session, with every decision logged and a status page where the developer
  can slot in to answer. Use when the developer says "run the workflow", "run this end to end", or "start a run".
  Invoked by hand only, because every step spends the account's usage.
---

# run-workflow: start a run, then hand over to the page

`$ARGUMENTS` is a config path, then the request. The run's driver works detached: it runs each step the config names
in its own `claude -p` session, answers or waits as the config says, has a read-only watcher note what to improve
after every turn, and has a read-only reporter write one report at the end. The status page shows all of it. Your
job is to start the run and give the developer the page. Nothing else.

**Dependencies.** `claude`, Node 22.18 or later (it runs the TypeScript scripts directly), `git`, and on macOS
`caffeinate` and `lsof`. `start` checks each one and names any that is missing; when it does, say so and stop. Never
drive the steps yourself in place of the runner.

`<skill>` below is this skill's folder: `.claude/skills/run-workflow` in a project that installs it.

## Start a run

1. Split `$ARGUMENTS`: the first word is the config path, the rest is the request.
2. Write the request with the Write tool, verbatim, to a new file outside the repo, such as
   `/tmp/run-workflow-request-<time>.md`. Every character, line break and quote is kept: the plan step reads it as
   the developer wrote it.
3. Run `node --no-warnings <skill>/scripts/run.ts start <config> --request-file <file>`. Add `--slot-in` only when
   the developer asks to answer the stops themselves; the default is speed, where the config's answers are sent.
4. Print what it printed, word for word: `run: <folder>` and `page: <address>`, or one line per problem. Stop.

- ❌ `Started. Here is what each step will do: …`
- ✅ `run: <runs>/20261104-220400-<name>` · `page: http://127.0.0.1:8790/`

A driver that stopped (a restart, a kill) is picked up with `node --no-warnings <skill>/scripts/run.ts resume <run
folder>`. It never sends a turn that already ended. `check <config>` reads a config and the tools and writes nothing.

## What this session does not do

The page is the status from the moment the run starts. Do not drive or answer steps, do not open another page or
server, and do not read the run's folder to report progress. Answers go on the page, never through this terminal. If
the developer asks how the run is going, give them the page address.

## Where things live

- **The config**: the project's own JSON file, usually untracked in its `.agents/`. Every field, its default and
  the blank shape are in `references/config.md`. Everything about the project lives there, never in this skill.
- **The run folder**: `<config's runs>/<YYYYMMDD-HHMMSS>-<name>/`, with `run.json`, the step logs, `decisions.jsonl`,
  `notes.md` and `report.md`. It is never inside the folder the steps run in.
- **The registry**: `~/.local/state/run-workflow/runs`, one run folder per line, so one page lists every run.
- **The page**: `http://127.0.0.1:8790/`, one per Mac. `start` opens it only when nothing answers there.

## The git hook

Every step runs with a hook on its shell commands, `scripts/deny-git-writes.ts`. It blocks any git command that
changes the repository or reaches a remote (commit, push, reset, checkout, stash and the like), however it is
written, and lets the reading ones run (diff, log, show, status, ls-files, rev-parse). It also blocks text that reads
as a git write, even inside quotes; the step reads why and can rephrase. A step that reports a git command blocked
was stopped by this hook, on purpose.
