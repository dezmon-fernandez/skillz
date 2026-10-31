---
name: walk-plan-v2
disable-model-invocation: true
description: >-
  Go over a written plan with the developer before the build, when they want to. It prints
  the plan as one page they can take in: what gets built, the data flow before and after,
  each piece with the criterion that asks for it, and the decisions, and it points at what
  is worth a second look. The developer is the reviewer: only the changes they agree to go
  into the plan. Optional, and best run in a fresh session. Use when asked to "walk me
  through the plan", "go over the plan", "review the plan with me", or "what does this plan
  build".
argument-hint: "[path to the plan]"
---

# walk-plan-v2: the developer reviews the plan, and you point

## Plan: $ARGUMENTS

The developer is the reviewer. You show them the plan in a form they can take in, point at
what deserves a second look, and answer from the plan and the code. They decide what
changes. A piece nobody needed, or a decision nobody saw, costs the build and its review the
time it takes.

It is optional: the build can start without it. Run it in a fresh session when you can.
There you know only what the plan says, as the executor will. In the session that wrote the
plan you explain from memory, and a gap in the plan slips past.

If the plan path is missing or the file cannot be read, say so and stop.

## 1. Print the view

Read the plan in full, and the code it cites where the view needs it. Write the view to
`.agents/walks/<the plan's file name>`, replacing any earlier one. It is a view, not a record:
it never restates the criteria, and it spells each name as the plan does. Where the plan leaves
out something the view needs, write `not stated in the plan` there.

```
What gets built: <two sentences, in the user's words>
Today: <the data flow, step by step, with file references>
After: <the same flow, the new steps marked>

| Piece | What it does | Files, tests | Needed by |
<one row per thing the Build adds or changes. Needed by: the criterion or Example that asks
for it, in a few words, or "nothing">

Decided by the developer: <each, one line>
Decided for the developer: <each default the plan took that a user or caller sees, one line>
Rollout: <each step after the build, and which needs the developer's go>

Worth a look, worst first:
1. <what, in plain words, and why it deserves a second look>
```

Under `Worth a look`, list each of these the plan holds:

- a piece whose `Needed by` is `nothing`
- a design that differs from the request or a document it links to
- a mechanism for a rare case (a retry, a ledger, a cache, a fallback), with how often the case
  happens and what the mechanism adds
- an assumption about outside data with no measured result
- a question you could not answer from the plan and the code

Each item is a pointer, never a fix. The developer decides what to do with it.

- ❌ `3. Drop the retry queue: the nightly job already covers it.`
- ✅ `3. The retry queue (Task 9, about 15 tests), needed by criterion 14. The nightly job re-reads the same rows. Is it still needed?`

## 2. Go over it together

Open the view and the plan on one `annotate` page, reply with how many items are worth a
look, and stop. Answer each comment from the plan and the code. A question neither answers is
a gap in the plan: say so, and give the line that would close it.

Change the plan only where the developer agreed. Make each change everywhere the plan states
that fact: the Definition, the Contract and the tasks. A piece they cut leaves with its tests.
Write each decision as theirs, with the date. Never add to what gets built, and never reopen a
decision they made. Reopen the page as the `annotate` skill says, and reply with one line per
comment: changed, answered, or left.

Then stop. The next step is `/execute-plan-v2 <the plan's path>`, on the developer's word.

## Without annotate

Print the view. The developer replies against the `Worth a look` numbers in the terminal.
