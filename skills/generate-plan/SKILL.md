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

### Phase 1: Feature Understanding

**Deep Feature Analysis:**

- Extract the core problem being solved
- Identify user value and business impact
- Determine feature type: New Capability/Enhancement/Refactor/Bug Fix
- Assess complexity: Low/Medium/High
- Map affected systems and components

**Create User Story Format Or Refine If Story Was Provided By The User:**

```
As a <type of user>
I want to <action/goal>
So that <benefit/value>
```

### Phase 2: Codebase intelligence

`codebase-research-agent` instances find what you must read. Each one reports on five areas
of its slice: structure, patterns, dependencies, testing, and integration points. The agent
holds what each area covers.

1. Search the codebase for the key nouns from Phase 1 (entities, routes, screens, commands).
   Note which directories the hits fall in. Do not open the files.
2. Group the hits into subsystems: a package, service, module, or layer with its own
   directory and conventions. One with only a hit or two joins its nearest neighbor.
3. Send one agent per subsystem, all in one message so they run in parallel. A small feature
   gets one agent, never none. More than five means the grouping is too fine. Merge
   neighbors until it is five or fewer.

An agent sees neither this conversation nor the ticket. Give each:

- the feature in full, and the decisions already settled
- its slice, and the slices the other agents hold
- your search hits in its slice
- the questions the plan must answer about its slice, when you have any

❌ `We want to add archiving. Look at how records are deleted.`

✅ The same request as a brief:

```
Feature: an owner archives a record from the list. The row leaves once the server confirms.
Settled: archive is a soft delete on the server.
Your slice: record/. Other slices: list/, api/.
Hits: record/record-service:40, record/record-service:112.
Answer: what does delete() do to the cached list?
```

Each report opens with `Files to Read`. Each entry has a line range, what you will do with
the file, and why.

- Read in full each file the plan changes. For a file to mirror, reuse, match, or follow as
  a test, read the cited range, and widen it when it does not show what the report claims.
  Reading every listed file in full refills the context the agents kept clear.
- A report is a lead, not a fact. Read the file with the read tool to quote its lines, and
  copy each `file:line` number from that output.
- Do not re-explore what the reports cover.
- Settle every gap and `Unverified` item the plan depends on now. Read the file if you know
  which one. Otherwise resume the agent that holds that slice and ask it. A new agent starts
  with nothing. Never carry the gap into the plan as a risk or a hedge.

**Collect open questions as you go. Do not ask yet.** Note every ambiguity, unstated
preference, and open architecture choice, and add each report's `Open Choices`. Resolve them
all at the Decision Gate, after research has taught you how to ask each one well. The one
exception is an ambiguity that blocks the research itself, such as not knowing which
subsystem to study.

### Phase 3: External research

List what the feature needs from outside the codebase, one topic each: a library, an
external API or service, a standard or protocol, a technique the codebase has no example of,
or a function or option of an installed library that the codebase does not call yet.

Dispatch `external-research-agent` instances, one per topic, all in one message. Two needs
from the same library are one topic. Past five topics, send the five a design choice hangs
on first and the rest after.

An agent sees neither this conversation nor the Phase 2 reports. Give each:

- the feature, and what it needs from the topic
- the topic, and for a library the version Phase 2 found in use
- where the code uses it now, as `file:line`
- the local documents Phase 2 found that cover it, as paths

Each report lists references, pitfalls, and breaking changes. A reference is a
section-anchored link with the exact thing it documents and why.

- Open the few references that decide a design choice.
- Do not re-research what the reports cover.
- Settle every `Unverified` item the plan depends on. Resume the agent that reported it and
  ask. Never cite it in the plan as fact.
- A reference labeled `verify empirically`, and any item reading cannot settle, becomes a
  check in the plan's `## Prerequisite` section.
- Where sources disagree with each other or with the code, the report lists it under
  `Open Choices`. Take it to the Decision Gate.
- Record each reference in the plan with *why* the executor needs it.

Research is the default. Skip a topic only when you can name the `file:line` where the
codebase already calls the exact API the feature will use. An installed library is not a
reason to skip. When unsure, dispatch.

### Phase 3.5: Decision Gate (mandatory)

**Never write the plan while an open question remains.** Open questions are policy choices
that look like architecture questions. The codebase cannot answer them. A plan that guesses
makes the developer's decision for them.

1. **Collect** every unresolved decision: from the request, from Phase 2, from every
   `Open Choices` section in the reports, and any choice research raised about scope,
   defaults, cost, where the feature appears, or how often it runs.
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
- [ ] Every outside reference is an anchored link with a *why*
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
- each outside topic you did not research, and the `file:line` that made the skip safe
- the full path to the plan
- the complexity assessment
- the key implementation risks
- a confidence score out of 10 that execution succeeds on the first try

## Note

Phase 2 uses the `codebase-research-agent` agent and Phase 3 uses the
`external-research-agent` agent, both installed alongside this skill. If you dispatch and an
agent is missing, say so and stop. Researching in this session instead defeats the point of
the agent while still looking like success.
