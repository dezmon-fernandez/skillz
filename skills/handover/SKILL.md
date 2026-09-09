---
name: handover
description: >-
  Distill the live session into .agents/handover.md so a fresh session can resume at
  full speed after /prime — often straight into /generate-feature-plan. Use when asked
  to "do a handover" or "hand this off", or before the operator clears context mid-task.
---

# handover — the state a fresh session needs to continue

`.agents/handover.md` is **live session state, consumed once and deleted**. The reader
is the next session: no memory of this conversation, and it will act on whatever this
file says. Often its first real move after consuming is `/generate-feature-plan` — the
handover does not do that research, it makes that research focused.

A handover is the task, what stands toward it, where it stopped, what binds the next
session, and what to research. Pull these out of the conversation, not just the tree: a
constraint the operator stated once, a behavior that surprised us, an approach tried and
abandoned and why. Anything not written here is lost, and a fresh session either repeats
the work or acts on something we never actually checked.

## Procedure

1. **Leave the tree in a coherent state first.** A half-applied refactor is the worst
   thing to hand over. Either finish the change, or revert it and say so — ask the
   operator which, if it is not obvious. Never hand over a tree that does not build.
2. **Check the tree state**: `git status`, `git log --oneline -1`, and the branch's
   relationship to its remote. Write what they returned.
3. **Reread the conversation** for the details that never landed in a file.
4. **Write `.agents/handover.md`** from the template below. Write it last: anything done
   after it is written is not in it, and the next session will not know. If work
   continues, run `/handover` again before stopping.

**Short.** A page. A long handover is skimmed, and a skimmed handover is the same as no
handover. Cut any section with nothing real in it.

## Output template

The opening blockquote is verbatim. Everything in `<angle brackets>` is guidance to
replace; each section's guidance carries the rule that governs it. The ❌/✅ lines show
the rule applied and are deleted, not copied.

```markdown
> **You are resuming a session.** Run `/prime` — it consumes this file and deletes
> it. This file describes one moment and is wrong the instant work resumes — do not
> keep it, and never treat it as documentation.

## Task

<The goal this session is driving toward, in two or three sentences, and the first
move on resume — naming the command or file. Everything below serves this. If the
operator stated the scope, quote them.>

## Done

<Finished and proven, each with the check behind it. Outcomes, not narrative: what
stands now, not the steps taken.>
- ❌ `refactored the config service`
- ✅ `config.service.ts reads environment from runtime config; npm test green (74 passing)`
- <changes outside the repo count too: packages installed, system files written,
  dotfiles edited — each with its path>

## Where we left off

<Exactly where it stopped and what moves it: the next step, the decision that unblocks
it, or the external process still running. Tree state from the procedure's step 2.
Never record consent that was not given: approval to commit, push, deploy, or spend
attaches to a specific reviewed change and does not survive the context — if it was
not granted for the work that remains, say it must be asked for again.>
- ❌ `operator approved committing`
- ✅ `commit approval covered the hook change only; ask again for everything else`
- <services or processes left running, so the next session can stop them>

## Constraints

<Operator prohibitions and standing rules, quoted verbatim. Paraphrasing a prohibition
weakens it. These bind the next session before it acts on anything below.>
- ❌ `operator prefers we hold off on committing`
- ✅ `"do not commit or push anything until I've reviewed the diff"`

## Facts

<Gotchas, limitations, and practices the next session must keep in mind for this task.
Every fact carries the check behind it; no check → mark it assumed. State disproven
beliefs as disproven so they are not revived.>
- ❌ `the API rejects empty tags`
- ✅ `API 400s on empty tags (curl against staging); assumed prod matches (never tested)`
- ✅ `"the cache is keyed by user" — disproven (read cache.service.ts, key is session); do not build on it`

## Explore

<Directions worth researching next and what each would settle — this feeds the next
session's /generate-feature-plan. Open decisions awaiting the operator, and what each
one unblocks.>
```
