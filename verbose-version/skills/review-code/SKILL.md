---
name: review-code
description: The gate after execute-plan. Gathers the change, delegates the scouring to the read-only code-reviewer agent, saves the report, and walks the developer through the findings one at a time. Run it in a fresh session so the review is not done by the context that wrote the code.
argument-hint: "[path to the execution report, e.g. .agents/execution-reports/archive-provider-report.md]"
---

# Code Review: $ARGUMENTS

The gate after execute-plan. Decide whether this implementation is ready for an MR.

You gather the change and triage what comes back. The `code-reviewer` agent does the scouring. It
is read-only by construction, so it cannot quietly fix what it finds, and its findings arrive as a
report rather than as edits you have to go looking for.

## 1. Gather

Read the execution report at `$ARGUMENTS`. Its `**Plan**:` line gives the plan path.

Then collect the change:

```bash
git diff --stat $(git merge-base master HEAD)
git diff --name-only $(git merge-base master HEAD)
git ls-files --others --exclude-standard
```

## 2. Delegate

Spawn the `code-reviewer` agent with the execution report path, the plan path, the changed and new
file list, and the diffstat numbers.

Don't review the code yourself first. The agent's separate context is the point, and reading the
diff here spends what spawning it was meant to save.

## 3. Save

Save the agent's report to `.agents/code-reviews/<plan-slug>.md` and print it.

## 4. Triage

- **blocking** - raise it with the developer one at a time and agree the fix before moving on
- **minor** - fix it yourself and say what you changed
- **questions** - put them to the developer, one at a time. They are not findings

A finding against the plan rather than the code is always raised, never fixed quietly. Changing
the design is the developer's call, whatever its severity.

Fix nothing without the developer's approval.
