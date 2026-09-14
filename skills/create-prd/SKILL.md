---
name: create-prd
description: >-
  Turn a conversation, a notes file, or a feature description into a Product Requirements
  Document at .agents/PRD.md — the project's source of truth for vision, scope, and
  success criteria. Use when asked to "write a PRD", "create a PRD", or "write this up as
  requirements". /prime reads the result at the start of every later session.
argument-hint: "[a notes file, a description, or empty to use the conversation]"
---

# create-prd — the document every later session primes from

## Input: $ARGUMENTS

Resolve the input first. `$ARGUMENTS` may be either, or both:

- **A path** that exists → read it and treat its contents as source material.
- **A description** → treat it as source material alongside the conversation.
- **Empty** → derive the PRD entirely from the conversation so far.

## Output

Always `.agents/PRD.md`. If that file already exists, **ask whether to overwrite, merge,
or abort before writing.** A PRD is the document other sessions trust without re-deriving;
silently replacing one destroys decisions nobody recorded anywhere else.

## Procedure

1. **Extract.** Work the whole conversation and any source file for explicit requirements,
   implicit needs, technical constraints, stated preferences, and success criteria.
2. **Sort what you know from what you are inventing.** Every gap you fill is an assumption,
   and it gets reported in step 5. If a *critical* gap would make the PRD wrong rather than
   merely thin — who the user is, what the MVP must do — ask before writing.
3. **Write** the sections below. Adapt their depth to what you actually know; a section
   padded to look complete is worse than a short one.
4. **Check** against the quality list.
5. **Report** the path, a short summary, every assumption you made, and the next step.

## Sections

Required:

1. **Executive summary** — the product in 2–3 paragraphs, its core value, the MVP goal.
2. **Mission** — the mission statement and 3–5 core principles.
3. **Target users** — personas, their technical comfort, their needs and pain points.
4. **MVP scope** — ✅ in scope, ❌ out of scope, grouped by area. Out of scope carries
   the reason; a feature is either fully in or explicitly out.
5. **User stories** — 5–8, as "As a <user>, I want to <action>, so that <benefit>", each
   with a concrete example.
6. **Architecture and patterns** — the high-level approach, the structure, the key design
   patterns.
7. **Features** — the detailed specification of each one.
8. **Technology stack** — languages, frameworks, versions, dependencies, integrations.
9. **Security and configuration** — authentication and authorization, configuration and
   secrets handling, what is in and out of security scope, deployment considerations.
10. **Success criteria** — what "MVP done" means, as observable, measurable statements.
11. **Implementation phases** — 3–4 phases, each with a goal, deliverables, and the
    validation that closes it.
12. **Risks and mitigations** — 3–5 real risks, each with a specific mitigation.

Include when they apply: an **API specification** (endpoints, request and response shapes,
auth, example payloads), **future considerations** (post-MVP work), and an **appendix**
(related documents, key dependencies with links).

## Quality checks

- ✅ Every success criterion is observable — "works as expected" is not a criterion
- ✅ Every user story names a real benefit, not a restatement of the action
- ✅ MVP scope is small enough to be believed, and out-of-scope says why
- ✅ Technology choices carry their rationale
- ✅ Phases are actionable and each one ends with something checkable
- ✅ Terminology is consistent throughout — one name per concept
- ✅ Assumptions are reported to the operator, not buried in the prose

## Style

Professional and concrete. Markdown throughout: headings, lists, tables, code blocks.
✅ for in scope, ❌ for out of scope. Prefer a concrete example to an abstract description.
Comprehensive but scannable — this document is read by someone orienting, not studying.
