---
name: hooks-create
description: >-
  Author a working Claude Code hook from a plain-English description of what it should
  guarantee or do. It picks the lifecycle event, writes the script, adds it to
  .claude/settings.json, and proves it fires. Use when asked to "add a hook", "make sure
  the agent never X", "don't let it stop until Y passes", or "run Z every time W happens".
argument-hint: "[what the hook should do]"
---

# hooks-create: turn an idea into a hook that actually fires

## What it should do: $ARGUMENTS

If that is filled in, it is the behavior spec. Start from it. Don't re-ask what the
developer already said. Ask only about the gaps: the exact paths, commands, or patterns,
and whether it must **block**. If it is blank, start at step 1.

## What a hook is

A hook is code that Claude Code always runs at a defined **lifecycle event**. Unlike a
skill, **the model does not choose to invoke it**. It fires whether the model remembers or
not. A rule *asks* the agent to behave. A hook **guarantees** it, at a level the model
cannot get around.

## The one thing to get right: which event, and can it block?

| The developer wants to… | Event | Can it block? |
|---|---|---|
| **Stop the agent doing something** (read a secret, edit a protected path, run a destructive command) | **PreToolUse** ⭐ | **Yes** |
| **React after an action** (format an edited file, log a command, inject context) | **PostToolUse** | No |
| **Keep work from being "done" until a check passes** (tests, lint, types) | **Stop** / **SubagentStop** | **Yes** |
| **Block or scan the prompt** before the model sees it | **UserPromptSubmit** | **Yes** |
| **Load context at session start** | **SessionStart** | No |
| **Get notified** when the agent needs input or finishes | **Notification** / **Stop** | No |
| **Save a snapshot of state before compaction** | **PreCompact** | No |

> **Pre events guarantee or block. Post events react or log.** "Make sure X never happens"
> or "don't finish until Y" is a blocking hook. "Do Z when W happens" is a hook that
> watches and reacts.

## Workflow

### 1. Understand the idea

Settle two things in plain language. Ask only for what is missing:

- **What** should happen or be prevented, and **when**?
- **How precisely** should it match? Get the concrete paths, commands, or patterns. The
  guarantee is only as good as what it matches, so don't guess. If the request is vague,
  propose a concrete reading and confirm it.

### 2. Read the current docs

The event list and the stdin/stdout contract **change over time**. Do not rely on an old
copy. Fetch the docs and confirm the event name, its input fields, and its control protocol:

- Reference: https://code.claude.com/docs/en/hooks
- Guide with examples: https://code.claude.com/docs/en/hooks-guide

If the fetch fails, proceed from the table above and **say so** in the report.

### 3. Pick the event and a narrow matcher

Pick one event. Keep the matcher tight. For tool events, name the tools (`"Bash"`,
`"Edit|Write"`, `"mcp__.*"`). Empty or `"*"` fires on everything and adds a cost to every
tool call.

### 4. Write the script

- Default to a **dependency-free script** at `.claude/hooks/<name>`. Run it with an
  interpreter the project already has. The script reads stdin, parses the JSON, and decides.
- To **block**: write one clear line to stderr that the agent can act on, and **exit 2**.
  To **allow**: **exit 0**. Any other exit code is a non-blocking error. Never use it to
  signal a decision.
- **Fail open.** Wrap the body so any unexpected error exits 0 and lets the action through.
  A broken hook must never make a session unusable. The only intentional non-zero exit is
  the deliberate block.
- **Safe to run twice, and fast.** Hooks fire on resumes and retries too. Running twice must
  equal running once. Anything slower than a second needs a tighter matcher or an async hook.
- **Use only paths relative to `${CLAUDE_PROJECT_DIR}`.** Never an absolute path, never
  `$HOME`.
- If a hook already exists for that event, **extend it** rather than overwrite it.
- To run a project command (tests, lint, build), put it in **one named constant at the top
  of the file**, so the developer edits one obvious line. Run it in the project directory.
  In the wrong directory the hook always blocks, and that looks like "hooks are broken".
- **Blocking `Stop`/`SubagentStop` hooks need a retry limit that you count yourself.**
  `stop_hook_active` is *not* that limit. See `references/hook-contract.md`. This mistake
  has happened before. It looks like a working check until the moment it fails.

### 5. Wire it into settings.json

Edit `.claude/settings.json`, creating it if it is missing. **Merge** into any existing
`hooks` block. Never overwrite other events or other hooks on the same event. Give every
hook an explicit `timeout`.

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

**Run the hook before handing it over.** Feed it a made-up JSON input on stdin for each
outcome, and print the exit code. Do not ship a hook you have only read. One that always
blocks and one that never blocks look identical until they fire at the wrong moment.

```bash
echo '{"session_id":"t","cwd":"<project-root>","hook_event_name":"PreToolUse","tool_name":"Edit","tool_input":{}}' \
  | <interpreter> .claude/hooks/<name>; echo "exit=$?"
```

- **A blocking guard**: one input that must be blocked, and one that must pass.
- **A command-running hook**: check **both** directions. It exits 0 while the command
  passes, and exits 2 once it genuinely fails. Exit 2 in both states means the command or
  its directory is wrong.
- **An internal error**: broken input on stdin must exit 0, with no output.

If a check comes back wrong, fix the script and re-run it before reporting success.

Then tell the developer, in plain words:

- what you built, which event it uses, and what it guarantees
- the one line to change to adjust it
- how to prove it themselves. For a blocking hook, that is an action that should be
  refused. For a hook that watches, it is where the output lands.
- what you verified, and plainly what you could not

**Security note (always say this):** a hook runs any code automatically, with the
developer's credentials, on every matching event. Review hooks like CI config. Only run
hooks you trust.

## Quality checks

- ✅ The behavior maps to the **right event**. A blocking goal uses an event that **can
  block**, not PostToolUse.
- ✅ The **matcher is narrow**. It does not fire on everything by accident.
- ✅ The script **fails open**. The only exit 2 is the intended block, with a clear reason.
- ✅ A project command runs from **one named constant**, in the right directory.
- ✅ A blocking `Stop` hook is limited by **a counter it keeps itself**, cleared when checks
  pass.
- ✅ `settings.json` was **merged**, not overwritten. Every hook has an explicit `timeout`.
- ✅ **You ran it** and confirmed all three outcomes. You did not just read it.
- ✅ The developer got a plain-English explanation, a way to test it, and the security note.

## Notes

- Hooks are the rules that always hold. Use them for the rules that cannot bend (secrets,
  protected paths, "don't finish until green"). Do not use them for what a skill handles
  well enough.
- A blocking hook's *coverage* is only as good as its matcher. It guarantees the hook
  **runs**. You decide what it catches. Be honest about what it misses.
- `references/hook-contract.md` holds the stdin/stdout contract, the JSON control protocol,
  and the full rule for limiting a Stop hook.
