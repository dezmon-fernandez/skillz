---
name: decompose-feature
description: >-
  Break a feature too large for one plan into a roadmap of small, dependency-ordered
  slices, each carrying one architecture decision that one /piv-plan-implementation and one build
  session can finish. Writes .agents/roadmaps/<feature>.md, a working document that
  carries the effort's background and working rules across context clears. Use when asked
  to "decompose this feature", "break this into slices", "roadmap this", or when a feature
  is too big to plan in one pass.
argument-hint: "[feature, PRD section, or feature-idea doc]"
---

# decompose-feature: a roadmap of slices, one decision each

## Feature: $ARGUMENTS

Break a feature into slices and the order to build them. A slice is one unit of work: one
architecture decision, small enough to plan and build in one session, large enough to ship
and stand on its own. Built in order, each slice is planned against what the earlier ones
actually landed, not a guess made up front. Plan them one at a time, or a few together when
they come out small.

A slice entry says **what it develops, the problem it solves, and the constraints it must
respect**, and stops there. No signatures, data shapes, enums, file layout, or tests.
Deciding how to build a slice is `/piv-plan-implementation`'s job, and the plan finds what to read on
its own. Write each entry to be read at a glance: plain words, one idea per line, the
deliverable first. An entry that needs a wall of detail is two slices, or you have started
planning it.

A slice is the right size when its plan is short and its result is one observable, testable
change.

The roadmap is a working document, not just an ordered list. Sessions run off it across
context clears, so it carries the effort's evidence, design voice, and working rules inline.
**Everything load-bearing lives in the roadmap itself, never behind a pointer.** A session
reliably acts on what the document holds. It may never open what the document only links to.

## Process

### 1. Understand the feature

- **Keystone**: the one deliverable this feature exists to produce.
- **Inviolable property**: the correctness rule that must hold at every step. Take it from
  the repo's rules (CLAUDE.md) and PRD. Do not invent it. Slice 1 proves it, and every later
  slice preserves it.
- **Docs to read before planning**: the design or PRD sections a slice's plan should start
  from. One list in the Keystone, not a field on every slice.
- **Engineering focus**: the one architectural theme the effort serves, and the naming
  discipline its code holds to. Without it, each session picks its own design voice.
- **Background**: the measured facts, numbers, and problem theory the effort rests on,
  carried in full (tables, rates, dates). Never a pointer to another document or to this
  session's memory. The session that picks up a slice has neither.

### 2. Cut the slices

- **Slice 1 proves the inviolable property** end to end with the fewest moving parts. Widen
  from there.
- **One architecture decision per slice**: a data shape, a key, a boundary, an idempotency
  rule. Bundle several and the plan review goes coarse. Split them.
- **Independent units before integrators.** Slices with no upstream dependency come first.
  The slice that wires them together comes last.
- **Pure logic and I/O are usually two slices**: a pure, testable core, then the shell with
  the side effects.
- **Settle the irreversible early.** A decision everything downstream depends on, such as a
  key type every reference uses, is made and reviewed before anything builds on it. A
  decision that can be reshaped later from data already in hand can wait.
- **Cut against what exists. Do not assume.** Build on the modules you already know. Where
  it is unclear whether something exists yet, record a sequencing question instead of
  guessing. Deep code discovery is the plan's job, not the roadmap's.

### 3. Sequence and check

- Order by dependency. Mark each slice independent, or an integrator of the slices it names.
- Each slice carries exactly one decision, ends shippable, and ends with the test suite
  green. Split any slice carrying more than one decision.
- Each entry stays at the develops / solves / constraints altitude. A signature, data shape,
  enum, or test that crept in belongs in the plan. Cut it from the roadmap.
- Read every entry as the session that will plan it, holding only the roadmap and the repo.
  Anything it would have to ask is a missing sentence. "As discussed" or "see above" is a
  pointer to replace with the fact itself.

## Output

Fill in `references/roadmap-template.md` and write it to `.agents/roadmaps/<feature>.md`.
Create the directory if missing. The template's "How to work this roadmap" section is
verbatim. Copy it word for word into every roadmap. Every box starts unchecked.

Those working rules send the executing sessions to `/piv-plan-implementation` and `/prime`. If the
repo lacks either skill, keep the rules as written and say so in the report. Do not rewrite
them around a substitute.

## Quality criteria

- [ ] The keystone and inviolable property trace to the repo's rules and PRD.
- [ ] Slice 1 proves the inviolable property end to end.
- [ ] Each slice carries one decision, ends shippable, and ends green.
- [ ] Slices are ordered by dependency, and irreversible decisions come first.
- [ ] Each entry says what it develops, what it solves, and its constraints, and stops.
- [ ] The Background carries its evidence in full. A stranger holding only this file and the
      repo has everything load-bearing.
- [ ] The Engineering focus names the theme and the naming discipline.
- [ ] "How to work this roadmap" is verbatim, and every box is unchecked.

## Report

- The slice count and the build order: which slices are independent, which integrate.
- The first slice to run.
- Any slice still carrying more than one decision, or drifted into implementation detail. It
  needs splitting or trimming.
