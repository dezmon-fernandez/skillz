---
name: walk-plan-v2
disable-model-invocation: true
description: >-
  The one check between a written plan and the build. A cold reviewer agent reads the plan
  for correctness and for complexity the goal does not need, each finding becomes a
  proposal, and the plan and its proposals open in annotate, where the developer approves or
  rejects each one before it goes into the plan. Runs once. Use after
  generate-plan-v2 writes a plan, and when asked to "review the plan", "check this plan",
  "walk me through the plan", or "what does this plan build".
argument-hint: "[path to the plan]"
---

# walk-plan-v2: one cold check, proposed to the developer

## Plan: $ARGUMENTS

Goal: the developer confirms a plan that is correct and no more complex than its goal needs,
and the build starts.

The developer confirmed this plan's Definition and Contract minutes ago. Nothing in it
changes here without their approval: the review proposes, the developer decides, and only
then do the approved changes go in. Fixing without asking belongs to the code review, after
the build.

This runs once, and the work only moves forward from it:

- It never reviews again after the changes go in. A second review finds new things to change
  forever.
- It never reopens a decision the developer made.
- It never changes how much gets built. That was settled when the plan was made. It checks
  only how it gets built.

If the plan path is missing or the file cannot be read, say so and stop.

## 1. Cold check

Start the `plan-reviewer-v2` agent. Give it the plan path and nothing else.

- ❌ `Review <plan path>. We chose the retry step because the upstream call fails daily, so go easy on it.`
- ✅ `Review <plan path>.`

The reasoning behind the plan is the bias the agent exists to escape.

When the developer asks only to see the plan, skip to step 3 with no proposals.

## 2. Write the proposals

Change nothing in the plan yet. You may be the session that wrote it, so you lean toward it.
Turn every finding into a proposal. Never drop one or soften one.

Write them, numbered, to `.agents/plan-reviews/<the plan's file name>`:

```
<n>. <what it changes for a user or a caller, in plain words, or "nothing a caller sees">
   Where: <the plan's section, and its line>
   Now: <the plan's text as it reads>
   Proposed: <the text as it would read>
   Why: <the finding in one sentence, and what it costs if left>
```

- **A finding with one sound fix** (`choice: none`): one proposal. Place the proposed text
  where the plan states that fact, so the parts the developer confirmed stay true. A change
  to what a caller gets, a model, or a step goes in the Contract. A new fact about outside
  data goes under `Assuming:`, with how it was checked. The Build part points at it.
- **A gap the reviewer recommends accepting:** a proposal to leave the plan as it is, with the
  gap's cost.
- **A hole**, a place the Build part relies on something the Definition or the Contract does
  not state: a proposal adding it to the section it belongs under.
- **A finding that is the developer's to decide** (`choice: developer`), and a smaller shape
  the reviewer recommends: a question. Say what happens today, then each option with what it
  costs and rules out, the recommended one first, then the `Proposed:` text for that one.
- **A decision the plan marks as the developer's:** the reviewer's case against it, and no
  proposal.

Write each proposed text as a fact with its chosen mechanism. A list of options left in the
plan gets decided again by the executor.

- ❌ `Use a lock or a check, as agreed in review.`
- ✅ `Check before the write. A lock was rejected: the conflict is rare and the check costs one read.`

## 3. Show it

Read the plan file in full: the builder gets the file. Open the plan and the proposals on one
`annotate` page, so the plan's diagrams draw. Reply, under Send and in your message, with the
verdict in one line and how many proposals and questions there are.

Send approves every proposal the developer leaves alone, and the recommended option of every
question they leave alone. A comment on a proposal rejects it or changes it.

## 4. Put in what was approved

Make each approved change in the plan, as proposed or as the developer's comment changed it.
Write a decision the developer made as theirs, with the date. Reopen the page as the
`annotate` skill says, so the changed lines are highlighted, and reply with one line per
proposal: put in, changed as asked, or dropped. Do not start the reviewer again.

Then stop. The next step is `/execute-plan-v2 <the plan's path>`, on the developer's word.

## A plan with no Definition or Contract

Skip steps 1 and 2. Write a Definition and a Contract from the plan's facts, in the shape the
`generate-plan-v2` skill's `references/plan-template.md` gives them, to
`.agents/walks/<the plan's file name>`, replacing any earlier one, and open it with the
`annotate` skill. It is a view of the plan, not a record. A name appears exactly as the plan
spells it. Where the plan leaves out something a section needs, write `not stated in the
plan` in that place. Reply with the holes only.

## Without annotate

Print the proposals, then the verdict. The developer approves or rejects each by its number
in the terminal, and step 4 follows.

## Note

Step 1 needs the `plan-reviewer-v2` agent installed alongside this skill. If it is missing,
say so and stop. Reviewing the plan in this session hands the review back to the session that
may have written it. A plan with no Definition or Contract needs the `generate-plan-v2`
skill, for its template.
