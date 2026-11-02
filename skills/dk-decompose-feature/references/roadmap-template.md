# Roadmap template

Replace everything in `<angle brackets>`. Copy "How to work this roadmap" word for word.
Keep every heading. A roadmap holds no implementation decisions: each story's plan makes its
own, so one story's choices never bind the next.

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

- A box is checked only on the developer's explicit say-so, never because the work is
  merely finished. That keeps the checklist trustworthy across context clears.
- Each story gets a /dk-generate-plan, which sizes it first and says so when it is small
  enough to build without a plan. A fresh session needs only this document plus /prime to
  continue correctly.

---

### A: <name>

As <the user>, I want <what>, so that <why>.

**Requirements**
- <what the story produces, where it goes, and the later story that uses it>
- <an outcome a person can check, including any repo rule this story must keep>

**Open questions**
- <a question this story's plan must answer, or "nothing">

Needs: <earlier stories, or nothing> · Unlocks: <later stories> · About <N> source files,
tests aside

### B: <name> (same shape)

### C: <name> (same shape)
```
