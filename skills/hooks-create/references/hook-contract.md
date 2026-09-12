# The hook execution protocol

Confirm all of this against the current docs before shipping — the contract evolves.
This file is the working reference, not the source of truth.

- Reference: https://code.claude.com/docs/en/hooks
- Guide: https://code.claude.com/docs/en/hooks-guide

## Input

The harness passes one JSON object on **stdin**. Always present:

- `session_id` — stable for the life of the session; the only safe key for per-session state
- `cwd` — the directory the session is running in
- `hook_event_name`

Event-specific fields include `tool_name` and `tool_input` (tool events), `prompt`
(UserPromptSubmit), `source` (SessionStart), and `stop_hook_active` (Stop).

## Output and control

| Exit | Meaning |
|---|---|
| `0` | Allow / success. For `UserPromptSubmit` and `SessionStart`, stdout is injected into the agent's context. |
| `2` | **Block.** The action is prevented and **stderr** is fed back to the agent as the reason, so it can adapt. Only blocking-capable events honor this. |
| anything else | Non-blocking error. Shown to the user; execution continues. **Never use this to signal a decision.** |

Exit 0 with no output means "no opinion".

**JSON control (advanced).** Instead of exit codes, print a JSON object on stdout — for
example `{"decision":"block","reason":"…"}` for Stop, or:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "…"
  }
}
```

Prefer the exit-code form unless you need to *modify* input or output, or inject context
with `additionalContext`. Decisions go in JSON on stdout or in the exit code — **never in
prose**. Verify field names against the fetched docs.

## Bounding a blocking Stop hook

A blocking `Stop` / `SubagentStop` hook needs a bound, or it can block forever: it blocks
the stop, the agent works, tries to stop again, is blocked again.

**`stop_hook_active` is the wrong bound.** It is a **boolean, not a counter**. It goes true
on the very first retry and stays true, so `exit 0` when it is true means the hook blocks
**exactly once per session** and waves every later stop through — checks red or not. This
has been observed live: a session finished with a failing test sitting in the tree. It
looks exactly like a working gate.

Instead, **count the attempts yourself**:

1. Keep a small per-session counter keyed on `session_id`, under `.claude/hooks/.gate-state/`.
2. Allow the stop once the count passes a cap of about 3.
3. **Delete the counter as soon as the checks go green**, so the next run starts clean.
4. When the cap is what let the stop through, say so plainly in the message: the bound gave
   up, the checks did not pass. Silence here reads as success.

Keep the state directory out of version control.

## Two homes for a hook

- **Skill-scoped** — declared under `hooks:` in a SKILL.md's frontmatter. Registered when
  the skill is invoked, gone when it ends. Use for behavior that only makes sense while
  that skill is active; `once: true` for one-shot setup.
- **Standalone** — a script plus a `hooks.json` fragment pasted into the project's
  `.claude/settings.json`. Use for rules that hold across the whole project regardless of
  which skill is running.

A hook belongs to a skill when the skill's procedure has a step that says "always" or
"never". Move that step into the hook, then have the skill state that the hook exists and
what it enforces, so a session that sees it fire knows why. The skill must still work with
the hook absent; the hook only tightens it.
