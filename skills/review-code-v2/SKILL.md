---
name: review-code-v2
disable-model-invocation: true
description: >-
  The gate after execute-plan-v2. It gathers the change, hands the close review to the
  read-only code-reviewer-v2 agent, saves the report, fixes every finding that has one sound
  fix, and asks the developer only what is theirs to decide. Use when asked to "review the
  code" or before raising a pull request. Run it in a fresh session so the review is not
  done by the session that wrote the code.
argument-hint: "[path to the execution report]"
---

# review-code-v2: the gate after execute-plan-v2

## Execution report: $ARGUMENTS

Goal: decide whether this implementation is ready to raise for review.

You gather the change and act on the findings. The `code-reviewer-v2` agent does the close review. It is read-only, so it cannot quietly fix what it finds. You get a report, not edits to hunt for.

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

Start the `code-reviewer-v2` agent. Give it:

- the execution report path
- the plan path
- the changed and new file list
- the diffstat numbers

**Don't review the code yourself first.** The agent works in its own session. Reading the diff here throws away what starting the agent buys.

## 3. Fix

Save the agent's report to `.agents/code-reviews/<plan-slug>.md`. Do not print it.

The agent marks each finding `choice: none` or `choice: developer`.

- **`none`**: fix it, at any severity. Run each new test once with its fix removed and see it fail.
- **`developer`**: a decision the plan marks as the developer's stands, and so does anything they told you in this session. Keep the agent's case against it for the report, and ask only when the code shows the decision does not work. A fix that is cheap to undo, as a label or a default is, you make. The rest goes to the developer in step 4, with any fix that needs a change in another system, new storage, or a design the plan did not choose. Never start one of those inside the review.
- **The agent's questions**: answer them from the code, the code of the systems it calls, and the running app. One you cannot settle is a note in the report.

When unsure, take the fix that adds least. The developer reverses a reported fix in one line. A question costs them a review they have not read.

`fix goes` says where the defect came from:

- **code**: fix it in this change.
- **plan**: fix the code, then write the decision into the plan as a fact, so the next change does not repeat it.
- **standards**: fix this change, then propose the rule in the report. The developer adds it.

## 4. Report

Report once, in one message, and leave the changes uncommitted. The developer has not read the plan, the execution report or the review, so every line stands alone:

- Open with what the product's user or a caller gets. The code name comes after.
- Show it as it was and as it is now: a screenshot, or the name, signature or model.
- Never cite a finding, task or criterion by number, or use a term the review coined.

In this order:

1. **The questions**, if any are left. Most reviews leave none. Ask three at most and take your recommendation on the rest. Write them out here, because a multiple-choice prompt shows nothing but its own words: what happens today, what goes wrong with its number, and the options with what each costs, the recommended one first and labeled.
2. **The verdict**, in one line, with the saved report's path.
3. **What changed**: each fix and each decision you took, with the alternative it beat.
4. **What is left**: each of the developer's decisions the agent argued against, with its case, then any rule you propose, any question of the agent's you could not settle, and the result of the project's validation commands after your fixes.

- ❌ `Finding 3 (minor, plan): Retry skips <the side list> in the both-fail case. Retry both?`
- ✅ `When <the backend> fails, <the main view> shows "<its error text>" with a Retry button, and <the side list> shows the same error with no button. Retry brings <the main view> back but leaves <the side list> failed until the window is refocused. Recommended: Retry reloads both. Or: leave it, and <the side list> recovers on refocus.`

## Note

This skill needs the `code-reviewer-v2` agent installed alongside it. If the agent is missing, say so and stop. Reviewing the diff in this session defeats the purpose.
