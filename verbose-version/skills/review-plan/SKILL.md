---
name: review-plan
description: Poke holes in an implementation plan before any code gets written. Reads the plan and every file it cites, checks the plan's claims against the real code, and reports what will fail or stall. Run it in a fresh session, or through the plan-reviewer agent, so the review is not done by the context that wrote the plan.
argument-hint: "[path to the plan, e.g. .agents/plans/archive-provider.md]"
---

# Plan Review: $ARGUMENTS

Poke holes in a one shot plan that has not yet been executed.

## Core Principles

Review Philosophy:

- A gap found here costs nothing to fix; the same gap found after execution costs a rewrite
- Don't trust the plan's account of the code, open the file and confirm the claim
- A wrong assumption reshapes every task under it, so check assumptions before tasks
- The best code is often the code you don't write

## What to Review

Start by reading, in this order:

- **The plan** (`$ARGUMENTS`)
- **Every file the plan cites**, to confirm each claim it makes about existing code
- `CLAUDE.md` and any `.agents/documentation/*.md` the plan names

Read the tasks as the person who has to do them. Anywhere you have to leave the plan to learn
something it should have told you, stop and name the gap.

For each section of the plan, analyze for:

1. **Untestable Criteria**
   - Criteria stated as "works as expected" rather than an observable outcome
   - Criteria with no task that delivers them
   - Tasks that trace to no criterion

2. **False Assumptions**
   - Claims about existing code the file itself contradicts
   - A changed model with unnamed consumers
   - Mismatched values across a boundary, a provider id where an organization id belongs
   - A model reused where the meaning doesn't match

3. **Gaps That Stall the Executor**
   - Signatures, return types or error paths left unstated
   - States the Interface Sketch admits with no rule: an optional input, a nullable return,
     an empty collection
   - Design decisions left as "X or Y" for the executor to settle
   - Claimed task orderings that don't say what is hard versus merely convenient
   - Model or field names that need a comment to explain them

4. **Over-Built Solutions**
   - A design larger than the goal needs, counted in tables, modules, flags, services, state
   - The wrong mechanism: polling where an event already fires, a new table where the raw
     data can be derived, new code where something liftable exists
   - New infrastructure for a case that is rare or cheap
   - Abstractions, modules, flags or options with no named consumer
   - Work assigned to a class that is not its owner
   - Existing code this makes redundant, unnamed

5. **Adherence to Codebase Standards and Existing Patterns**
   - Adherence to standards documented in the docs directory
   - Code planned for `shared/` before a third feature uses it
   - Business logic planned in a component instead of its service
   - Testing standards

## Verify Findings Are Real

- Open every file the plan cites before claiming the plan is wrong about it
- Confirm the claim in the file, not in the plan's description of the file
- A finding whose fix costs more than the problem is not worth filing
- A finding you cannot state a consequence for is taste, not a defect

## Output Format

Print the report. It uses this shape and nothing else.

**Plan:** [the plan's goal and what finishing it lets the developer do next, so it is clear
you read the plan before criticizing it]

**For each finding:**

```
section: [the plan section it lives in]
issue: [one-line description]
detail: [why this is a problem, and what you confirmed in the file]
your call: [option (consequence)], or [option (consequence)]
```

If no findings: "Plan review passed. No gaps detected."

## Important

- Be specific (the plan section, not vague complaints)
- Group findings by section, in the plan's order, worst first within each section
- Findings that cross sections are usually the real ones
- A finding with nothing for the developer to decide has no `your call` line
- Cap at 10 findings, because more than 10 means the plan needs rewriting, not reviewing
- Nothing after the findings: no verdict, no summary

## After the Report

Walk the developer through it. Put every decision that is theirs to make to them one at a
time. Write nothing until told to.

On "go", revise the plan in place.
