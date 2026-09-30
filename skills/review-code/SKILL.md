---
name: review-code
description: >-
  The gate after execute-plan. It gathers the change, hands the close review to the
  read-only code-reviewer agent, saves the report, and walks the developer through the
  findings one at a time. Use when asked to "review the code" or before raising a pull
  request. Run it in a fresh session so the review is not done by the session that wrote
  the code.
argument-hint: "[path to the execution report]"
---

# review-code: the gate after execute-plan

## Execution report: $ARGUMENTS

Goal: decide whether this implementation is ready to raise for review.

You gather the change and sort the findings. The `code-reviewer` agent does the close review. It is read-only, so it cannot quietly fix what it finds. You get a report, not edits to hunt for.

## 1. Gather

Read the execution report at `$ARGUMENTS`. Its `**Plan**:` line gives the plan path.

Then collect the change against the branch this work started from:

```bash
base=$(git merge-base HEAD "$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|origin/||' || echo main)")
git diff --stat "$base"
git diff --name-only "$base"
git ls-files --others --exclude-standard
```

If the base looks wrong, ask which branch to compare against. Do not review the wrong range.

## 2. Delegate

Start the `code-reviewer` agent. Give it:

- the execution report path
- the plan path
- the changed and new file list
- the diffstat numbers

**Don't review the code yourself first.** The agent works in its own session. Reading the diff here throws away what starting the agent buys.

## 3. Save

Save the agent's report to `.agents/code-reviews/<plan-slug>.md` and print it.

## 4. Triage

Sort each finding by severity:

- **blocking**: raise it with the developer one at a time. Agree the fix before moving on.
- **minor**: fix it yourself and say what you changed.
- **questions**: put them to the developer one at a time. They are not findings.

Then sort each finding by its `fix goes` field. This is a separate question from severity:

- **code**: fix it in this change.
- **plan**: the plan caused this defect. Say so, and say what the plan should have said. Changing the design is the developer's call, at any severity. Always raise it. Never fix it quietly.
- **standards**: the project has no convention for this, so the defect will come back. Report it as a standards change for the developer to make.

A defect can come from the plan or from a missing convention. A fix applied only to this change then leaves the next change to repeat it.

Fix nothing blocking without the developer's approval.

## Note

This skill needs the `code-reviewer` agent installed alongside it. If the agent is missing, say so and stop. Reviewing the diff in this session defeats the purpose.
