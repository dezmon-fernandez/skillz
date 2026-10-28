---
name: walk-plan-v2
disable-model-invocation: true
description: >-
  Show the developer the Design part of an implementation plan: what gets built, the entry
  points, the data it reads and writes, the decisions, the call path, the models it serves
  and stores, and the rules traced on one worked value, opened in annotate so its diagrams draw. Changes nothing in
  the plan. Use after a plan is revised,
  and when asked to "walk me through the plan", "show me the shape of this plan", "what
  does this plan build", or "what models and functions does this add".
argument-hint: "[path to the plan]"
---

# walk-plan-v2: the plan as the developer needs to see it

## Plan: $ARGUMENTS

Goal: the developer judges the design before anything is built.

Change nothing in the plan or the code. Comments the developer sends from the page are
handled as the `annotate` skill says.

If the plan path is missing or the file cannot be read, say so and stop.

Read the plan file in full, even when this session wrote it. The implementer gets the
file, so the walkthrough describes the file.

- **The plan has a `# DESIGN` part.** It is the walkthrough. Open the plan file with the
  `annotate` skill, so its diagrams draw. Never repair it. Then reply with one line for each
  place the Build part relies on something the Design part does not state, naming the Design
  section it belongs under. Each such line shows the developer a hole in the plan.
- **The plan has none.** Write one from the plan's facts, in the shape the
  `generate-plan-v2` skill's `references/plan-template.md` gives the Design part, to
  `.agents/walks/<the plan's file name>`, replacing any earlier one, and open it with the
  `annotate` skill. It is a view of the plan, not a record. A name appears exactly as the
  plan spells it. Where the plan leaves out something a section needs, write
  `not stated in the plan` in that place.

Without the `annotate` skill, print the Design part, or the one you wrote, as the reply,
with each line about a hole under its section. Its diagrams then show as their source.

The walkthrough and the reply carry no opinion on a name, no recommendation, and no summary
after the last section. The developer forms a view from The path and Models.

## Note

The second case needs the `generate-plan-v2` skill installed alongside this one, for its plan
template. If it is missing, say so and stop.
