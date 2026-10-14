---
name: generate-plan
description: >-
  Turn a feature request, a tracker ticket, or the current conversation into an
  implementation plan. The developer agrees the scope, agents research the codebase and
  outside sources, and the developer settles the open decisions before the plan is
  written. Use before writing any code for a feature, or when asked to "plan this",
  "write a plan", or "plan the feature".
argument-hint: "[a ticket key or URL, a feature description, or empty to plan from the conversation]"
---

# generate-plan: the plan an executor can finish in one pass

## Feature: $ARGUMENTS

**Write no code here.** The output is a plan. An executor with no memory of this
conversation must be able to finish it on the first try.

## Phase 1: Define the feature scope

Read the input. For a ticket (a key like `ABC-123`, or an issue URL), **fetch it first**
with the project's tracker tool. Read its summary, acceptance criteria, and context. Follow
its links up to the parent epic and any architecture document. Inherit their decisions.
When `$ARGUMENTS` is empty or points at the conversation, take the feature from this
session.

Before you open any code, write the feature back to the developer:

```
As a <type of user>, I want to <action/goal>, so that <benefit/value>.

Afterwards: <two sentences on what exists that is not there today>
Criteria:
1. <what a user can observably do, or what must observably be true, when it is done>
2. (assumed) <a criterion the input left open, as you read it>
Out: <what the feature will not do>
Settled: <a decision the input or a document it links to already made, or none>
```

- Write outcomes, with no file, function, or type name. You have read no code, so a name
  here is a guess.
- Where the input states the story or a criterion, keep its words.
- Where the input says nothing and the feature needs an answer, write your reading and
  mark it `(assumed)`. Do not ask. The developer corrects a line faster than they answer a
  question.
- Where the input names an open question, leave it open. Research answers it or Phase 3
  asks it. An assumed answer here closes it before anyone has looked.
- `Settled` holds decisions only. A fact from the input stays in the input, which the
  research agents receive.
- Write only the criteria the input gives you or forces you to assume. Research adds the
  rest.

❌ `Archiving works correctly.`

✅ `An owner archives a record from the list, and the row leaves once the server confirms.`

Stop and wait for the developer's corrections. Research starts from the block as they
agreed it. A line they agreed changes only in Phase 3.

## Phase 2: Research

Agents do the reading, so your context stays clear for the plan. Do not search the codebase
yourself first.

1. **Scout.** Send one `codebase-scout-agent` the Phase 1 block, word for word, and the
   ticket or document it came from, whole, if there is one. Its report gives the route
   through the code, the files the feature would change or add, and the slices that need a
   researcher.
2. **Size the work** from the scout's file counts. A mechanical change, such as a rename,
   counts as one file.
   - **About five or fewer:** it needs no plan. Say so, name the files and any decision
     Phase 3 would put to the developer, and stop. The developer says whether to build it.
   - **More than about twenty:** it is too big for one plan, because the developer will
     not read a change that size. Say so, say where you would cut it, and stop. The
     `decompose-feature` skill cuts it.
   - **In between:** plan it.
3. **Research each slice.** Send one `codebase-research-agent` per slice the scout named,
   and skip none. Send them all in one message so they run in parallel. Give each these,
   whole, because a summary drops whatever you did not think mattered:
   - the Phase 1 block, and the ticket or document it came from
   - the scout's report
   - its slice, by the name the scout gave it
   - any other question the plan must answer about its slice
4. **Research outside topics.** List what the feature needs from outside the codebase, one
   topic each: a library, an external API or service, a standard or protocol, a technique
   the codebase has no example of, or a function or option of an installed library that
   the codebase does not call yet. Two needs from the same library are one topic. Send one
   `external-research-agent` per topic, all in one message. Past five topics, send first
   the five that decide a design choice. Give each:
   - the feature, and what it needs from the topic
   - the topic, and for a library the version the codebase researchers found in use
   - where the code uses it now, as `file:line`
   - the local documents that cover it, as paths

   Skip a topic only when you can name the `file:line` where the codebase already calls
   the exact API the feature will use. An installed library is not a reason to skip. When
   unsure, dispatch.
5. **Sample real data.** Where the design rests on what real data or a live service
   returns, such as a payload's shape or how many rows a query reads, sample it now
   yourself, read-only. Never spend a metered call or write anything to do it. What you
   cannot sample that way becomes a check in the plan's `## Prerequisite` section.

**Check every report before you use it.**

- Read the lines it cites with the read tool, and copy each `file:line` number from that
  output.
- Read first-hand what the plan changes: the whole file when it is a few hundred lines or
  shorter, otherwise each function the plan changes and its callers in that file. For a
  file to mirror, reuse, match, or follow as a test, read the cited range, and widen it
  when it does not show what the report claims. Do not read every listed file in full: it
  fills the context the agents kept clear.
- Open only the outside references that decide a design choice. Record each one the plan
  uses with why the executor needs it.
- Do not redo what a report covers.
- Settle every gap and `Unverified` item the plan depends on now. Read the file if you know
  which one. Otherwise resume the agent that reported it, because a new agent starts with
  nothing. Never carry a gap into the plan as a risk or a hedge, and never cite an
  unverified item as fact.

**Collect open questions as you go. Do not ask yet.** Note every ambiguity, unstated
preference, and open architecture choice, and add each report's `Open Choices`. Phase 3
resolves them all. The one exception is an ambiguity that blocks the research itself, such
as a scout's report that shows the feature could land in two different places.

**Research is done when** every section of the plan's Design part can be filled from a
report line, a file you read, or a sample you took. A section you would have to guess is a
gap. Settle it now.

## Phase 3: Validate with the developer

**Never write the plan while a decision is open.** The executor holds only the plan.

1. **Choose the approach,** and note why you rejected the others.
2. **Collect** every open decision: from the approach, from every `Open Choices` section in
   the reports, and any choice research raised about scope, defaults, cost, where the
   feature appears, or how often it runs. Add any line of the Phase 1 block that research
   showed cannot hold, or costs far more than it looked.
3. **Settle what is already answered.** If the codebase, a standard, the request, or an
   earlier developer decision answers it, take that answer and record its source. Never
   ask what you can verify, and never recommend against a decision the developer already
   made.
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
5. **Report back in one message, then stop and wait:**

   ```
   Holds: <each criterion that can be built as agreed, by number and opening words>
   Changed: <a criterion that cannot, or costs far more than it looked, and why; or none>
   Approach: <four lines at most: where the feature enters, what it stores, which
             system does the work>
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
6. **A question is settled only when the developer confirms it:** they approve it, pick
   another option, or settle it by talking it through. Never take one as settled
   because they answered another or said to go on. Read each answer as new input too:
   it may raise a question, contradict an assumption, or ask you something back. Check
   it against the code and answer it. Ask again only when it opens a new decision that
   would cost a replan.

   End each reply with every question, written out:

   ```
   Settled: <the decision, as a fact>
   Open: <the question, in plain words>
   ```

   ❌ `Settled: 1, 2. Open: 3.`

   ✅ `Settled: archived records stay searchable, behind a filter.`

**Done when** the developer has confirmed every question and said to write the plan.
Every decision then goes into the plan as a fact, never an option list.

## Phase 4: Write the plan

Fill in the template at `references/plan-template.md`. The developer confirms the plan
from its Design part, so write that part for them. The Build part is the executor's.

- The Phase 1 block goes in word for word: the story and `Afterwards` under
  `What gets built`, the criteria under `ACCEPTANCE CRITERIA`, `Out` under `Out of scope`,
  and `Settled` under `Decisions`. Research adds to them.
- Mark each decision the developer made as theirs.
- **Spec, not code.** Give the contract (signatures, types, rules, edge cases) and a
  pseudocode sketch. If the executor could paste it and be done, it is code, so write
  pseudocode instead. The exception is data models. A schema or type is its own spec, so
  write it as real code, with each field exactly as it will be written.
- Use the codebase's own words in tasks.
- Every command, pattern and quoted string in the plan was run or matched while
  planning. What you did not run, describe and leave to the executor.
- A decision that first appears while you write goes back through Phase 3. Settled
  decisions stay settled.

**Done when** an executor with the repository open and no memory of this conversation
could build the feature from the plan alone. It can read the code, so point at code and
never copy it. It does not know what you decided, so state every decision. If it would
have to ask, the plan is not done.

**Output**: `.agents/plans/<kebab-case-descriptive-name>.md`. Create the directory if
missing.

## Report

Print the plan's Design part as it stands in the file. The developer confirms the plan
from it, so add nothing to it and leave nothing out. Then give:

- each outside topic you did not research, and the `file:line` that made the skip safe
- the full path to the plan, how many source files it expects to change, the key
  implementation risks, and a confidence score out of 10 that execution succeeds on the
  first try

The build starts on the developer's word, never on yours.

## Note

Phase 2 uses the `codebase-scout-agent`, `codebase-research-agent` and
`external-research-agent` agents, all installed alongside this skill. If you dispatch and
an agent is missing, say so and stop. Do not research in this session instead: it fills
the context the agents keep clear, and the plan looks finished when it is not.
