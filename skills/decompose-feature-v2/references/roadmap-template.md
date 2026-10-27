# Roadmap template

Replace everything in `<angle brackets>`. Copy "How to work this roadmap" word for word.
Keep every heading. Working rules may start empty. It fills as tasks settle conventions.

```markdown
# <Feature>: roadmap

## Goal

<The one result this feature produces, in the developer's words where they gave them.>

**Correctness rule:** <the rule that must hold at every step, the repo rules it comes from,
and which story proves it first.>

**Read before planning any story:** <each document, with what it provides.>

## Stories in build order

- [ ] **A**: <name> · independent · about <N> files
- [ ] **B**: <name> · independent · about <N> files
- [ ] **C**: <name> · needs A and B · about <N> files

## How to work this roadmap

- Open every task with a developer's walkthrough of the affected area: its role, its
  end-to-end data flow with file references, and where this task's problem sits. Deliver it
  before any code changes, then pause for the developer's questions.
- A box is checked only on the developer's explicit say-so, never because the work is
  merely finished. That keeps the checklist trustworthy across context clears.
- When a task settles a convention or teaches a lesson, write it into Working rules with
  its reasoning. It binds every later task.
- Each story gets a /generate-plan-v2, which sizes it first and says so when it is small
  enough to build without a plan. A fresh session needs only this document plus /prime to
  continue correctly.

## Design approach

<The one approach the code follows across stories, and how things are named.>

## Working rules

<What is already settled. Grows as tasks settle more. Each entry is a rule plus the
reasoning behind it.>

---

### A: <name>

As <the user>, I want <what>, so that <why>.

**Requirements**
- <an outcome a person can check, including any repo rule this story must keep>

**Known from research**
- <a known problem that would make the plan build the wrong thing, or "nothing">

**Unknown, to explore**
- <a question this story's plan must answer, with what research found so far, or "nothing">

Needs: <earlier stories, or nothing> · Unlocks: <later stories> · About <N> source files,
tests aside

### B: <name> (same shape)

### C: <name> (same shape)

---

## Research notes

<Reference for the plans. Each plan re-checks what it uses. Label each fact: measured,
documented, from an earlier document, or not checked. A fact that changes what a story
builds is on that story too.>
```
