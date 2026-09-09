---
name: sync-skills
description: >-
  Sync the base skills in skills/ out to the project repos listed in targets.md, and
  harvest project-side improvements back into the base. Use when asked to "sync skills",
  "push skills to my repos", or "pull skill changes back". Maintainer tooling for this
  repo; it runs from here, not from the repos it syncs to.
---

# sync-skills — one source of truth, many repos

`skills/<name>/SKILL.md` in this repo is the base. Each target repo carries a copy under
`.claude/skills/<name>/`. Copies drift for two reasons, and the whole job is telling them
apart:

- **Generalizable** — a better rule, a tighter wording, a guardrail that would help every
  project. Belongs in the base. Harvest it.
- **Project-specific** — a stack command, a repo path, a domain noun, a reference to a
  command that only that repo has. Belongs in the copy. Preserve it, never push it up.

Get this wrong in either direction and the sync is worse than no sync: a project's
`pnpm` lands in a Python repo, or a genuinely better rule stays trapped in one copy.

## Inputs

- **Targets**: the repos in `targets.md`, a gitignored local file — copy
  `targets.example.md` to create it. The operator may name a subset, or a path not in
  the list.
- **Skills**: every directory in `skills/` unless the operator names some.
- **Direction**: `push` (base → copies), `harvest` (copies → base), or `both` (harvest
  first, then push). Not assumed — see step 0.

## Procedure

### 0. Confirm the direction before writing anything

This skill lives inside the base repo, so the base is always `skills/` here and the
copies are always the targets. What is not fixed is which side is newer. Run the
inventory (step 1), then state to the operator what you found and which direction it
implies — "service's handover has two hunks the base lacks; harvest?" or "base moved in
`abc123`, both copies are behind; push?" — and wait for the answer. A sync in the wrong
direction silently destroys the newer side, and `git` in the target may not have it.

### 1. Inventory

For each target × skill, classify before touching anything:

| State | Meaning |
|-------|---------|
| `missing` | target has no copy |
| `identical` | byte-equal to base |
| `behind` | differs, and every hunk is base-side text the copy predates (check `git log` in this repo for the base's recent changes) |
| `diverged` | the copy has hunks the base does not |

Do it with `diff` and `git log -p -- skills/<name>` here. Do not trust a memory of what
was synced last time; the tree is the record.

### 2. Judge each diverged hunk

For every hunk the copy has and the base does not, decide which it is. The tell is
**nouns**:

- Names a file, directory, command, package manager, framework, or domain term of that
  repo → **project-specific**. (`uv run`, `/piv-loop:prime`, `apps/engine/`, "k-line",
  "Supabase".)
- Names nothing outside the skill itself → likely **generalizable**. A rephrased
  procedure step, a new guardrail, a sharper output format, a removed section that was
  dead weight.
- A generalizable idea expressed with project nouns → **both**. Harvest the idea,
  rewritten without the nouns; leave the original in the copy.

When a hunk is genuinely ambiguous, stop and show it to the operator with the two
readings. Do not guess; a wrong harvest pollutes every other repo on the next push.

### 3. Harvest (copy → base)

Apply the generalizable hunks to `skills/<name>/SKILL.md` here. Rewrite as needed so the
base reads as one voice, not a patchwork. If two targets improved the same passage
differently, pick the better one or merge, and say which.

Commit here only when asked. Show the diff first.

### 4. Push (base → copy)

- `missing` → copy the directory in.
- `behind` → overwrite.
- `identical` → skip.
- `diverged` → overwrite, then **re-apply that copy's project-specific hunks** on top.
  The result should be: new base + that repo's local adaptations, nothing else. Verify
  with a final diff against the base: every remaining hunk should be one you classified
  project-specific in step 2.

Never commit in a target repo. Leave the change in its working tree and report it; the
operator commits there with whatever else is in flight.

### 5. Report

One table, target × skill, with the state found and the action taken. Then, separately:

- **Harvested** — each hunk pulled into the base, one line each, and which repo it came
  from.
- **Preserved** — each project-specific adaptation kept in a copy, one line each.
- **Needs a call** — ambiguous hunks, with both readings.

## Guardrails

- A target with uncommitted changes to the skill files gets reported, not overwritten.
  The operator may be mid-edit.
- Never edit a target's other skills or commands, even when a base skill references a
  command the target names differently (`/prime` vs `/piv-loop:prime`). Report the
  mismatch; the rename is the operator's call.
- The base must not accumulate stack-conditional text ("if this is a Python project…").
  If a hunk only makes sense conditionally, it is project-specific.
- New base skills are pushed only when the operator asks for them by name. Adding a skill
  to `skills/` does not opt every target into it.
