---
name: dk-generate-plan
disable-model-invocation: true
description: >-
  Turn a feature request, a tracker ticket, or the current conversation into an
  implementation plan an executor can finish in one pass. Defines the feature at a high
  level, researches the code, then settles the requirements and the design with the developer
  before the build is planned. Use before writing any code for a feature, or when asked to
  "plan this", "write a plan", or "plan the feature".
argument-hint: "[a ticket key or URL, a feature description, or empty to plan from the conversation]"
---

# dk-generate-plan: the plan an executor can finish in one pass

## Feature: $ARGUMENTS

We do not write code here. The output is a plan in the parts of `references/plan-template.md`.
An executor with no memory of this conversation builds the feature from it on the first try.

**Inherit, don't re-decide**

- Quote each decision the input and its linked documents already made, with its `path:line`
- Ask the developer before breaking one. Never diverge quietly

## Step 1: Understand the feature

**Resolve the input**

- A ticket (a key like `ABC-123`, or an issue URL): fetch it with the project's tracker tool
- Read its summary, acceptance criteria and context
- Follow its links up to the epic and any architecture document
- A description, or nothing: take the feature from it, or from this conversation

**Write it back, before you open any code**

```
Feature: <what it is, its purpose, and its value to users, in two sentences>
As a <type of user>, I want to <action/goal>, so that <benefit/value>.
Problem: <what is missing or wrong today, and for whom>
Will not do: <what the input rules out; or none>
Settled: <each decision already made, quoted, with its path:line; or none>
```

- Use the input's words
- Say what the user can do, not what the screen looks like
- Done or out of scope not stated? Ask. At most three questions, all at once

**Stop and wait for the developer's corrections.**

## Step 2: Research

**Set up**

- Create the plan at `.agents/plans/<kebab-case-name>.md`
- Write the agreed block into the template's Feature Description, User Story, Problem
  Statement and Solution Statement

**Fan out.** Send the agents in one message, each briefed with the plan's path and one item,
nothing else:

- one `dk-codebase-scout-agent`: `plan=<path>`. Always, however small the request looks. A
  missed read costs the plan's correctness; an extra scout costs minutes
- one `dk-external-research-agent` per outside topic: `plan=<path> topic=T<n>`. A topic is a
  library, API or standard the feature uses in a way the code does not already call. Write it
  into the plan first as a T line
- No outside topic? Send the scout alone

**Use the reports**

Take each part of a report to where the plan uses it. Never redo what a report answers.

- `Similar Features` → step 3's table. It must hold every similar feature, not only the one
  traced
- `Route` and `What Each Hop Lacks` → the design in step 4
- `Files` → the Size check below
- `Integration Points`, `Patterns to Copy`, `Callers`, `Traps`, `Beyond the Route` → the Build
  part's tasks and tests
- `Open Choices` → step 4's questions for the developer
- `Not Covered` and `Unverified` → read it yourself, or send a second scout. An `experiment:`
  line goes to step 3
- Each topic's report → its T line, and the tasks that use that library or API
- A topic skipped because the code already calls that exact API → name the `file:line`

**Then read the code yourself**

- Read what will change, and the parts of the similar features the plan copies
- Check every `file:line` a report cites before you use it
- Read the project's rules file: language, framework and versions, naming, error handling,
  logging, and where tests live. No report covers it

**Size**

- About five files or fewer: no plan. Name the files and stop
- More than about twenty: too big. Say where to cut it, and stop. `dk-decompose-feature` cuts it

## Step 3: Requirements, examples and experiments

Write back, from what research found:

```
Similar features:
| The user can | <feature> | <feature> | This plan |
|---|---|---|---|
| <one action> | ✓ path:line | ✗ | ✓, or ✗ and why |

Requirements:
R1. <what the user can do, or what must hold, in plain words>
R2. (assumed) <...>
Examples:
1. <a real case the developer can look up> → <what the user sees>
2. <a real case where something goes wrong> → <what the user sees>
Experiments: <one line each; or none>
```

**Similar features**

- Start from the scout's `Similar Features` table: one row per thing a user or caller can do
  in any similar feature
- A ✗ in this plan's column is a question for the developer, or a line under Will not do

**Requirements**

- Write them as a product manager would: what the user can do, and what must hold. One line
  each, with no code and no Given/When/Then. The tasks' tests carry the detail
- Keep the input's words where it has them
- No file or function names
- Cover each input going wrong: missing, empty, late, duplicated, changed, removed,
  half-failed, run twice, run at the same time, at a boundary
- Unsure a case can happen? Write it, marked `(assumed)`
- Input silent on what the user sees? Take it from the closest similar feature, and name it

**Examples**

- Use real cases the developer can look up. Never made up
- Include one where something goes wrong
- The build's tests run on their records

**Experiments are rare**

- Run one only when nothing written down answers a question the design needs
- The code, a spec, its types or the docs answer it? Read it there
- Can't name what in the plan changes with the answer? It is not an experiment
- One line each: the question, what changes with the answer, why nothing written answers
  it, what it reads, its time and cost

❌ `E1. Read every order the service returns, to check each one has a currency.`

✅ `Every order has a currency: the spec marks it required. Not measured.`

**Stop and wait for the developer's corrections.** Then:

- Write the agreed requirements and examples into the plan's Definition
- Send one `dk-experiment-agent` per approved experiment: `plan=<path> experiment=E<n>`
- Write each result on its E line. Open the saved sample behind any count the design uses
- A declined experiment becomes a check under `## Prerequisite`. The build waits for it

## Step 4: Design

**Think it through**

- How does it fit the existing architecture and the similar features?
- What are the dependencies, and the order of work?
- What could go wrong, and what does each failure look like to the user?
- What does each data source record? Where would the design infer from data being absent?
- How will it be tested?
- What does it cost in performance and security?
- How maintainable is it?

**Ask the developer when the options differ in**

- what the user sees or does. Sketch each option
- which system does the work
- how much gets built, and what is left out
- a `Settled` line, or how the similar features work
- data thrown away for good

**Decide the rest yourself**

- Names, where code lives, helpers, how it is tested
- Use what the code already does, even when new code would be shorter

**Show it, then stop**

- Write the Definition and the Contract into the plan
- Open it with the `annotate` skill if installed; otherwise print them
- Reply:

```
Changed: <a requirement that cannot hold, or costs far more than it looked, and why; or none>
Size: <N> files to change, <N> to add

Decide, worst first (or "Decide: none"):
1. <the question, in plain words>
   Recommend: <option>. <why, in one sentence>
   Today: <what the user gets now>
   Options: <each option, sketched where they differ on screen, with what it costs>
```

- A question is settled only when the developer confirms it. An answer to another, or "go
  on", does not settle it
- Edit the plan to match each answer
- End each reply with every question written as `Settled:` or `Open:`

## Step 5: Write the Build part

- Fill the template's Build part, below the confirmed Definition and Contract
- Under each task, write the tests it makes pass, each with its Input, Does and Output and
  the requirement it proves, including each way an input the task reads can go wrong. A
  screen's test is what the user does and sees
- Spec, not code: signatures, types, rules and edge cases, in pseudocode
- Data models are the exception: real code, every field as it will be written
- Point at code. Never copy it
- State every decision
- Run or match every command and quoted string in the plan
- A change above the Build part is a new decision. Take it back through step 4

**Check before you report**

- [ ] Every requirement is proven by some task's tests, and every test names the
  requirement it proves
- [ ] Every `file:line` was checked
- [ ] Every task lists its tests first, and the command that runs them
- [ ] A test that proves something does not happen fails when it does
- [ ] No task builds what a similar feature already has
- [ ] An executor with the repository and no memory of this conversation could build it

## Report

- The full path to the plan
- Each outside topic skipped, and the `file:line` that made the skip safe
- How many source files change, the key risks, and a confidence score out of 10
- The next step: `/dk-execute-plan <path>`, or first `/dk-walk-plan <path>` in a new session

The build starts on the developer's word, never on yours.

## Depends on

- The `dk-codebase-scout-agent`, `dk-external-research-agent` and `dk-experiment-agent`
  agents. One missing when you send it? Say so and stop. Doing its research here makes the
  plan look finished when it is not
- The `deny-credential-reads` hook, when installed, blocks reading files that hold keys
- Without the `annotate` skill, the plan's diagrams show as their source
