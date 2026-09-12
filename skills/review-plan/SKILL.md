---
name: review-plan
description: >-
  Poke holes in an implementation plan before any code is written — reads the plan and
  every file it cites, checks its claims against the real code, and reports what will
  fail or stall. Use when asked to "review the plan" or "check this plan", in a fresh
  session so the review is not done by the context that wrote it.
argument-hint: "[path to the plan]"
---

# review-plan — find the gap while it is still free

## Plan: $ARGUMENTS

A gap found here costs a sentence. The same gap found during execution costs a rewrite.

## Review philosophy

- Don't trust the plan's account of the code — open the file and confirm the claim
- A wrong assumption reshapes every task under it, so check assumptions before tasks
- The best code is often the code you don't write

## What to read, in this order

1. **The plan** (`$ARGUMENTS`)
2. **Every file the plan cites**, to confirm each claim it makes about existing code
3. The project's rules file and any architecture document the plan names

Read the tasks as the person who has to do them. Anywhere you have to leave the plan to
learn something it should have told you, stop and name the gap.

## What to look for

1. **Untestable criteria**
   - Criteria stated as "works as expected" rather than an observable outcome
   - Criteria with no task that delivers them
   - Tasks that trace to no criterion

2. **False assumptions**
   - Claims about existing code the file itself contradicts
   - A changed model whose consumers go unnamed
   - Mismatched values across a boundary — an id of one kind where an id of another belongs
   - A model reused where the meaning doesn't match

3. **Gaps that stall the executor**
   - Signatures, return types, or error paths left unstated
   - States the Interface Sketch admits with no rule: an optional input, a nullable
     return, an empty collection
   - Design decisions left as "X or Y" for the executor to settle
   - Claimed task orderings that don't say what is hard versus merely convenient
   - Model or field names that need a comment to explain them

4. **Over-built solutions**
   - A design larger than the goal needs, counted in tables, modules, flags, services, state
   - The wrong mechanism: polling where an event already fires, new storage where the
     value can be derived, new code where something liftable exists
   - New infrastructure for a case that is rare or cheap
   - Abstractions, flags, or options with no named consumer
   - Work assigned to a unit that is not its owner
   - Existing code this makes redundant, unnamed

5. **Adherence to the codebase's standards and patterns**
   - The standards documented in the project's docs
   - Code planned for a shared location before enough callers justify it
   - Business logic planned in a presentation layer instead of the unit that owns it
   - Testing standards

## Verify findings are real

- Open every file the plan cites before claiming the plan is wrong about it
- Confirm the claim in the file, not in the plan's description of the file
- A finding whose fix costs more than the problem is not worth filing
- A finding you cannot state a consequence for is taste, not a defect

## Output

Print the report. It uses this shape and nothing else.

**Plan:** [the plan's goal and what finishing it lets the developer do next, so it is
clear you read the plan before criticizing it]

**For each finding:**

```
section: [the plan section it lives in]
issue: [one-line description]
detail: [why this is a problem, and what you confirmed in the file]
your call: [option (consequence)], or [option (consequence)]
```

If no findings: "Plan review passed. No gaps detected."

- Be specific: name the plan section, not a vague complaint
- Group findings by section, in the plan's order, worst first within each section
- Findings that cross sections are usually the real ones
- A finding with nothing for the developer to decide has no `your call` line
- Cap at 10 findings — more than 10 means the plan needs rewriting, not reviewing
- Nothing after the findings: no verdict, no summary

## After the report

Walk the developer through it, putting every decision that is theirs to make to them one
at a time. Write nothing until told to. On "go", revise the plan in place.
