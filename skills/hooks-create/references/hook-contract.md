# The hook execution protocol

The lookup reference for `hooks-create`: what a hook receives, how it answers, and how to
limit a blocking Stop hook. A hook written against the wrong contract never blocks, blocks
forever, or fails silently.

Confirm all of this against the current docs before shipping. The contract changes over
time. This file is the working reference, not the source of truth.

- Reference: https://code.claude.com/docs/en/hooks
- Guide: https://code.claude.com/docs/en/hooks-guide

## Input

Claude Code passes one JSON object on **stdin**. These fields are always present:

- `session_id`: stable for the life of the session. It is the only safe key for
  per-session state.
- `cwd`: the directory the session is running in.
- `hook_event_name`

Event-specific fields include `tool_name` and `tool_input` (tool events), `prompt`
(UserPromptSubmit), `source` (SessionStart), and `stop_hook_active` (Stop).

## Output and control

| Exit | Meaning |
|---|---|
| `0` | Allow, or success. For `UserPromptSubmit` and `SessionStart`, stdout is added to the agent's context. |
| `2` | **Block.** The action is prevented. **stderr** is sent back to the agent as the reason, so it can adapt. Only events that can block honor this. |
| anything else | Non-blocking error. It is shown to the user, and execution continues. **Never use this to signal a decision.** |

Exit 0 with no output means "no opinion".

**JSON control (advanced).** Instead of exit codes, print a JSON object on stdout. For
example, `{"decision":"block","reason":"…"}` for Stop, or:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "…"
  }
}
```

Prefer the exit-code form unless you need to *modify* input or output, or add context with
`additionalContext`. Decisions go in JSON on stdout or in the exit code, **never in prose**.
Verify field names against the fetched docs.

## Bounding a blocking Stop hook

A blocking `Stop` / `SubagentStop` hook needs a limit. Without one, the agent works, tries
to stop again, and is blocked again, forever.

**`stop_hook_active` is the wrong limit.** It is a **boolean, not a counter**. It turns
true on the first retry and stays true. A hook that runs `exit 0` when it is true blocks
**exactly once per session**. After that it lets every stop through, even when the checks
fail. This happened in a real session: it finished with a failing test in the tree. It looks
exactly like a working check.

Instead, **count the attempts yourself**:

1. Keep a counter per session, keyed on `session_id`, under `.claude/hooks/.gate-state/`.
2. Allow the stop once the count passes a limit of about 3.
3. **Delete the counter as soon as the checks pass**, so the next run starts clean.
4. When the limit let the stop through, say so plainly in the message: the limit gave up,
   and the checks did not pass. Saying nothing looks like success.

Keep the state directory out of version control.

## Two homes for a hook

- **Skill-scoped**: declared under `hooks:` in a SKILL.md's frontmatter. It is registered
  when the skill is invoked and removed when the skill ends. Use it for behavior that only
  makes sense while that skill is active. Use `once: true` for one-time setup.
- **Standalone**: a script plus a `hooks.json` fragment pasted into the project's
  `.claude/settings.json`. Use it for rules that hold across the whole project, whatever
  skill is running.

A hook belongs to a skill when the skill's procedure has a step that says "always" or
"never". Move that step into the hook. Then have the skill state that the hook exists and
what it enforces, so a session that sees it fire knows why. The skill must still work
without the hook. The hook only makes it stricter.
