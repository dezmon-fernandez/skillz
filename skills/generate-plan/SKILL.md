---
name: generate-plan
description: >-
  Turn a feature request, the current conversation, or a tracker ticket into a context-rich
  implementation plan through codebase analysis, external research, and a decision gate that
  settles every open question with the operator. The plan states the contract and a pseudocode
  sketch, not literal implementation code. Use before writing any code for a feature, or when
  asked to "plan this", "write a plan", or "plan the feature".
argument-hint: "[a ticket key or URL, a feature description, or empty to plan from the conversation]"
---

# generate-plan — the plan an executor can finish in one pass

## Feature: $ARGUMENTS

**No code is written in this phase.** The output is a plan rich enough that an executor
with no memory of this conversation succeeds on the first attempt.

Resolve the input first:

- **A free-form description** → plan directly from it.
- **Chat context** (`$ARGUMENTS` is empty or points at the conversation) → the feature
  lives in this session, which the executor never sees. Restate it in your own words,
  confirm the restatement with the operator, then plan from that.
- **A ticket** (a key like `ABC-123`, or an issue URL) → **fetch it before planning**,
  using whatever tracker tool this project has. Read its summary, acceptance criteria,
  and context, then follow its links up to the parent epic and any architecture document,
  and inherit those decisions rather than re-deciding them. Never plan from a bare key.

## The line between spec and code

The plan specifies the **contract** — signatures, types, behavioral rules, edge cases —
and a **pseudocode sketch** of the implementation. Pseudocode, examples, and specs are
encouraged; paste-ready code is not.

**Litmus:** if the executor could paste it and be done, it is code — back off to pseudocode.

**The exception is data models.** A schema or type *is* its own spec, so state those as
real code, exactly as they will be written.

## Process

### Phase 1 — Understand the feature

Extract the core problem, the user value, the feature type (new capability, enhancement,
refactor, bug fix), and the complexity. Write the user story, or refine the one you were
given.

### Phase 2 — Codebase intelligence

- **Structure**: languages, frameworks, runtime versions, directory layout, component
  boundaries, configuration files, build process.
- **Patterns**: search for similar implementations already in the tree. Extract naming
  conventions, file organization, error handling, and logging patterns. Note the
  anti-patterns to avoid. Read the project's rules file for its conventions.
- **Dependencies**: the libraries relevant to this feature, how they are already
  integrated, their versions, and any local documentation about them.
- **Testing**: the framework, the structure, a similar test to mirror, coverage standards.
- **Integration points**: the existing files that need updating, the new files to create
  and where they go, the registration/routing patterns, the auth patterns if relevant.

**Collect open questions as you go — do not ask yet.** Note every ambiguity, unstated
preference, and unresolved architecture choice. They are all resolved at the Decision Gate,
after research has armed you to ask each one well. The only exception is an ambiguity that
blocks the research itself, when you cannot tell which subsystem to investigate.

### Phase 3 — External research

Find the official documentation for the libraries involved, with **section anchors**, not
just a homepage. Look for implementation examples, known gotchas, breaking changes, and
migration guides. Note performance and security considerations. Record each reference with
*why* the executor needs it.

### Phase 3.5 — Decision Gate (mandatory)

**Never write the plan while an open question remains.** Open questions are operator
policy wearing an architecture costume: the codebase cannot answer them, and a plan that
guesses decides for the operator.

1. **Collect** every unresolved decision — from the feature request, from Phase 2, and any
   scope, default, cost, surface, or cadence choice research surfaced.
2. **Sort.** If the codebase, an existing standard, or a prior operator decision answers
   it, resolve it yourself and record the resolution. Never ask what you can verify.
3. **Recommend before asking.** For each remaining item, form a recommendation, verify it
   is feasible in the code, and attach the concrete trade-off — cost, blast radius,
   maintenance — the operator needs in order to choose well.
4. **Ask** in batches of up to four, recommended option first and labeled "(Recommended)",
   every option's description carrying its consequence.
5. **Loop.** Read each answer as an answer *and* as new input. An answer may raise a new
   question, contradict an assumption, or ask you something back — fact-check it against
   the code, answer it, and repeat until the set is empty.

**Done when** zero open questions remain and every decision appears in the plan as a
settled fact — never as an option list. The executor holds only the plan, not this
conversation.

### Phase 4 — Strategic thinking

How does this fit the existing architecture? What is the critical order of operations?
What could go wrong — edge cases, race conditions, error paths? How is it tested
comprehensively? What are the performance and security implications? Is this maintainable?

Choose between alternative approaches with a stated rationale. A **new** operator-owned
decision surfaced here goes back through the Decision Gate; decisions already settled
there stay settled.

### Phase 5 — Write the plan

Fill in the template at `references/plan-template.md`. Every section is there because an
executor stalled without it.

**Output**: `.agents/plans/<kebab-case-descriptive-name>.md` — create the directory if it
does not exist.

## Quality criteria

**Context complete**
- [ ] Every pattern the executor must follow is identified, with `file:line`
- [ ] External library usage is documented with anchored links, each with a *why*
- [ ] Integration points are mapped; gotchas and anti-patterns are captured

**Implementation ready**
- [ ] Tasks are ordered by dependency and can be executed top to bottom
- [ ] Each task is atomic, independently testable, and carries an executable `VALIDATE`
- [ ] Each task traces to an acceptance criterion

**Information dense**
- [ ] No generic references — everything specific and actionable
- [ ] Task descriptions use the codebase's own vocabulary
- [ ] Validation commands are non-interactive and executable as written

**Decisions settled**
- [ ] The Decision Gate ran: every open question was resolved with the operator or
      verified against the code
- [ ] No section hands the executor an option list or an unanswered question

**The No Prior Knowledge test:** someone unfamiliar with this codebase could implement the
feature from the plan's content alone. If they would have to come ask, the plan is not done.

## Report

After writing the plan, report: the feature and approach in short; each decision settled at
the Decision Gate and what was chosen; the full path to the plan; the complexity assessment;
the key implementation risks; and a confidence score out of 10 that execution succeeds on
the first attempt.
