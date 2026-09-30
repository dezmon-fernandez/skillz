---
name: review-plan
description: >-
  Poke holes in an implementation plan before any code is written. It reads the plan and
  every file it cites, checks its claims against the real code, and reports what will
  fail or stall. Use when asked to "review the plan" or "check this plan", in a fresh
  session so the review is not done by the session that wrote it.
argument-hint: "[path to the plan]"
---

# review-plan: find the gap while it is still free

## Plan: $ARGUMENTS

Goal: find what in this plan will fail or stall the executor. A gap found now costs a sentence. Found during execution, it costs a rewrite.

## Rules

- Don't trust the plan's account of the code. Open the file and confirm.
- A wrong assumption reshapes every task under it. Check assumptions before tasks.
- The best code is often the code you don't write.

## Read, in order

1. The plan (`$ARGUMENTS`).
2. Every file it cites (`## CONTEXT REFERENCES`), to confirm each claim about existing code.
3. The project's rules file and any architecture document the plan names.

Read the tasks as the person who must do them. Where you have to leave the plan to learn something it should have said, stop and name the gap.

## What to look for

Walk the plan section by section. Run all five checks on each.

1. **Untestable criteria** (`## ACCEPTANCE CRITERIA`, `## STEP-BY-STEP TASKS`)
   - "Works as expected" instead of an observable outcome.
   - A criterion no task delivers.
   - A task that traces to no criterion.

2. **False assumptions** (`### Relevant codebase files`, `## DATA MODELS`)
   - A claim the file itself contradicts.
   - A changed model with unnamed consumers (`**Changes:**`).
   - Mismatched values across a boundary, such as an id of one kind where another belongs.
   - A model reused where the meaning doesn't match (`**Reuse?**`, `**Assumptions:**`).

3. **Gaps that stall the executor** (`## CONTRACT`, `## IMPLEMENTATION PLAN`)
   - Signatures, return types, or error paths left unstated.
   - A state the `### Interface Sketch` allows but no rule covers (`### Behavioral Rules`, `### Edge Cases`): an optional input, a nullable return, an empty collection.
   - A decision left as "X or Y" for the executor (`### Key design decisions`).
   - A task order that doesn't say what is hard versus merely convenient (`**Depends on:**`, `**Independent of:**`).
   - A model or field name that needs a comment to explain it.

4. **Over-built solutions** (`## Solution Statement`, `## DATA MODELS`, `## IMPLEMENTATION PLAN`)
   - A design bigger than the goal needs, counted in tables, modules, flags, services, state.
   - The wrong mechanism: polling where an event already fires, new storage where the value can be derived, new code where existing code could be reused.
   - New infrastructure for a rare or cheap case.
   - An abstraction, flag, or option with no named consumer.
   - Work given to a unit that doesn't own it.
   - Existing code this makes redundant, left unnamed.

5. **Standards and patterns** (`### Patterns to follow`, `## TESTING STRATEGY`)
   - Standards in the project's docs.
   - Code planned for a shared location before enough callers justify it.
   - Business logic planned in a presentation layer, not the unit that owns it.
   - Testing standards.

## Verify each finding

- Open every cited file before saying the plan is wrong about it.
- Confirm the claim in the file, not in the plan's description of it.
- A fix that costs more than the problem is not worth filing.
- No stated consequence means taste, not a defect.

## Output

Print the report in this shape and nothing else.

**Plan:** [the plan's goal, and what finishing it lets the developer do next. This shows you read it before criticizing it.]

**For each finding:**

```
section: [the plan section it lives in]
issue: [one-line description]
detail: [why this is a problem, and what you confirmed in the file]
your call: [option (consequence)], or [option (consequence)]
```

No findings: "Plan review passed. No gaps detected."

- Name the plan section. No vague complaints.
- Group by section, in the plan's order. Worst first within each section.
- Findings that cross sections are usually the real ones.
- Nothing for the developer to decide: no `your call` line.
- Cap at 10. More than 10 means the plan needs rewriting, not reviewing.
- Nothing after the findings. No verdict, no summary.

## After the report

Walk the developer through it. Put each decision that is theirs to them, one at a time. Write nothing until told to. On "go", revise the plan in place.
