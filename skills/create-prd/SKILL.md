---
name: create-prd
description: >-
  Turn a conversation, a notes file, or a feature description into a Product Requirements
  Document at .agents/PRD.md. The PRD is the project's source of truth for vision, scope,
  and success criteria. Use when asked to "write a PRD", "create a PRD", or "write this up as
  requirements". /prime reads the result at the start of every later session.
argument-hint: "[a notes file, a description, or empty to use the conversation]"
---

# create-prd: the document every later session primes from

Write the project's PRD to `.agents/PRD.md`. `/prime` reads it at the start of every later
session and trusts it, so a wrong PRD misleads all of them.

## Input: $ARGUMENTS

Resolve the input first. `$ARGUMENTS` may hold a path, a description, or both:

- **A path** that exists: read it as source material.
- **A description**: use it as source material alongside the conversation.
- **Empty**: derive the PRD from the conversation so far.

## Output

Always `.agents/PRD.md`. If it already exists, **ask whether to overwrite, merge,
or abort before writing.** Other sessions trust a PRD without re-deriving it. Silently
replacing one destroys decisions recorded nowhere else.

## Procedure

1. **Extract.** Read the whole conversation and any source file. Collect explicit
   requirements, implicit needs, technical constraints, stated preferences, and success
   criteria.
2. **Sort what you know from what you are inventing.** Every gap you fill is an assumption,
   and step 5 reports it. Some gaps make the PRD wrong, not just thin, such as who the user
   is or what the MVP must do. If a gap is that *critical*, ask before writing.
3. **Write** the sections below. Adapt depth to what you know. A section padded to look
   complete is worse than a short one.
4. **Check** against the quality checks.
5. **Report** the path, a short summary, every assumption you made, and the next step.

## Sections

Required:

1. **Executive summary:** the product in 2 to 3 paragraphs, its core value, and the MVP goal.
2. **Mission:** the mission statement and 3 to 5 core principles.
3. **Target users:** personas, their technical comfort, and their needs and pain points.
4. **MVP scope:** ✅ in scope and ❌ out of scope, grouped by area. Each out-of-scope item
   carries its reason. A feature is either fully in or explicitly out.
5. **User stories:** 5 to 8, written as "As a <user>, I want to <action>, so that <benefit>".
   Give each one a concrete example.
6. **Architecture and patterns:** the high-level approach, the structure, and the key design
   patterns.
7. **Features:** the detailed specification of each one.
8. **Technology stack:** languages, frameworks, versions, dependencies, and integrations.
9. **Security and configuration:** authentication and authorization, configuration and
   secrets handling, what is in and out of security scope, and deployment considerations.
10. **Success criteria:** what "MVP done" means, as observable, measurable statements.
11. **Implementation phases:** 3 to 4 phases. Each one has a goal, deliverables, and the
    validation that closes it.
12. **Risks and mitigations:** 3 to 5 real risks, each with a specific mitigation.

Include these when they apply:

- **API specification:** endpoints, request and response shapes, auth, example payloads.
- **Future considerations:** post-MVP work.
- **Appendix:** related documents, key dependencies with links.

## Quality checks

- ✅ Every success criterion is observable. "Works as expected" is not a criterion.
- ✅ Every user story names a real benefit, not a restatement of the action.
- ✅ MVP scope is small enough to be believed, and out-of-scope says why.
- ✅ Technology choices carry their rationale.
- ✅ Phases are actionable, and each one ends with something checkable.
- ✅ Use one name per concept throughout.
- ✅ Assumptions are reported to the developer, not buried in the prose.

## Style

- Professional and concrete. Prefer an example to an abstract description.
- Use Markdown throughout: headings, lists, tables, code blocks.
- Comprehensive but easy to scan. The reader is getting oriented, not studying.
