---
name: execute-plan
description: >-
  Implement a finished plan task by task. Run each task's own validation before starting
  the next, and write an execution report the reviewer reads. Use when asked to "execute
  the plan", "implement this plan", or "build it" with a plan already written.
argument-hint: "[path to the plan]"
---

# execute-plan: one pass, validated at every step

## Plan: $ARGUMENTS

Read the whole file before you touch any code. The plan is the contract. Carry it out.

## Procedure

### 1. Read the plan

Read all of it: the tasks and their dependencies, the CONTRACT, the edge cases, the testing
strategy, and every validation command. Then read the files the plan lists as mandatory
reading. Do this before you write anything.

### 2. Do the tasks in order

For each task, top to bottom:

- **Read before you write.** Open the files the task changes and the `PATTERN` file it
  cites. A task that says MIRROR is not done from memory.
- **Follow the task exactly.** Its CONTRACT, IMPORTS, and GOTCHA fields are there because
  the planner already hit that problem.
- **Write the task's tests as part of the task.** Write a named test for each edge case the
  task owns, so its `VALIDATE` has something to run.
- **Run the task's `VALIDATE` before the next task.** Every task has one. The task is not
  done until it passes. If it fails, fix it now. Do not carry the failure forward. The full
  suite still runs in step 3, but this per-task check stops failures piling up there.

### 3. Run the plan's validation commands

Run every command in the plan's VALIDATION COMMANDS section, in order. If one fails, fix the
cause, re-run it, then continue. Do not go past a failing check. Do not weaken a test to
make it pass.

### 4. Final check

- [ ] Every task completed, in order
- [ ] Every acceptance criterion has a test that would fail without the feature
- [ ] Every validation command passes
- [ ] The code follows the conventions the plan cited
- [ ] Docs updated where the plan called for it

## Output: the execution report

Write it to `.agents/execution-reports/<plan-slug>-report.md` and print the summary. The
reviewer and the PR body both read it. **Deviations** are its most important section. A
documented deviation is a deliberate choice. The reviewer should judge it, not flag it as an
accident.

```markdown
# Implementation Report: <feature>

**Plan**: <path>   **Branch**: <branch>   **Status**: COMPLETE (every AC proven) | PARTIAL

## Summary
<What was built, 2-4 sentences.>

## Acceptance criteria
1. ✅ <criterion>: <test file and test name, or the manual check performed>
2. ⚠️ <criterion>: <not proven, and why>

## Tasks completed
- <task>: `path/to/file` (CREATE/UPDATE)

## Tests added
<Test files, cases, results.>

## Validation results
<Type-check / lint / tests / build: pass or fail, with counts.>

## Deviations from the plan
<What changed against the plan and WHY, or "none". This is the reviewer's signal of intent.>

## Issues encountered
<Anything notable, or "none".>
```

If any criterion is unproven, mark the status PARTIAL and name it. Never report COMPLETE on
a hope. A report that claims too much is worse than no report. The reviewer trusts it
without checking again.

## Notes

- Meeting something the plan did not expect is normal. Deviate if you must, and record it.
  Never deviate silently.
- Fix a failing test in the code, not in the assertion.
