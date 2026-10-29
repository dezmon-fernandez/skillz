# annotate: to do

Saved 2026-10-28 to come back to. Nothing here is built yet.

## The problem

Each annotate page is a helper process that serves until the developer presses Send. Nothing
closes a page once its work is done. One long Claude Code session opened eight pages in a day,
through a `/clear`, and only one was still in use. Each had to be found with `pgrep` and closed
by hand.

In Pi it is worse. Pi's docs (1.0.4) describe no way for the model to run a shell command in
the background, so the skill's fallback runs the helper in the foreground, and the session
waits until Send.

## 1. The helper closes with its session (any harness)

Planned for the skillz session that wrote this, after its Story B run. Check
`git log -- skills/annotate` before starting: it may already be done.

- The helper exits once the session that started it is gone. Its parent is the harness's
  shell, whose parent is the session's process. When that process ends, the helper's parent
  becomes process 1, so a check every few seconds for `process.ppid === 1` is enough.
- When it starts, the helper prints one line for each other annotate page already open: its
  address and its files. The session then sees the pile without having to remember to look.
- One sentence in `skills/annotate/SKILL.md`: when a page's files are committed or replaced by a
  newer page, ask the developer whether to close it, and say which.
- Test each exit path by hand, as `CLAUDE.md` asks for hooks: parent gone, other pages open,
  none open.

## 2. A Pi extension for annotate

What it would do:

- Give the model a tool that opens a page on files, with the same options as the helper
  (`--base`, `--reply`). The extension starts the helper and remembers every page it opened.
- When the developer presses Send, put the comments into the session as a message with
  `pi.sendUserMessage()`, so nothing waits in the foreground.
- Close every page the session opened in a `session_shutdown` handler. Keep it idempotent.
- Add an `/annotate` command that lists the open pages and closes one.

The extension wraps the existing helper (`skills/annotate/scripts/annotate.ts`) and adds no
page logic of its own, so there is still one annotate to maintain.

What Pi provides, read from its installed docs, version 1.0.4
(`~/.pi/agent/install/releases/1.0.4/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`):

- Extensions are TypeScript files in `~/.pi/agent/extensions/` (or a project's), loaded
  without a build step. A folder needs an `index.ts`.
- Start long-lived processes in `session_start` or in the tool that needs them, never in the
  extension's factory, because some runs load extensions without starting a session.
- Close session resources in `session_shutdown`, idempotently.
- `pi.registerTool()` adds a tool the model can call. `pi.registerCommand()` adds a `/`
  command. `pi.sendUserMessage()` and `pi.sendMessage()` put a message into the session.
- Exact types: `extensions/types.ts` in the Pi repo (linked from that page).

## Keeping one set of skills for both harnesses

Read from the same Pi docs (`skills.md`) and its bundled examples:

- Pi reads the same `SKILL.md` format (the Agent Skills specification), including
  `disable-model-invocation`. It looks in `.agents/skills/`, `~/.agents/skills/`, and its own
  folders, not in `.claude/skills/`. One copy in skillz can be installed into both.
- Pi has no built-in subagents, and the planning skills depend on them. Its bundled example
  extension `examples/extensions/subagent/` runs each agent as its own Pi process. Its agent
  files carry the same frontmatter as skillz's (`name`, `description`, `tools`, `model`), but
  its tool names are lowercase (`read, grep, find, ls, bash`), where skillz writes
  `Read, Grep, Glob, Bash`. It finds agents in a project's `.pi/agents/` and in
  `~/.pi/agent/agents/`.
- The parts that are Claude Code only, where the two would split:
  - `$ARGUMENTS`. Pi adds the arguments after `/skill:name` as a message instead.
  - The `!` commands that run before the model reads a skill, such as `prime`'s.
  - Hooks declared in a skill's frontmatter.
  - annotate's wake-up on Send, which part 2 covers.
- To check first: how Pi resolves a skill's relative paths, such as
  `.claude/skills/annotate/scripts/annotate.ts` in the annotate skill, which names Claude
  Code's folder.
