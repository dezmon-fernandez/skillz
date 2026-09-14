> **You are resuming a session.** Run `/prime` — it consumes this file and deletes
> it. This file describes one moment and is wrong the instant work resumes — do not
> keep it, and never treat it as documentation.

## Task

Bring every skill, agent, and hook in this repo to the gold standard: the right state between
`verbose-version/` (the verbatim copy from one real project) and the slimmed base in `skills/`,
`agents/`, `hooks/`. The test for that standard is the one in `CLAUDE.md` § Skills: keep a sentence
only if you can name the wrong thing a session does without it. The immediate work is the two
reviewer agents. Operator: "The goal here is to write plans that give us rich one-shot context
execution. But as part of the execution, the reviewers are going to ensure the correctness of the
plan. That's the plan reviewer. And then the code reviewer makes sure we're writing maintainable code
that is readable" — "and correct".

First move on resume: read `agents/plan-reviewer.md` and `agents/code-reviewer.md`, then confirm
the starting point with the operator and work the list under Explore one item at a time.

## Done

- Repo surveyed and a six-item work list agreed with the operator (under Explore).
- WIP committed as `6f88155`: CLAUDE.md gains the per-sentence test and the "name what the skill
  depends on" rule; sync-skills takes a path at invocation instead of a `targets.md` list and
  harvests project nouns as `<placeholder>` slots; review-code routes findings by `fix goes`
  (code | plan | standards); `agents/plan-reviewer.md` and `agents/code-quality-pragmatist.md`
  added and listed in the README; project nouns scrubbed from handover and create-prd.
  `git status` clean after the commit.
- CLAUDE.md pre-commit checks: project-noun grep over the diff and both new agents hit only
  placeholders and anti-examples. No hook script changed, so none were run by hand.

## Where we left off

- Tree: `main`, clean, `6f88155` plus the handover commit on top, pushed to `origin/main`.
  Verify with `git status -sb`.
- Stopped before item 1. "Start with plan-reviewer first since it runs first in the loop" was
  proposed, not confirmed. Confirm it on resume.
- Commit and push approval covered the WIP commit and this handover only. Ask again for
  everything else.
- Nothing left running.

## Constraints

- "I'm trying to get to a gold standard. We have the verbose version and then we have the
  slimmed-down version, and I think there are strong points in between."
- "Why don't we list them out and then we could work through them one by one"
- `CLAUDE.md` binds every edit. Read it before touching a skill, agent, or hook.

## Facts

- Only `sync-skills` is installed in `.claude/skills/`. `/handover` and `/prime` are not invocable
  as slash commands in this repo (checked the skill listing and `ls .claude/skills`). This file was
  written by following `skills/handover/SKILL.md` by hand; on resume, follow
  `skills/prime/SKILL.md` by hand the same way.
- `verbose-version/agents/` holds only `code-reviewer.md` (read it). There is no verbose
  plan-reviewer to calibrate against; the base plan-reviewer was written fresh.
- `agents/code-reviewer.md`: the description says "correct, secure and accessible", but the process
  buries correctness under Logic Errors / Security / Accessibility. Operator wants correctness
  first-class (read the file; operator said "and correct").
- Reviewer output shapes differ (read both files). plan-reviewer: blocking | simpler shape |
  smaller gaps | verdict | architectural decisions. code-reviewer: verdict | stats | acceptance
  criteria | issues with `fix goes` | questions.
- `verbose-version/` is project-specific by design (Angular, zoneless, signals, Zod, vertical
  slices). It is the reference for what was cut, not a target to copy from.

## Explore

The agreed list, in order. Each item names what it settles.

1. Reviewer agents (`agents/plan-reviewer.md`, `agents/code-reviewer.md`): what each checks and
   where correctness lives. Settles the scope of both reviewers.
2. Reviewer output formats: whether both report in one shape. Settles what `review-plan` and
   `review-code` save and triage.
3. `skills/review-plan/SKILL.md`, `skills/review-code/SKILL.md`: what the skill does vs. what the
   agent does, and how context is handed to the agent. Settles the skill/agent boundary.
4. `agents/code-quality-pragmatist.md`: whether it earns a place next to code-reviewer, or
   code-reviewer's "Wrong Solution" category already covers it. Settles whether it stays.
5. `.claude/skills/sync-skills/SKILL.md`: the refactor was committed mid-flight. Check it against
   the new `CLAUDE.md`. Settles whether it is finished.
6. `CLAUDE.md`: whether skills should declare agent/hook dependencies in frontmatter, and any other
   gap the reviewer work exposes. Settles the build rules.
