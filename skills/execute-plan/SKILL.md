---
name: execute-plan
description: >-
  Implement a finished plan task by task, running each task's own validation before
  starting the next, and write an execution report the reviewer reads. Use when asked to
  "execute the plan", "implement this plan", or "build it" with a plan already written.
argument-hint: "[path to the plan]"
---

# execute-plan — one pass, validated at every step

## Plan: $ARGUMENTS

Read that file in full before touching any code. The plan is the contract; this skill is
the pass that honors it.

## Procedure

### 1. Read and understand

Read the **entire** plan: tasks and their dependencies, the CONTRACT, the edge cases, the
testing strategy, and every validation command. Read the files the plan names as
mandatory reading before writing anything.

### 2. Execute tasks in order

For each task, top to bottom:

- **Read before you write.** Open the existing files the task modifies, and the `PATTERN`
  file it cites. A task that says MIRROR is not done from memory.
- **Follow the task's specification exactly.** Its CONTRACT, IMPORTS, and GOTCHA fields
  are there because the planner already hit that wall.
- **Write the task's tests as part of the task** — a named test for each edge case the
  task owns, so its `VALIDATE` has something to run.
- **Run the task's `VALIDATE` before starting the next task.** Every task carries one. A
  task is not done until its check passes; if it fails, fix it now rather than carrying
  the failure forward. The full suite still runs in step 3 — this per-task gate is what
  keeps step 3 from becoming a pile-up.

### 3. Run the plan's validation commands

Execute every command in the plan's VALIDATION COMMANDS section, in order. On a failure:
fix the cause, re-run that command, and only then continue. Do not proceed past a red
check, and do not weaken a test to make it pass.

### 4. Final verification

- [ ] Every task completed, in order
- [ ] Every acceptance criterion has a test that would fail without the feature
- [ ] Every validation command passes
- [ ] The code follows the conventions the plan cited
- [ ] Docs updated where the plan called for it

## Output — the execution report

Write it to `.agents/execution-reports/<plan-slug>-report.md` and print the summary. The
reviewer and the PR body both read this file, and **deviations** are its most important
section: a documented deviation is an intentional decision the reviewer should judge, not
flag as drift.

```markdown
# Implementation Report — <feature>

**Plan**: <path>   **Branch**: <branch>   **Status**: COMPLETE (every AC proven) | PARTIAL

## Summary
<What was built, 2-4 sentences.>

## Acceptance criteria
1. ✅ <criterion> — <test file and test name, or the manual check performed>
2. ⚠️ <criterion> — <not proven, and why>

## Tasks completed
- <task> → `path/to/file` (CREATE/UPDATE)

## Tests added
<Test files, cases, results.>

## Validation results
<Type-check / lint / tests / build — pass or fail, with counts.>

## Deviations from the plan
<What changed against the plan and WHY — or "none". This is the reviewer's signal of intent.>

## Issues encountered
<Anything notable, or "none".>
```

Mark the status PARTIAL and say which criterion is unproven rather than reporting COMPLETE
on a hope. A report that overstates what landed is worse than no report: it is the one
thing the reviewer trusts without re-deriving.

## Notes

- Hitting something the plan did not anticipate is normal. Deviate if you must, and record
  it — never silently.
- A test that fails is fixed in the implementation, not in the assertion.
