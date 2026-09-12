---
name: hooks-create
description: >-
  Author a working Claude Code hook from a plain-English description of what it should
  guarantee or do — picks the lifecycle event, writes the script, wires it into
  .claude/settings.json, and proves it fires. Use when asked to "add a hook", "make sure
  the agent never X", "don't let it stop until Y passes", or "run Z every time W happens".
argument-hint: "[what the hook should do]"
---

# hooks-create — turn an idea into a hook that actually fires

## What it should do: $ARGUMENTS

If that is filled in, it is the behavior spec — start from it. Don't re-ask what the
operator already said; ask only to pin down the gaps (the exact paths, commands, or
patterns, and whether it must **block**). If it is blank, start at step 1.

## What a hook is

A hook is deterministic code the harness runs at a defined **lifecycle event**. Unlike a
skill, **the model does not choose to invoke it** — it fires whether the model remembers or
not. That is the whole point: a rule *asks* the agent to behave; a hook **guarantees** it,
at a layer the model cannot talk its way around.

## The one thing to get right: which event, and can it block?

| The operator wants to… | Event | Can it block? |
|---|---|---|
| **Stop the agent doing something** — read a secret, edit a protected path, run a destructive command | **PreToolUse** ⭐ | **Yes** |
| **React after an action** — format an edited file, log a command, inject context | **PostToolUse** | No |
| **Keep work from being "done" until a check passes** — tests, lint, types | **Stop** / **SubagentStop** | **Yes** |
| **Gate or scan the prompt** before the model sees it | **UserPromptSubmit** | **Yes** |
| **Load context at session start** | **SessionStart** | No |
| **Get notified** when the agent needs input or finishes | **Notification** / **Stop** | No |
| **Snapshot state before compaction** | **PreCompact** | No |

> **Pre = guarantee/gate. Post = react/log.** "Make sure X never happens" or "don't finish
> until Y" is a blocking hook. "Do Z when W happens" is an observe/react hook.

## Workflow

### 1. Understand the idea

Pin down two things in plain language, asking only for what is missing:

- **What** should happen or be prevented, and **when**?
- **How precisely** should it match — the concrete paths, commands, or patterns? The
  guarantee is only as good as what it matches, so don't guess. If the ask is vague,
  propose a concrete interpretation and confirm it.

### 2. Read the current docs

The event list and the stdin/stdout contract **evolve** — don't ship from a snapshot.
Fetch and confirm the event name, its input fields, and its control protocol:

- Reference: https://code.claude.com/docs/en/hooks
- Guide with examples: https://code.claude.com/docs/en/hooks-guide

If the fetch fails, proceed from the table above and **say so** in the report.

### 3. Pick the event and a narrow matcher

One event. Scope the matcher tightly — for tool events, the tool names (`"Bash"`,
`"Edit|Write"`, `"mcp__.*"`). Empty or `"*"` fires on everything and taxes every tool call.

### 4. Write the script

- Default to a **dependency-free script** at `.claude/hooks/<name>`, run by an interpreter
  the project already has. Read stdin, parse the JSON, decide.
- To **block**: write one actionable line to stderr and **exit 2**. To **allow**: **exit 0**.
  Any other exit code is a non-blocking error and must never be used to signal a decision.
- **Fail open.** Wrap the body so any unexpected error exits 0. A broken hook must never
  brick a session. The only intentional non-zero exit is the deliberate block.
- **Idempotent and fast.** Hooks fire on resumes and retries too; running twice must equal
  running once. Anything slower than a second needs a tighter matcher or an async hook.
- **`${CLAUDE_PROJECT_DIR}`-relative paths only** — never an absolute path, never `$HOME`.
- If a hook already exists for that event, **extend it** rather than overwrite it.
- Running a project command (tests, lint, build): put it in **one named constant at the top
  of the file** so the operator can edit one obvious line, and run it in the project
  directory. Getting the directory wrong produces a hook that always blocks, which reads as
  "hooks are broken".
- **Blocking `Stop`/`SubagentStop` hooks need a bound you count yourself** — and
  `stop_hook_active` is *not* it. See `references/hook-contract.md`; this one has bitten
  before and looks like a working gate right up until it isn't.

### 5. Wire it into settings.json

Edit `.claude/settings.json`, creating it if absent. **Merge** into any existing `hooks`
block — never clobber other events or other hooks on the same event. Give every hook an
explicit `timeout`.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "<interpreter> \"${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 6. Prove it, then explain it

**Run the hook before handing it over.** Feed it a fabricated payload on stdin for each
exit path and print the exit code. Do not ship a hook you have only read — one that always
blocks and one that never blocks look identical until they fire at the wrong moment.

```bash
echo '{"session_id":"t","cwd":"<project-root>","hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{}}' \
  | <interpreter> .claude/hooks/<name>; echo "exit=$?"
```

- **A blocking guard**: one payload that must be blocked, one that must pass.
- **A command-running hook**: check **both** directions — exit 0 while the command passes,
  exit 2 once it genuinely fails. Exit 2 in both states means the command or its directory
  is wrong.
- **An internal error**: malformed stdin must exit 0, silently.

If a check comes back wrong, fix the script and re-run before reporting success.

Then tell the operator, in plain words: what you built, which event, what it guarantees,
and the one line to change to adjust it. Give them a way to prove it themselves — for a
blocking hook, an action that should be refused; for an observe hook, where the output
lands. Report what you verified and say plainly what you could not.

**Security note (always say this):** a hook runs arbitrary code automatically, with the
operator's credentials, on every matching event. Review hooks like CI config; only run
hooks you trust.

## Quality checks

- ✅ The behavior maps to the **right event**, and a blocking goal uses a **blocking-capable**
  one — not PostToolUse
- ✅ The **matcher is narrow** — it does not fire on everything by accident
- ✅ The script **fails open**; the only exit 2 is the intended block, with a clear reason
- ✅ A project command runs from **one named constant**, in the right directory
- ✅ A blocking `Stop` hook is bounded by **a counter it keeps itself**, cleared when checks pass
- ✅ `settings.json` was **merged**, not overwritten; every hook has an explicit `timeout`
- ✅ **You ran it** and confirmed all three exit paths — not just read it
- ✅ The operator got a plain-English explanation, a way to test it, and the security note

## Notes

- Hooks are the deterministic floor. Use them for the non-negotiables — secrets, protected
  paths, "don't finish until green" — not for what a skill handles well enough.
- A blocking hook's *coverage* is only as good as its matcher. It guarantees the hook
  **runs**; you decide what it catches. Be honest about the edges.
- `references/hook-contract.md` holds the stdin/stdout contract, the JSON control protocol,
  and the Stop-hook bounding rule in full.
