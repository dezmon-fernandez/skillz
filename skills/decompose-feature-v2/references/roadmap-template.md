# Roadmap template

Replace everything in `<angle brackets>`. Copy "How to work this roadmap" word for word.
Keep every heading. Running practices may start empty. It fills as tasks settle conventions.

```markdown
# <Feature>: execution roadmap

## Keystone

<The deliverable this feature produces. The inviolable property it must never break. The
docs to read before planning any slice, each with what it provides.>

## How to work this roadmap

- Open every task with a developer's walkthrough of the affected area: its role, its
  end-to-end data flow with file references, and where this task's problem sits. Deliver it
  before any code changes, then pause for the developer's questions.
- A box is checked only on the developer's explicit say-so, never because the work is
  merely finished. That keeps the checklist trustworthy across context clears.
- When a task settles a convention or teaches a lesson, write it into Running practices with
  its reasoning. It binds every later task.
- Each slice gets a /generate-plan-v2, which sizes it first and says so when it is small
  enough to build without a plan. A fresh session needs only this document plus /prime to
  continue correctly.

## Background

<The measured facts, numbers, and problem theory every slice leans on, stated in full here.
Never a pointer, so no task re-derives them or drifts from them.>

## Engineering focus

<The one architectural theme this effort serves, and the naming discipline every slice
holds to.>

## Running practices

<What is already settled. Grows as tasks settle more. Each entry is a convention plus the
reasoning that earned it.>

## Slices

- [ ] **A**: <name> (independent)
- [ ] **B**: <name> (independent)
- [ ] **C**: <name> (integrates A and B)

---

### A: <name> (independent)

- **Develops:** <the one capability this slice adds, in plain language>
- **Solves:** <the problem this slice removes, and why it exists>
- **Constraints:** <any invariant or rule the slice must respect: behavior that must hold,
  not how to build it. Omit if none.>
- **Size:** about <N> source files, tests aside
- **Depends on:** <prior slices, or nothing> · **Enables:** <what this unlocks>

### B: <name> (same shape)

### C: <name> (same shape, integrator)

---

## Sequencing questions

<Decisions left to the moment a specific slice is planned, each with the current best
answer and the doc that settles it.>
```

## A filled slice

```markdown
### A: <the read path> (independent)

- **Develops:** a caller can ask for <output> and get it: the pure function that maps
  <input> to <output>, the read that feeds it, and the entry point that serves it.
- **Solves:** nothing downstream can be judged until one path runs end to end.
- **Constraints:** malformed input fails loud. Nothing is written.
- **Size:** about 12 source files, tests aside
- **Depends on:** nothing · **Enables:** the slice that persists <output>.
```
