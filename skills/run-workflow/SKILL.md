---
name: run-workflow
disable-model-invocation: true
argument-hint: "<config path> <request>"
description: >-
  Start a project's workflow (the steps its run config names, such as prime, plan, build and review) running end to
  end, each step in its own Claude Code session, with every decision logged and a status page where the developer
  follows it, answers each decision in human approval, and opens runs side by side. Runs only when the developer types `/run-workflow <config> <request>`, never on its own,
  because every step spends the account's usage.
---

# run-workflow: start a run, then hand over to the page

`$ARGUMENTS` is a config path, then the request. The run's driver works detached: it runs each step the config names
in its own `claude -p` session, answers or waits as the config says, has a read-only watcher note what to improve
after every turn, and has a read-only reporter write one report at the end. The status page shows all of it. Your
job is to start the run and give the developer the page. Nothing else.

`<skill>` below is this skill's folder: `.claude/skills/run-workflow` in a project that installs it.

## Dependencies

- `claude`, `git`, and Node 22.18 or later, which runs the TypeScript scripts directly.
- On macOS, `caffeinate` (keeps the Mac awake through a step) and `lsof` (finds what holds a port).
- The `deny-git-writes` hook, from this kit's `hooks/deny-git-writes/`, installed as `.claude/hooks/deny-git-writes.ts`
  beside the `.claude/skills/` that holds this skill. The runner passes it to every step itself; the project need not
  register it in its own settings.

`start` and `resume` check each one and print `missing: <what>` for any that is absent. Print those lines, then stop.
Never start or drive the steps yourself in place of the runner: a run without the hook lets a step commit or push.

## Start a run

1. Split `$ARGUMENTS`: the first word is the config path, the rest is the request.
2. Write the request with the Write tool, verbatim, to a new file outside the repo, such as
   `/tmp/run-workflow-request-<time>.md`. Keep every character, line break and quote: the plan step reads it as the
   developer wrote it.
3. Run `node --no-warnings <skill>/scripts/run.ts start <config> --request-file <file>`. It takes no mode flag. The
   config's `"mode"` says how the run answers its stops: `"autonomous"`, the default, sends the config's answers and
   the developer reviews after; `"human-approval"` brings each decision to the developer on the page. The page
   switches a run between them at any time.
4. Print what it printed, word for word: `run: <folder>` and `page: <address>`, or one line per problem. Stop.

`start` refuses, before any session or cost, a step prompt whose `/<skill>` is not installed for the workdir
(`missing: the skill <name> in <workdir>/.claude/skills`), and a workdir or port another going run holds
(`<workdir> is in use by run <id>`, `port <n> is in use by run <id>`). Print those lines too; never work around
them.

- ❌ `Started. Here is what each step will do: …`
- ✅ `run: <runs>/20261104-220400-<name>` · `page: http://127.0.0.1:8790/`

A driver that stopped (a restart, a kill) is picked up with `node --no-warnings <skill>/scripts/run.ts resume <run
folder>`. It never sends a turn that already ended, and it refuses, as `start` does, a workdir or port another going run
holds. A run is going while its driver is alive, or while the claude of a turn its stopped driver left still runs.
`check <config>` reads a config and the dependencies and writes nothing.

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
- **The page**: `http://127.0.0.1:8790/`, one per Mac. `start` opens it only when nothing answers there. Tick runs in
  its run list and press "Side by side", or open `/?runs=<id>&runs=<id>`, to see them in columns.
- **The watcher's and reporter's instructions**: `prompts/watcher.md` and `prompts/reporter.md`. Each is passed as
  the system prompt of its own `claude -p` session; neither is a subagent.

## The git hook

Every step runs with `deny-git-writes` on its shell commands. Only git commands it knows to be read-only run: diff,
log, show, status, ls-files, rev-parse, merge-base and the like, and the reading forms of branch, tag, remote,
config and stash. Any other git command is blocked, however it is written, including an alias or an external command
such as `git lfs push`, with a line that says the hook did not recognize it as read-only. Text that reads as a git
write is blocked even inside quotes. A step that reports a git command blocked was stopped by this hook, on purpose.
