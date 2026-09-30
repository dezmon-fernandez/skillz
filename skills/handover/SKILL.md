---
name: handover
description: >-
  Distill the live session into .agents/handover.md so a fresh session can resume at
  full speed after /prime, often going straight into /generate-plan. Use when asked
  to "do a handover" or "hand this off", or before the developer clears context mid-task.
---

# handover: the state a fresh session needs to continue

`.agents/handover.md` is **live session state. It is read once and then deleted.** The
reader is the next session. It has no memory of this conversation, and it will act on
whatever this file says. Its first real step is often `/generate-plan`. The handover does
not do that research. It focuses it.

A handover holds the task, what is done toward it, where it stopped, what the next session
must obey, and what to research. Pull these out of the conversation, not just the repo.
Look for:

- a constraint the developer stated once
- a behavior that surprised us
- an approach tried and abandoned, with the reason

Anything not written here is lost. A fresh session either repeats the work or acts on
something nobody checked.

## Procedure

1. **Leave the code in a coherent state first.** A half-applied refactor is the worst
   thing to hand over. Finish the change, or revert it and say so. If it is not obvious
   which, ask the developer. Never hand over code that does not build.
2. **Check the repo state** with `git status`, `git log --oneline -1`, and how the
   branch compares to its remote. Write down what they returned.
3. **Reread the conversation** for the details that never landed in a file.
4. **Write `.agents/handover.md`** from the template below. Write it last. Later work is
   not in it, and the next session will not know. If work continues, run `/handover`
   again before stopping.

**Keep it short.** One page. A long handover is skimmed, and a skimmed handover is no
handover. Cut any section with nothing real in it.

## Output template

Copy the opening blockquote word for word. Replace everything in `<angle brackets>`. It
is guidance, and each section's guidance carries the rule that governs it. The ❌/✅ lines
show the rule applied. Do not copy them.

```markdown
> **You are resuming a session.** Run `/prime`. It reads this file and deletes it.
> This file describes one moment, and it is wrong the instant work resumes. Do not
> keep it, and never treat it as documentation.

## Task

<The goal this session is working toward, in two or three sentences. Then the first
step on resume, naming the command or file. Everything below serves this. If the
developer stated the scope, quote them.>

## Done

<What is finished and proven, each with the check behind it. Write outcomes, not a
story. Say what stands now, not the steps taken.>
- ❌ `refactored the config service`
- ✅ `config.service.ts reads environment from runtime config. <test-runner> is green (74 passing)`
- <Changes outside the repo count too: packages installed, system files written,
  dotfiles edited. Give each one its path.>

## Where we left off

<Exactly where it stopped, and what moves it forward: the next step, the decision that
unblocks it, or the outside process still running. Include the repo state from step 2
of the procedure. Never record consent that was not given. Approval to commit, push,
deploy, or spend covers one specific reviewed change and does not carry past this
conversation. If it was not granted for the work that remains, say it must be asked for
again.>
- ❌ `developer approved committing`
- ✅ `commit approval covered the hook change only. Ask again for everything else.`
- <Services or processes left running, so the next session can stop them.>

## Constraints

<The developer's prohibitions and standing rules, quoted word for word. Paraphrasing a
prohibition weakens it. The next session must follow these before it acts on anything
below.>
- ❌ `developer prefers we hold off on committing`
- ✅ `"do not commit or push anything until I've reviewed the diff"`

## Facts

<Pitfalls, limitations, and practices the next session must keep in mind for this task.
Every fact carries the check behind it. If there is no check, mark it assumed. State
disproven beliefs as disproven so they are not revived.>
- ❌ `the API rejects empty tags`
- ✅ `API returns 400 on empty tags (checked with curl against staging). Assumed prod matches (never tested).`
- ✅ `"the cache is keyed by user" is disproven (read cache.service.ts, the key is session). Do not build on it.`

## Explore

<Directions worth researching next, and what each would settle. This feeds the next
session's /generate-plan. List open decisions waiting on the developer, and what each
one unblocks. Every skill, doc, repo, or file outside this conversation that the next
session will need carries its exact path or URL. A description in words sends it
searching for something it could have been pointed straight at.>
```
