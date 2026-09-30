---
name: generate-plan
description: >-
  Turn a feature request, the current conversation, or a tracker ticket into an
  implementation plan full of context. It works through codebase analysis, external
  research, and a decision gate that settles every open question with the developer. The
  plan states the contract and a pseudocode sketch, not literal implementation code. Use
  before writing any code for a feature, or when asked to "plan this", "write a plan", or
  "plan the feature".
argument-hint: "[a ticket key or URL, a feature description, or empty to plan from the conversation]"
---

# generate-plan: the plan an executor can finish in one pass

## Feature: $ARGUMENTS

**Write no code here.** The output is a plan. An executor with no memory of this
conversation must be able to finish it on the first try.

Resolve the input first:

- **A description:** plan from it.
- **Chat context** (`$ARGUMENTS` is empty or points at the conversation): the executor
  never sees this session. Restate the feature in your own words, confirm it with the
  developer, then plan from that.
- **A ticket** (a key like `ABC-123`, or an issue URL): **fetch it first** with the
  project's tracker tool. Read its summary, acceptance criteria, and context. Follow its
  links up to the parent epic and any architecture document. Inherit their decisions.
  Never plan from a bare key.

## Spec versus code

Give the **contract** (signatures, types, behavioral rules, edge cases) and a **pseudocode
sketch**. Pseudocode, examples, and specs are good. Paste-ready code is not.

**The test:** if the executor could paste it and be done, it is code. Write pseudocode
instead.

**The exception is data models.** A schema or type *is* its own spec. Write it as real
code, exactly as it will be written.

## Process

### Phase 1: Understand the feature

Pull out the core problem, the user value, the feature type (new capability, enhancement,
refactor, bug fix), and the complexity. Write the user story, or refine the one you have.

### Phase 2: Codebase intelligence

- **Structure**: languages, frameworks, runtime versions, directory layout, component
  boundaries, config files, build process.
- **Patterns**: find similar code. Note its naming, file layout, error handling, and
  logging, and the anti-patterns to avoid. Read the project's rules file.
- **Dependencies**: the libraries this feature touches, how they are used now, their
  versions, and any local docs.
- **Testing**: the framework, the structure, a similar test to mirror, coverage standards.
- **Integration points**: files to update, new files and where they go, registration and
  routing patterns, auth patterns if relevant.

**Collect open questions as you go. Do not ask yet.** Note every ambiguity, unstated
preference, and open architecture choice. Resolve them all at the Decision Gate, after
research has taught you how to ask each one well. The one exception is an ambiguity that
blocks the research itself, such as not knowing which subsystem to study.

### Phase 3: External research

Find the official docs for the libraries involved. Link to **section anchors**, not a
homepage. Look for examples, pitfalls, breaking changes, and migration guides. Note
performance and security concerns. Record each reference with *why* the executor needs it.

### Phase 3.5: Decision Gate (mandatory)

**Never write the plan while an open question remains.** Open questions are policy choices
that look like architecture questions. The codebase cannot answer them. A plan that guesses
makes the developer's decision for them.

1. **Collect** every unresolved decision: from the request, from Phase 2, and any choice
   research raised about scope, defaults, cost, where the feature appears, or how often it
   runs.
2. **Sort.** If the codebase, a standard, or an earlier developer decision answers it,
   resolve it and record how. Never ask what you can verify.
3. **Recommend before asking.** For each remaining item, form a recommendation and check
   it works in the code. Attach the trade-off: cost, how much of the system it touches,
   and upkeep.
4. **Ask** in batches of up to four. Put the recommended option first, labeled
   "(Recommended)". Each option's description states its consequence.
5. **Loop.** Read each answer as an answer *and* as new input. It may raise a question,
   contradict an assumption, or ask you something back. Check it against the code, answer
   it, and repeat until nothing is left.

**Done when** zero open questions remain and every decision appears in the plan as a
settled fact, never an option list. The executor holds only the plan.

### Phase 4: Strategic thinking

- How does this fit the architecture?
- What is the critical order of operations?
- What could go wrong (edge cases, race conditions, error paths)?
- How will it be fully tested?
- What are the performance and security effects?
- Can it be maintained?

Choose between approaches and state why. A **new** decision that belongs to the developer
goes back through the Decision Gate. Settled decisions stay settled.

### Phase 5: Write the plan

Fill in the template at `references/plan-template.md`. Every section is there because an
executor got stuck without it.

**Output**: `.agents/plans/<kebab-case-descriptive-name>.md`. Create the directory if
missing.

## Quality criteria

**Context complete**
- [ ] Every pattern to follow is named, with `file:line`
- [ ] Library usage has anchored links, each with a *why*
- [ ] Integration points are mapped, and pitfalls and anti-patterns noted

**Implementation ready**
- [ ] Tasks are ordered by dependency and run top to bottom
- [ ] Each task is atomic, testable alone, and has an executable `VALIDATE`
- [ ] Each task traces to an acceptance criterion

**Information dense**
- [ ] No generic references. Everything is specific and actionable
- [ ] Tasks use the codebase's own words
- [ ] Validation commands are non-interactive and run as written

**Decisions settled**
- [ ] The Decision Gate ran. Every open question was settled with the developer or
      verified against the code
- [ ] No section hands the executor an option list or an unanswered question

**The No Prior Knowledge test:** someone who does not know this codebase could build the
feature from the plan alone. If they would have to ask, the plan is not done.

## Report

After writing the plan, report:

- the feature and approach, briefly
- each decision settled at the Decision Gate, and what was chosen
- the full path to the plan
- the complexity assessment
- the key implementation risks
- a confidence score out of 10 that execution succeeds on the first try
