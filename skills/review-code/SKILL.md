---
name: review-code
description: >-
  The gate after execute-plan. Gathers the change, delegates the scouring to the read-only
  code-reviewer agent, saves the report, and walks the developer through the findings one
  at a time. Use when asked to "review the code" or before raising a pull request; run it
  in a fresh session so the review is not done by the context that wrote the code.
argument-hint: "[path to the execution report]"
---

# review-code — the gate after execute-plan

## Execution report: $ARGUMENTS

Decide whether this implementation is ready to raise for review.

You gather the change and triage what comes back. The `code-reviewer` agent does the
scouring. It is read-only by construction, so it cannot quietly fix what it finds, and
its findings arrive as a report rather than as edits you have to go looking for.

## 1. Gather

Read the execution report at `$ARGUMENTS`. Its `**Plan**:` line gives the plan path.

Then collect the change against the branch this work forked from:

```bash
base=$(git merge-base HEAD "$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|origin/||' || echo main)")
git diff --stat "$base"
git diff --name-only "$base"
git ls-files --others --exclude-standard
```

If that base looks wrong, ask which branch to diff against rather than reviewing the
wrong range.

## 2. Delegate

Spawn the `code-reviewer` agent with the execution report path, the plan path, the
changed and new file list, and the diffstat numbers.

**Don't review the code yourself first.** The agent's separate context is the point, and
reading the diff here spends what spawning it was meant to save.

## 3. Save

Save the agent's report to `.agents/code-reviews/<plan-slug>.md` and print it.

## 4. Triage

- **blocking** — raise it with the developer one at a time and agree the fix before
  moving on
- **minor** — fix it yourself and say what you changed
- **questions** — put them to the developer, one at a time. They are not findings

A finding against the plan rather than the code is always raised, never fixed quietly.
Changing the design is the developer's call, whatever its severity.

Fix nothing blocking without the developer's approval.

## Note

This skill assumes the `code-reviewer` agent is installed alongside it. Without that
agent, say so and stop — reviewing the diff in this context defeats the purpose.
