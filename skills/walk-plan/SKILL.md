---
name: walk-plan
description: >-
  Show the developer the Design part of an implementation plan: what gets built, the entry
  points, the data it reads and writes, the decisions, the call path, the models it serves
  and stores, and the rules traced on one worked value. Read-only. Use after a plan is revised,
  and when asked to "walk me through the plan", "show me the shape of this plan", "what
  does this plan build", or "what models and functions does this add".
argument-hint: "[path to the plan]"
---

# walk-plan: the plan as the developer needs to see it

## Plan: $ARGUMENTS

Goal: the developer judges the design before anything is built.

Write no file and change nothing. The walkthrough is the reply.

If the plan path is missing or the file cannot be read, say so and stop.

Read the plan file in full, even when this session wrote it. The implementer gets the
file, so the walkthrough describes the file.

- **The plan has a `# DESIGN` part.** Print it as it stands, from `# DESIGN` to
  `# BUILD`. Never repair it in the reply. Where the Build part relies on something the
  Design part does not state, say so in one line under that section. Each such line shows
  the developer a hole in the plan.
- **The plan has none.** Write one from the plan's facts, in the shape the
  `generate-plan` skill's `references/plan-template.md` gives the Design part. A name
  appears exactly as the plan spells it. Where the plan leaves out something a section
  needs, write `not stated in the plan` in that place.

The reply carries no opinion on a name, no recommendation, and no summary after the last
section. The developer forms a view from The path and Models.

## Note

The second case needs the `generate-plan` skill installed alongside this one, for its plan
template. If it is missing, say so and stop.
