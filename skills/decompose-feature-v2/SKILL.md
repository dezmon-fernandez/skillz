---
name: decompose-feature-v2
disable-model-invocation: true
description: >-
  Break a feature too large for one plan into a roadmap: user stories in build order, each
  one plan's worth of work, with its high-level requirements, what research already found,
  and what is still unknown. Writes .agents/roadmaps/<feature>.md, a working document that
  carries the effort's goal and working rules across context clears. Use when asked to
  "decompose this feature", "break this into stories", "roadmap this", or when a feature is
  too big to plan in one pass.
argument-hint: "[feature, PRD section, or feature-idea doc]"
---

# decompose-feature-v2: a roadmap of user stories, each one plan's worth

## Feature: $ARGUMENTS

Break a feature into user stories and the order to build them. The roadmap stays high level:
the developer reads it to agree what gets built, in what order, and where the feature is
headed, so each story must read at a glance. A wrong roadmap sends every later plan the
wrong way.

A story is one part of the feature that one plan builds. It ships and stands on its own,
and it changes about six to twenty source files, tests aside. Cut as few stories as that
size allows. Built in order, each story is planned against what the earlier ones landed.

A story says **who wants what and why, what must be true when it is done, what research
already found, and what is still unknown**, and stops there. No signatures, data shapes,
file layout, or tests. No decisions either: deciding how to build a story is
`/generate-plan-v2`'s job, after its own research, and it puts the decisions to the
developer there.

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
- **Design approach**: the one approach the code follows across stories, and how things are
  named. Without it, each session picks its own.
- **Research the codebase, nothing else.** Send one `codebase-scout-agent-v2` the feature as
  the developer gave it, word for word. Its route, file counts, and slices show what exists
  today and how big each story is. Send no other agent, and do not search further yourself.
  Outside sources, such as an external service, a data provider, or a library, are each
  story's plan to research: write each question about one as an unknown on the story that
  needs it. Label each fact by how it was checked: measured, documented, from an earlier
  document, or not checked.

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
- **Settle what everything depends on first.** A story whose unknown decides something every
  later story builds on, such as the id every record is keyed on, comes before them.
- **Build on what exists. Do not assume.** Where it is unclear whether something exists,
  make it an unknown instead of guessing.

### 3. Fill each story

- **Requirements**: what must be true when the story is done, as outcomes a person can
  check. Include the repo rules the story must keep.
- **Known from research**: a known problem that would make the plan build the wrong thing,
  one line each. Where code lives and how to build it is the plan's to find: no file paths,
  function names, or line numbers here. Every other fact goes in the research notes at the
  end, which each plan re-checks. When unsure, put it in the notes.
- **A story reads in under a minute, about 25 lines at most.** A longer story is carrying
  plan detail: move that detail to the research notes.
- **Unknown, to explore**: a question research could not answer that this story's plan must,
  with what research found so far. A choice that is hard to reverse or spends money is
  written here as a question, never answered here.
- An unknown that affects several stories goes on the first story that needs it. Later
  stories say they use what that story settled.

- ❌ Known from research: the parser lives in `parse.py:120`, and a new client needs a field
  on the shared context.
- ✅ Known from research: the `points` key is already used by another feature, so this one
  needs its own key.

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
- [ ] Research was one scout of the codebase. Every question about an outside source is an
      unknown on its story.
- [ ] The first story proves the correctness rule, or it stops a loss, needs no other story,
      and the roadmap says why it goes first.
- [ ] Every story reads "As <user>, I want <what>, so that <why>", with requirements a person
      can check.
- [ ] Each story changes about six to twenty source files and ends shippable and green.
- [ ] Every known problem that would make a plan build the wrong thing sits on its story,
      with no file paths, function names, or line numbers.
- [ ] Each story reads in under a minute, about 25 lines at most.
- [ ] Every unknown sits on the first story that needs it, as a question, not a decision.
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

Research uses the `codebase-scout-agent-v2` agent, installed alongside this skill. If it is
missing, say so and stop. Do not research in this session instead: the roadmap would look
researched when it is not.
