---
name: decompose-feature-v2
disable-model-invocation: true
description: >-
  Break a feature too large for one plan into a roadmap: what is being built, why, and how
  the work splits into user stories in build order, each one plan's worth of work, with its
  high-level requirements and the questions its plan must answer. Writes
  .agents/roadmaps/<feature>.md, a working document that carries the effort's goal and
  working rules across context clears. Use when asked to "decompose this feature", "break
  this into stories", "roadmap this", or when a feature is too big to plan in one pass.
argument-hint: "[feature, PRD section, or feature-idea doc]"
---

# decompose-feature-v2: a roadmap of user stories, each one plan's worth

## Feature: $ARGUMENTS

Break a feature into user stories and the order to build them. The roadmap answers three
things: what is being built, why, and how the work splits. Research and discovery belong to
each story's plan, not here. The developer reads the roadmap to agree what gets built and
in what order, so each story must read at a glance. A wrong roadmap sends every later plan
the wrong way.

A story is one part of the feature that one plan builds. It ships and stands on its own,
and it changes about six to twenty source files, tests aside. Cut as few stories as that
size allows. Built in order, each story is planned against what the earlier ones landed.

A story says **who wants what and why, what must be true when it is done, and what its plan
must find out**, and stops there. No research findings: no measured facts, costs, or code
details. No signatures, data shapes, file layout, or tests. No decisions either: deciding
how to build a story is `/generate-plan-v2`'s job, after its own research, and it puts the
decisions to the developer there.

**Write in plain words.** Name the thing itself. No metaphors and no jargon. A term the repo
defines may be used as the repo defines it.

- ❌ `Keystone: the load-bearing deliverable.`
- ✅ `Goal: an owner can archive a record from the list.`

## Process

### 1. Understand the feature

- **Goal**: the one result this feature exists to produce, in the developer's words where
  they gave them.
- **Correctness rule**: the rule that must hold at every step. Take it from the repo's rules
  (CLAUDE.md) and requirements document (PRD). Do not invent it.
- **Scout the codebase to size and split, nothing else.** Send one `codebase-scout-agent-v2`
  the feature as the developer gave it, word for word. Its route, file counts, and slices
  show what exists today and how big each story is. Use them to cut and order the stories.
  Copy none of its findings into the roadmap. Send no other agent, and do not search
  further yourself. A question about an outside source, such as an external service, a
  data provider, or a library, is an open question on the story that needs it.

### 2. Cut the stories

- **The first story proves the correctness rule** end to end with the fewest moving parts.
  Exception: when waiting loses something that cannot be recovered later, such as data that
  is not being recorded, the story that stops the loss goes first and proves the rule on its
  own path. It needs no other story and holds only what stops the loss, even when that is
  under six files. Folded into a larger story, it waits on that story's dependencies, and
  the loss continues. The roadmap says why it goes first.
- **Size each story before you keep it.** More than about twenty source files is two
  stories, because the developer will not read a change that size. Fewer than about six is
  no story: fold it into the story that needs it. A mechanical change, such as a rename,
  counts as one file.
- **Code ships with its first caller.** A story that adds something nothing calls yet is too
  small to judge. Its pure core and the code with the side effects are one story.
- **Independent stories come before the stories that combine them.**
- **Settle what everything depends on first.** A story whose open question decides something
  every later story builds on, such as the id every record is keyed on, comes before them.
- **Build on what exists. Do not assume.** Where it is unclear whether something exists,
  make it an open question instead of guessing.

### 3. Fill each story

- **Requirements**: what must be true when the story is done, as outcomes a person can
  check. The first says what the story produces and where it goes, in positive words, and
  names the later story that uses it. A story described only by what it does not do leaves
  the reader asking where its output went. Include the repo rules the story must keep.
  Everything the developer asked for is a requirement, stated as they asked it, never an
  open question.
  - ❌ `It creates no customer or order records.`
  - ✅ `It saves each incoming message, as received, in one inbox table. Story C turns them
    into orders.`
- **Open questions**: what this story's plan must find out, as questions only, with no
  findings. A choice that is hard to reverse or spends money is written here as a
  question, never answered here.
  - ❌ `Which export format? Research found the vendor's CSV drops the time zone.`
  - ✅ `Which export format keeps the time zone?`
- An open question that affects several stories goes on the first story that needs it.
  Later stories say they use what that story settled.
- **A story reads in under a minute, about 25 lines at most.** A longer story is carrying
  plan detail: cut it. The plan finds it.

### 4. Check the order

- Order by what each story needs. Mark each story independent, or name the stories it needs.
- Each story ends shippable, with the test suite green, inside the size.
- Read every story as the session that will plan it, holding only the roadmap and the repo.
  Anything it would have to ask is a missing sentence.

## Output

Fill in `references/roadmap-template.md` and write it to `.agents/roadmaps/<feature>.md`.
Create the directory if missing. Copy the template's "How to work this roadmap" word for
word. Every box starts unchecked.

Those working rules send the executing sessions to `/generate-plan-v2` and `/prime`. If the
repo lacks either skill, keep the rules as written and say so in the report. Do not rewrite
them around a substitute.

## Quality criteria

- [ ] The goal and the correctness rule trace to the repo's rules and requirements.
- [ ] One scout sized and split the stories. Every question about an outside source is an
      open question on its story.
- [ ] The roadmap holds no research findings: no measured facts, costs, or code details.
- [ ] The first story proves the correctness rule, or it stops a loss, needs no other story,
      and the roadmap says why it goes first.
- [ ] Every story reads "As <user>, I want <what>, so that <why>", with requirements a person
      can check.
- [ ] Each story changes about six to twenty source files and ends shippable and green.
- [ ] Every story's first requirement says what it produces, where it goes, and which later
      story uses it.
- [ ] Each story reads in under a minute, about 25 lines at most.
- [ ] Every open question sits on the first story that needs it, as a question, not a
      decision or a finding.
- [ ] Plain words throughout: no metaphors, and no jargon the repo does not define.
- [ ] "How to work this roadmap" is verbatim, and every box is unchecked.

## Report

Print the roadmap's top lines, copied from the file, never reworded: the Goal section, the
"Stories in build order" list, and each story's "As <user>, I want <what>, so that <why>"
line under its name. The developer reads the rest in the file. A reworded report is a
second version that can disagree with the file.

Then add only:

- The first story to build, and why it goes first.
- Any story outside the size.
- The path the roadmap was written to.

## Note

Sizing uses the `codebase-scout-agent-v2` agent, installed alongside this skill. If it is
missing, say so and stop. Do not scout in this session instead: the sizes would look
measured when they are not.
