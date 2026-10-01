# Wrong `file:line` citations: what the tools print

Saved 2026-10-01 to come back to. Nothing here is built yet.

## The problem

Plans, research reports, and plan reviews cite `file:line`, and some of the numbers are wrong.
The planner gets them wrong and `plan-reviewer` misses some and gets some wrong itself.

## What each harness's tools print

Checked against the installed Pi source, `@earendil-works/pi-coding-agent` 0.85.1, in
`dist/core/tools/`.

| Tool | Pi | Claude Code |
|------|----|-------------|
| read | Takes `offset` and `limit`. Returns the raw lines with **no line numbers**. Caps at 2,000 lines or 50KB. (`read.js`) | Numbers every line. The numbers stay the file's real numbers on a partial read. |
| grep | Prints `path:line: text` with real line numbers, context lines included. (`grep.js`) | Prints matching lines with file and line number in content mode. |
| shell | `cat -n a b` keeps counting across files. `sed -n '40,60p' f \| grep -n` counts from the start of the slice. Plain `cat` and `sed -n` print no numbers at all. | Same. |

So in Pi the only views with real numbers are the `grep` tool and a shell command run on one
whole file. Pushing Pi agents onto `read` would not fix citations.

## Pi extension points

From `docs/extensions.md` in the Pi package:

- An extension can replace a built-in tool (`read`, `bash`, `edit`, `write`, `grep`, `find`,
  `ls`) by registering a tool with the same name. Example: `examples/extensions/tool-override.ts`.
  This is how `read` could be made to print line numbers.
- A `tool_call` handler can block a call by returning `{ block: true, reason }`. This is Pi's
  version of a Claude Code `PreToolUse` hook.

The existing `require-read-before-edit` hook is registered in `.claude/settings.json` only. It
blocks shell writes, not shell reads, and nothing in `.pi` loads it.

## What the saved plan runs show

Eleven Claude Code runs of `generate-plan` from 2026-09-30: 308 Bash calls against 180 Read
calls. Of the shell commands that viewed code, 114 used plain `cat` and 89 used `sed -n`
slices, which print no numbers. Individual wrong citations were not traced back to commands.

## How other people handle it

1. Have the model quote the line and let code find the number. Proposed in
   [GitLab #492104](https://gitlab.com/gitlab-org/gitlab/-/issues/492104),
   [coderev #76](https://github.com/srivastava-ami/coderev/issues/76), and
   [nitbot #11](https://github.com/Zenb0t/nitbot/issues/11) (a `check-citations` script).
2. Give the model numbered lines to copy.
   [microsoft/agent-framework #7669](https://github.com/microsoft/agent-framework/pull/7669)
   added a `read_lines` tool for this.
3. Block shell file-reading with a hook that points at the read and search tools. Details
   below.
4. Cite a symbol and file instead of a line.
   [agent-harness #966](https://github.com/Consiliency/agent-harness/issues/966) found plan
   anchors about 3,000 lines stale after merges.

### The hook in item 3

Claude Code does not do this on its own. It is a script you add.

- **What it is:** a `PreToolUse` hook on Bash. It runs before every Bash call. If the command
  is `cat`, `sed`, `head`, `tail`, or `grep`, it rejects the call and tells the agent to use
  the read or search tool. Every other Bash command passes.
- **Where it comes from:** a community
  [write-up](https://dev.to/yurukusa/claude-code-ignores-its-own-tools-here-are-3-hooks-that-force-it-to-behave-mi1)
  from April 2026, not Anthropic. The write-up does not say whether the hook fires inside
  subagents.
- **Why people built it:** Claude Code issues
  [#19649](https://github.com/anthropics/claude-code/issues/19649),
  [#21697](https://github.com/anthropics/claude-code/issues/21697), and
  [#39979](https://github.com/anthropics/claude-code/issues/39979) report the model and its
  subagents reading files through the shell even though the system prompt says to use the
  dedicated tools. One reporter saw it in about 40% of 200+ sessions. The issues were closed
  as duplicate or not planned.
- **What the Claude Code docs show:** only the mechanism. An agent file can declare its own
  `PreToolUse` hook on Bash in its frontmatter. The docs example checks database queries. It
  is not a file-reading block.
- **How it relates to ours:** same kind of hook as `require-read-before-edit`. Ours blocks
  shell writes. This one would block shell reads.

## Direction for now

Decided 2026-10-01: no hook and no script yet. A plain instruction in the skill and agents
that names the tool to read files with.

What is verified about which tool prints real line numbers:

- Claude Code Read: yes, including on a partial read. Seen in a session and stated in the
  tools reference.
- Claude Code Grep, content mode: yes, per the tools reference.
- Pi `grep`: yes, read in the source.
- Pi `read`: no. Read in the source.

So "read files with the read tool" gives real numbers in Claude Code only. In Pi the numbers
have to come from `grep`.

Decided the same day: write the rule for Claude Code and do not work around Pi in the skill.
`generate-plan` now says to read the file with the read tool and copy each line number from
that output. If Pi turns out to be a problem, the fix is to make Pi's `read` print line
numbers.

Not verified: whether one instruction changes what the agents do. The issues above say the
same instruction in Claude Code's system prompt is ignored in some sessions, more often in
subagents. Rerunning the saved plan features and counting Read against shell reads would
answer it.

## Open questions

- Should the skills say where a line number comes from (a search hit on the line's text)
  instead of naming commands to avoid? The current `generate-plan` bullet bans `grep -n`
  output, and in Pi a search is the only numbered view.
- Is a Pi extension that numbers `read` output worth building, or is the search rule enough?
- Does a hook that blocks shell reads grow context? Both read tools take a start line and a
  count, so it should not if the message says to use them. Not measured.
- Does a citation check on the written plan belong in a hook, in `plan-reviewer`, or both?
