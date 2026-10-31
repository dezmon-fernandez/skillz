---
name: generate-plan-v2
disable-model-invocation: true
description: >-
  Turn a feature request, a tracker ticket, or the current conversation into an
  implementation plan. The developer corrects the feature's definition and approves the
  experiments before any code is read, agents research the code and measure every
  assumption about outside data, the
  developer confirms the design and its models, and then the build is planned. Use before
  writing any code for a feature, or when asked to "plan this", "write a plan", or "plan
  the feature".
argument-hint: "[a ticket key or URL, a feature description, or empty to plan from the conversation]"
---

# generate-plan-v2: the plan an executor can finish in one pass

## Feature: $ARGUMENTS

**Write no code here.** The output is a plan in the parts of
`references/plan-template.md`: the Definition, the Contract, the Build, and the Research
its agents are briefed from. The developer confirms the Definition and the Contract before
the Build is written. An executor with no
memory of this conversation must be able to finish the Build on the first try.

## Step 1: Define

Read the input. For a ticket (a key like `ABC-123`, or an issue URL), **fetch it first**
with the project's tracker tool. Read its summary, acceptance criteria, and context. Follow
its links up to the parent epic and any architecture document. Inherit their decisions.
When `$ARGUMENTS` is empty or points at the conversation, take the feature from this
session.

Before you open any code, write the feature back to the developer:

```
Feature: <what it is, its purpose, and its value to users, in two sentences>
As a <type of user>, I want to <action/goal>, so that <benefit/value>.
Problem: <what is wrong or missing today, for whom, and what shows it>

Criteria:
1. Given <the starting state>, when <the trigger>, then <what is observably true>.
2. (assumed) Given <...>, when <...>, then <...>.
Examples:
1. <a real case the developer can look up> → <what the user sees>
2. <a real case where something goes wrong> → <what the user sees>
Will not do: <what the feature will not do>
Settled: <each decision the input or a document it links to already made, quoted, with its path:line; or none>
Assuming: <each fact about data from outside the codebase the criteria rest on, or none>
Experiments:
E1. <the source, and how much of it is read>. Checks: <the assumptions it settles>. Cost: <free, a price, or the key it needs>.
```

- Write outcomes, with no file, function, or type name. You have read no code, so a name
  here is a guess.
- Where the input states the story or a criterion, keep its words.
- Where the input is silent and the feature needs an answer, write your reading and mark
  it `(assumed)`. Do not ask. The developer corrects a line faster than they answer a
  question.
- **Write the criteria for when things go wrong, not only when they go right.** For each
  input the feature reads, walk the usual cases: missing, empty, late, duplicated, changed
  after it was first seen, removed, half-failed, run twice, run at the same time, and at a
  boundary such as midnight, zero, or the maximum. Each one the feature must handle is a
  criterion. When unsure whether a case can happen, write it and mark it `(assumed)`: the
  developer cuts a line faster than a reviewer finds one missing.
- Under `Examples`, write two or three cases from the real world, each with what the user
  sees: a record, a day, or a name the developer can look up, never one you made up. One
  shows something going wrong. Each becomes a test on the record the experiment saves, and
  the developer judges the build by running them. When you know no real case, name its
  kind and mark it `(assumed)`; the experiment on that source picks a real one.
- Under `Assuming`, list what the criteria take for granted about outside data: what it
  holds, what it calls things, how often it arrives, and whether it can change or vanish.
  Step 2 checks each one. When unsure whether something is an assumption, list it.
- Under `Experiments`, number one experiment per source, E1, E2: what is read, how much of
  it, the assumptions it settles, and what that costs. Every assumption is in one. Plan to
  read the whole set when it is free. The developer's corrections decide which run: one
  they leave in is approved, and one they cut is declined and becomes a Prerequisite.

❌ `1. An owner can archive a record.` and nothing else.

✅ `1. Given an owner viewing the list, when they archive a record, then the row leaves once
the server confirms.` and `2. Given the server refuses, when they archive a record, then
the row stays and the reason shows.`

❌ `Example: a customer with three orders sees three orders.`

✅ `Example: the customer whose order 10482 was refunded in part on 3 March sees it once, at
its net total, marked refunded.`

Stop and wait for the developer's corrections. Research starts from the block as they
agreed it. A line they agreed changes only in step 3.

## Step 2: Research and check

Agents do the bulk reading, so your context stays clear for the plan. Do not search the
codebase yourself first.

**Create the plan file first,** at `.agents/plans/<kebab-case-descriptive-name>.md`, creating
the directory if missing. From the template, write the Definition and the Research part and
nothing else yet. The step 1 block goes in as agreed, word for word: `Feature` under
Feature Description, the story under User Story, `Problem` under Problem Statement, the
criteria under ACCEPTANCE CRITERIA, `Examples` under Examples, and `Will not do`, `Settled`
and `Assuming` under Solution Statement. Each experiment goes under Experiments with its E
number, marked `approved` or `declined`; each outside topic (item 4) under Outside topics as
T1, T2.

Every agent reads the plan. A brief is the plan's path and one item, nothing else. Never
paste the definition into a brief: retyped, it costs minutes per agent and staggers their
start.

❌ A brief holding the whole definition: 12,000 characters, retyped for every agent.

✅ `plan=.agents/plans/archive-records.md experiment=E2`

1. **Send the research out, in one message:**
   - One `codebase-scout-agent-v2`: `plan=<path>`. It is the only agent that reads the code.
     Its map gives the route, the files that would change or be added, the patterns to
     copy, the wiring, what calls the code that changes, and what it did not cover.
   - One `experiment-agent-v2` per approved experiment: `plan=<path> experiment=E<n>`.
   - One `external-research-agent-v2` per outside topic: `plan=<path> topic=T<n>`.
2. **Size the work** from the scout's file counts. A mechanical change, such as a rename,
   counts as one file.
   - **About five or fewer:** it needs no plan. Say so, name the files and any decision
     step 3 would put to the developer, and stop. The developer says whether to build it.
   - **More than about twenty:** it is too big for one plan, because the developer will
     not read a change that size. Say so, say where you would cut it, and stop. The
     `decompose-feature-v2` skill cuts it.
   - **In between:** plan it.
3. **Read the code yourself, from the map.** You hold the whole design, so the reading that
   decides it is yours. Read each file the map marks `change`: the whole file when it is a
   few hundred lines or shorter, otherwise each function that changes and its callers. Read
   the cited range of each `mirror`, `reuse`, `match` or `follow as a test`, and widen it
   when it does not show what the map claims. When the map lists no callers for code that
   changes, Grep for them. When the map names an area it did not cover, read it, or send a
   second `codebase-scout-agent-v2` to that area alone. Do not read every file the map lists
   in full.
4. **Outside topics,** sent in item 1. List what the feature needs from outside the
   codebase, one topic each: a library, an external API or service, a standard or protocol,
   a technique the codebase has no example of, or a function or option of an installed
   library that the codebase does not call yet. Two needs from the same library are one
   topic. Past five topics, send first the five that decide a design choice. Write each in
   the plan as a T line, with:
   - what the feature needs from the topic
   - the topic, and for a library the version in use when you know it
   - where the code uses it now, as `file:line`, when you know it
   - the local documents that cover it, as paths

   Skip a topic only when you can name the `file:line` where the codebase already calls
   the exact API the feature will use. A skipped topic keeps its T line, marked `skipped`
   with that `file:line`. An installed library is not a reason to skip. When unsure,
   dispatch.
5. **Run what research raised.** Each `experiment:` line from the reports, and any other
   question the design rests on that only running code answers, goes to an
   `experiment-agent-v2`: what real data or a live service returns, such as a payload's
   shape, the names it uses, how many rows a query reads, or whether a value can change or
   vanish; how long a query takes; what a library call does; how much memory a load needs.
   Write it into the plan first as the next E line, then brief its number. Do not run
   these in this session: what you read here fills the context the agents keep clear.
   - **Free and needs no key or credentials:** mark it `approved` and send it now.
   - **Costs money, or needs a key or credentials:** ask the developer now, before
     anything is designed. Say what it settles, what it costs, and what it needs from
     them. On a yes, mark it `approved` and send it.
   - **Declined, or it cannot be taken:** mark it `declined`. It becomes a check in the
     plan's `## Prerequisite` section, and the build waits for it.

   Record each result on its E line as `measured <how>, <n> of <total>, <when>`, from the
   agent's report. The agent saves what it measured under `.agents/samples/`. The task
   that writes the tests copies it to where the project keeps its test data, and the
   feature's tests run on that copy, never on values you make up. Made-up values are your
   guesses, the code gets written from the same guesses, and the test passes even when
   both are wrong.

   Never choose a design because it works without the fact. That design is a guess.

   ❌ `The service's spelling of one name is unknown, so names match on their last word.`

   ✅ `The service's names need its key. Asked; the developer approved the free call, and names match the measured list exactly.`

**Check every report before you use it.**

- Read the lines it cites with the read tool, and copy each `file:line` number from that
  output.
- For an experiment report, open the saved sample behind each count the design turns on,
  and check that count. A count you did not check is cited as the agent's, not as fact.
- Open only the outside references that decide a design choice. Record each one the plan
  uses with why the executor needs it.
- Do not redo what a report covers.
- Settle every gap and `Unverified` item the plan depends on now. Read the file if you know
  which one. Otherwise resume the agent that reported it, because a new agent starts with
  nothing. Never carry a gap into the plan as a risk or a hedge, and never cite an
  unverified item as fact.

**Collect open questions as you go. Do not ask yet.** Note every ambiguity, unstated
preference, and open architecture choice, and add each report's `Open Choices`. Step 3
resolves them all. The exceptions block the research itself: an ambiguity such as a scout's
report that shows the feature could land in two different places, and a sample that costs
money or needs a key (item 5).

**Research is done when** every section of the Definition and the Contract can be filled
from a report line, a file you read, or a sample you took, every E line holds its result or
is declined, and every T line has its report or is skipped. A section you would have to
guess is a gap. Settle it now.

## Step 3: Design, and confirm it with the developer

**Never write the Build part while a decision is open.** The executor holds only the plan.

1. **Choose the approach,** and note why you rejected the others.
2. **Collect** every open decision: from the approach, from every `Open Choices` section in
   the reports, and any choice research raised about scope, defaults, cost, where the
   feature appears, or how often it runs. Add any line of the step 1 block that research
   showed cannot hold, or costs far more than it looked.
3. **Settle what is already answered.** If the codebase, a standard, the request, or an
   earlier developer decision answers it, take that answer and record its source. Never
   ask what you can verify. A design that differs from a `Settled` line goes under `Decide`,
   quoting the line, never under `Shown`.
4. **Sort the rest** by one test: if the developer objected to this choice after the plan
   was written, what would it cost?
   - **A replan: ask.** Which system, or which query, does the work. How much gets
     built, what it costs to run, and what is left out. What a user sees or does, where
     the options differ in more than wording. Data the feature throws away and cannot get
     back.
   - **An edit, or nothing: decide.** A name, a field's meaning, a default, where code
     lives, a helper, how something is tested. Take the option that adds least, and check
     it works in the code. Put each name and meaning a caller will see under `Shown:` in
     the report, so the developer can correct it there.
5. **Finish the Definition and write the Contract** in the plan, from the template. The
   step 1 lines stay word for word. Research adds to them. Mark each decision the
   developer made as theirs. A decision still open is written as your recommendation and
   listed under `Decide` below.
6. **Check that it covers the criteria** before you show it. Every criterion has a place in
   the Contract: a line under What changes for the user, a field, or a step on a diagram.
   Every criterion about something going wrong has a refused or failed branch on a diagram.
   Every outside value that can be missing, change, or vanish has a criterion. A criterion
   with no place is a gap: design it, or take it to the developer under `Changed`.
7. **Show it, then stop and wait.** Open the plan with the `annotate` skill, so its diagrams
   draw. Without it, print the Definition and the Contract. Then reply in one message:

   ```
   Holds: <each criterion that can be built as agreed, by number and opening words>
   Changed: <a criterion that cannot, or costs far more than it looked, and why; or none>
   Size: <N> files to change, <N> to add
   Shown: <each name or meaning a caller will see, and the one you rejected; or none>

   Decide, worst first (or "Decide: none"):

   1. <the question, in plain words>
      Recommend: <option>. <why, in one sentence>
      Today: <what the user or a caller gets now, in the screen's words or the
             response's names>
      Options: <option>: <what it costs and what it rules out>
               <option>: <what it costs and what it rules out>
      Lost if wrong: <what a wrong answer costs once built>
   ```

   "Lost if wrong" sets the rank. Where options differ in a screen, a route, a
   signature or a model, sketch each one under Options. Write the questions here even
   when a multiple-choice prompt follows: the prompt shows nothing but its own words.
8. **A question is settled only when the developer confirms it:** they approve it, pick
   another option, or settle it by talking it through. Never take one as settled
   because they answered another or said to go on. Read each answer, and each comment
   from the page, as new input too: it may raise a question, contradict an assumption, or
   ask you something back. Check it against the code and answer it. Edit the plan to
   match, and show it again. Ask again only when it opens a new decision that would cost a
   replan.

   End each reply with every question, written out:

   ```
   Settled: <the decision, as a fact>
   Open: <the question, in plain words>
   ```

   ❌ `Settled: 1, 2. Open: 3.`

   ✅ `Settled: archived records stay searchable, behind a filter.`

**Done when** the developer has confirmed every question and the Contract, and said to
write the plan. Every decision is then a fact in the plan, never an option list.

## Step 4: Write the Build part

Fill in the template's Build part, below the confirmed Definition and Contract. The
Build part is the executor's.

- Change nothing above it. A change you find you need there is a new decision, and it goes
  back through step 3. Settled decisions stay settled.
- A fact the Build part rests on that the Definition or the Contract does not state, such as
  an outside value, a timing, or anything a caller sees, goes back through step 3 as an
  addition to them, with how it was checked. Never write it only into the Build part.
- **Spec, not code.** Give the contract (signatures, types, rules, edge cases) and a
  pseudocode sketch. If the executor could paste it and be done, it is code, so write
  pseudocode instead. The exception is data models. A schema or type is its own spec, so
  write it as real code, with each field exactly as it will be written.
- Use the codebase's own words in tasks.
- Every command, pattern and quoted string in the plan was run or matched while
  planning. What you did not run, describe and leave to the executor.

**Done when** an executor with the repository open and no memory of this conversation
could build the feature from the plan alone. It can read the code, so point at code and
never copy it. It does not know what you decided, so state every decision. If it would
have to ask, the plan is not done.

## Report

- the full path to the plan
- each outside topic you did not research, and the `file:line` that made the skip safe
- how many source files the plan expects to change, the key implementation risks, and a
  confidence score out of 10 that execution succeeds on the first try
- the next step: `/execute-plan-v2 <the plan's path>`. Or first, when the developer wants
  to go over the plan, `/walk-plan-v2 <the plan's path>`, best in a new session.

The build starts on the developer's word, never on yours.

## Note

Step 2 uses the `codebase-scout-agent-v2`, `external-research-agent-v2` and
`experiment-agent-v2` agents, all installed alongside this skill. The `deny-credential-reads`
hook, when the project installs it, blocks every agent and this session from reading a file
that holds keys or passwords. The experiment agent's own rules forbid it without the hook. If you dispatch and
an agent is missing, say so and stop. Do not research in this session instead: it fills
the context the agents keep clear, and the plan looks finished when it is not.

Step 3 shows the plan with the `annotate` skill when it is installed. Without it, print
the plan's Definition and Contract instead. Its diagrams then show as their source.
