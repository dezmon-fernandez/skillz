---
name: review-plan-v2
disable-model-invocation: true
description: >-
  The gate before execute-plan-v2. It hands the plan to the read-only plan-reviewer-v2 agent
  for a cold read, revises the plan where a finding has one sound fix, and asks the
  developer only what is theirs to decide. Use when asked to "review the plan" or "check
  this plan".
argument-hint: "[path to the plan]"
---

# review-plan-v2: find the gap while it is still free

## Plan: $ARGUMENTS

Goal: get the developer and the plan to agree before anything is built. A gap found now costs a sentence. Found during execution, it costs a rewrite.

The `plan-reviewer-v2` agent does the cold read. You act on what it finds. The agent is read-only, so it cannot quietly fix the plan. You get a report, not edits to hunt for.

## 1. Delegate

Start the `plan-reviewer-v2` agent. Give it the plan path and nothing else.

- ❌ `Review <plan path>. We chose the retry step because the upstream call fails daily, so go easy on it.`
- ✅ `Review <plan path>.`

The reasoning behind the plan is the bias the agent exists to escape.

## 2. Revise

You may be the session that wrote this plan, so you lean toward it. Act on every finding the agent raised. Never drop one or soften one.

The agent marks each finding `choice: none` or `choice: developer`.

- **`none`**: revise the plan as the agent recommends. When it recommends accepting a gap, leave the plan and keep the gap's cost for the report. When the plan had a good reason it left unwritten, write the reason into the plan and keep the agent's case for the report.
- **`developer`**: a decision the plan marks as the developer's stands, and so does anything they told you in this session. Keep the agent's case against it for the report, and ask only when the agent shows the decision cannot work as written. A choice that is cheap to undo once built, as a label or a default is, you make. The rest goes to the developer in step 3.

When unsure, take the recommendation that adds least. The developer reverses a reported decision in one line. A question costs them a plan they have not read.

Write each change as a fact with its chosen mechanism. A list of options left in the plan gets decided again by the executor.

- ❌ `Use a lock or a check, as agreed in review.`
- ✅ `Check before the write. A lock was rejected: the conflict is rare and the check costs one read.`

## 3. Report

Report once, in one message. The developer confirms the plan from it before anything is built. They did not write the plan and have not read the review, so every line stands alone:

- Open with what the product's user or a caller gets. The code name comes after.
- Show it as it was and as it is now: the name, signature or model, or a sketch of the screen.
- Never cite a task, section or finding by number, or use a term the plan or the review coined.

In this order:

1. **The questions**, if any are left. Most reviews leave none. Ask three at most and take your recommendation on the rest. Write them out here, because a multiple-choice prompt shows nothing but its own words: what happens today, the choice shown, and the options with what each costs and rules out, the recommended one first and labeled.
2. **The verdict**, in one line.
3. **What changed**: each revision and each decision you took, with the alternative it beat.
4. **What stays**: each accepted gap with its cost, and each of the developer's decisions the agent argued against, with its case.

- ❌ `Optimistic locking or a uniqueness constraint?`
- ✅ `Two people can save the same record at once. Recommended: the second save fails with a message, which is one check and no new state. Or: keep both and merge them later, which is a merge step to build and test.`

Read each answer as an answer and as new input. It may raise a question or contradict an assumption. Answer what is asked, and change only what the answer names. Write it into the plan as the developer's decision, with the date.

Then stop. The build starts on the developer's word, never on yours.

## Note

This skill needs the `plan-reviewer-v2` agent installed alongside it. If the agent is missing, say so and stop. Reviewing the plan in this session hands the review back to the session that may have written it.
