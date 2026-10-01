---
name: review-plan
description: >-
  The gate before execute-plan. It hands the plan to the read-only plan-reviewer agent
  for a cold read, relays every finding, and puts the decisions to the developer one at a
  time. It changes the design only on the developer's word. Use when asked to "review
  the plan" or "check this plan".
argument-hint: "[path to the plan]"
---

# review-plan: find the gap while it is still free

## Plan: $ARGUMENTS

Goal: get the developer and the plan to agree before anything is built. A gap found now costs a sentence. Found during execution, it costs a rewrite.

The `plan-reviewer` agent does the cold read. You sort what it finds and take the decisions to the developer. The agent is read-only, so it cannot quietly fix the plan. You get a report, not edits to hunt for.

## 1. Delegate

Start the `plan-reviewer` agent. Give it the plan path and nothing else.

- ❌ `Review <plan path>. We chose the retry step because the upstream call fails daily, so go easy on it.`
- ✅ `Review <plan path>.`

The reasoning behind the plan is the bias the agent exists to escape. It comes in later, from you and the developer, in step 3.

## 2. Relay

The agent returns blocking findings, a simpler shape, smaller gaps with a fix-or-accept recommendation each, a verdict, and the architectural decisions to confirm.

You may be the session that wrote this plan, so you lean toward it. Surface every finding the agent raised. You may put the plan's reason next to a finding. Never drop one or soften one.

- ❌ `The reviewer questioned the retry step, but the plan already covers that.`
- ✅ `Reviewer: the retry step costs more than the failure it handles. The plan's reason: the upstream call fails about once a day. Your call.`

Sort the findings:

- **Routine**: one right answer under a project standard or the code as it stands. A mis-cited line, a caller the task list forgot, a name the codebase already uses for something else. Fix these in the plan yourself and list what you fixed.
- **Accepted**: a gap the agent recommends accepting because the fix costs more than the symptom, and any decision whose only consequence is such a symptom. List each with its one-line cost of living with it. Do not ask about these. The developer may pull any of them into step 3.
- **The developer's**: the simpler shape when the agent proposed one, every other architectural decision it listed, and any finding with a `your call` line or a fix that changes the design.

When unsure whether a finding is routine, it is the developer's.

## 3. Go over

Open with the agent's verdict in one line, the routine fixes you made, and the accepted findings.

Then put the developer's decisions to them one at a time, never as a batch. When the agent proposed a simpler shape, ask about it first. Taking it can remove other findings.

For each decision, say in plain words what the choice means. Then give the options with their consequences, your recommendation first and labeled. When one option keeps the design smaller at a small cost, recommend it. A technical term comes only after the plain version.

- ❌ `Optimistic locking or a uniqueness constraint?`
- ✅ `Two people can save the same record at once. Recommended: the second save fails with a message, which is one check and no new state. Or: keep both and merge them later, which is a merge step to build and test.`

Read each answer as an answer and as new input. It may raise a question or contradict an assumption. Answer what is asked before moving on.

## 4. Revise

On the developer's word, revise the plan in place. Write each settled decision as a fact with its chosen mechanism. A list of options left in the plan gets decided again by the executor.

- ❌ `Use a lock or a check, as agreed in review.`
- ✅ `Check before the write. A lock was rejected: the conflict is rare and the check costs one read.`

When a finding had a good reason the plan left unwritten, write the reason into the plan.

Report what changed, what the developer decided, and what stays as it was.

## Note

This skill needs the `plan-reviewer` agent installed alongside it. If the agent is missing, say so and stop. Reviewing the plan in this session hands the review back to the session that may have written it.
