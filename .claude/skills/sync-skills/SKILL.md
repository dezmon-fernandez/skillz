---
name: sync-skills
description: >-
  Sync the base skills in skills/ out to a project repo the developer names, and
  harvest project-side improvements back into the base. Use when asked to "sync skills",
  "push skills to my repos", or "pull skill changes back". Maintainer tooling for this
  repo. It runs from here, not from the repos it syncs to.
---

# sync-skills: one source of truth, many repos

`skills/<name>/SKILL.md` in this repo is the base. Each target repo carries a copy under `.claude/skills/<name>/`. Copies drift apart from the base for two reasons. The whole job is telling them apart.

- **Generalizable**: a better rule, a tighter wording, a guardrail that would help every project. It belongs in the base. Harvest it.
- **Project-specific**: a command for that repo's tools, a repo path, a word from that product's domain, a reference to a command that only that repo has. It belongs in the copy. Preserve it. Never push it up.

Get this wrong in either direction and the sync is worse than no sync. One repo's build command lands in a repo that has never heard of it. Or a genuinely better rule stays trapped in the single copy that happened to get it right.

## Inputs

- **Targets**: the repo paths the developer names when invoking the skill, as in "sync handover to <path>". There is no stored list of repos. If the developer names none, ask for one. Do not scan the filesystem for candidates.
- **Skills**: every directory in `skills/` unless the developer names some.
- **Direction**: `push` (base to copies), `harvest` (copies to base), or `both` (harvest first, then push). Work it out from the files, then confirm it. See step 0.

## Procedure

### 0. Work out the direction, then confirm it

This skill lives inside the base repo. So the base is always `skills/` here, and the copies are always the targets. Which side is newer is not fixed. Work that out from the files instead of asking the developer with no evidence. Run the inventory in step 1, then read the evidence:

| Evidence | Reads as |
|----------|----------|
| Every difference is text from the base, and this repo has commits touching `skills/<name>` since the copy was written | **push** |
| The copy has a difference that `git log -S'<a distinctive line from it>' -- skills/<name>` cannot find anywhere in this repo's history | **harvest**. Someone wrote the text there. Nobody deleted it here. |
| The target's own `git log` shows its copy edited more recently than the base's last change to that skill | **harvest**, and say so. It was edited on purpose, not left behind. |
| Both sides have differences the other lacks | **both**. Harvest first, then push. A push first destroys what you did not harvest. |

State the direction as a recommendation and put the evidence under it. For example: "the target's `handover` has two differences that `git log -S` finds nowhere in this repo's history, so this reads as a harvest." Then wait for a yes. Propose a direction rather than asking with no evidence. Write nothing before the developer answers. A sync in the wrong direction destroys the newer side without saying so, and the target repo may not have that side in `git`.

File modification times are not evidence. A fresh clone stamps every file at once. When the evidence is genuinely mixed, say so and name what would settle it. A tie does not default to push.

### 1. Inventory

For each target and skill, classify before touching anything:

| State | Meaning |
|-------|---------|
| `missing` | target has no copy |
| `identical` | byte-equal to base |
| `behind` | differs, and every difference is text from the base that the copy predates (check `git log` in this repo for the base's recent changes) |
| `diverged` | the copy has differences the base does not |

Do it with `diff` and `git log -p -- skills/<name>` here. Do not trust a memory of what was synced last time. The files are the record.

### 2. Judge each diverged difference

For every difference the copy has and the base does not, decide which kind it is. The clue is the **nouns**:

- If it names a file, directory, command, package manager, framework, or domain term of that repo, it is **project-specific**. (`<pkg-manager> run <task>`, `/<plugin>:<command>`, `apps/<service>/`, a word only that product's domain uses.)
- If it names nothing outside the skill itself, it is likely **generalizable**. A rephrased procedure step, a new guardrail, a sharper output format, a removed section that was dead weight.
- If it is a generalizable idea written with project nouns, it is **both**. Harvest the idea. Leave the original in the copy.

**Harvest the example, not just the rule.** A rule is worth keeping when it shows itself applied. Do not strip a difference's example to remove its project nouns. Put each noun in `<angle brackets>` instead, which is the placeholder convention the base skills already use. The placeholder stays in the base. The copy fills it in.

- ❌ `run the project's test command before committing` (true, and teaches nothing, because the example carried the content)
- ❌ `run <the literal command from the repo you harvested it from> before committing` (pushes one repo's tools into every other repo on the next push)
- ✅ `run the whole suite before committing with <test-runner> <suite>, not the one file you touched. A green file and a red suite look identical from inside the file.`

When a difference is genuinely ambiguous, stop and show it to the developer with the two readings. Do not guess. A wrong harvest pollutes every other repo on the next push.

### 3. Harvest (copy to base)

Apply the generalizable differences to `skills/<name>/SKILL.md` here. Rewrite as needed so the base reads as one voice, not a patchwork. If two targets improved the same passage differently, pick the better one or merge them, and say which.

Commit here only when asked. Show the diff first.

### 4. Push (base to copy)

- `missing`: copy the directory in.
- `behind`: overwrite.
- `identical`: skip.
- `diverged`: overwrite, then **re-apply that copy's project-specific differences** on top. The result should be the new base plus that repo's local changes, and nothing else. Verify with a final diff against the base. Every remaining difference should be one you classified as project-specific in step 2.

**Re-apply each adaptation as its own block**: a whole paragraph, bullet, or section, set off by blank lines, placed after the base passage it adapts. Never weave it back into a base sentence, even when that is where the copy had it. A woven line reaches the next push as a changed base line, and nothing on it says which half is the adaptation and which half is stale.

The copy before the push, with its command inside a sentence the base has since rewritten:

```markdown
Run `make test` and fix what fails before moving on.
```

The base now:

```markdown
Run the whole suite, not the one file you touched. A green file and a red suite look identical from inside the file.
```

The final diff, base against the pushed copy:

```diff
 Run the whole suite, not the one file you touched. A green file and a red suite look identical from inside the file.
+
+The suite here is `make test`.
```

Every base line is context and every hunk is `+` lines only. A `-` line means the copy edited base text: lift the adaptation out into a block and restore the line. The one exception is a slot the copy fills, below, where the line differs by the placeholder's value and nothing else.

A pushed `<placeholder>` is a space to fill, not text to install:

- If the copy already fills that placeholder with a real command or path, **keep the copy's**. Overwriting a working command with `<test-runner>` is a regression, and step 2 would only harvest it back next time.
- If the copy does not fill it, leave the placeholder standing and report it. A visible `<angle bracket>` is a to-do the developer can see. A plausible guess is one they cannot see.
- If a base rewrite lands on the same passage a local change edited, do not merge the two silently. Show both and let the developer pick.

Never commit in a target repo. Leave the change in its working tree and report it. The developer commits there with whatever else is in progress.

### 5. Report

One table, with a row for each target and skill, showing the state found and the action taken. Then, separately:

- **Harvested**: each difference pulled into the base, one line each, and which repo it came from.
- **Preserved**: each project-specific change kept in a copy, one line each.
- **Needs a call**: ambiguous differences, with both readings.

## Guardrails

- A target with uncommitted changes to the skill files gets reported, not overwritten. The developer may be in the middle of an edit.
- Never edit a target's other skills or commands, even when a base skill references a command the target names differently (`/<command>` vs `/<plugin>:<command>`). Report the mismatch. The rename is the developer's decision.
- The base must not collect text that only applies to one tech stack ("if this is a Python project…"). If a difference only makes sense conditionally, it is project-specific.
- New base skills are pushed only when the developer asks for them by name. Adding a skill to `skills/` does not sign every target up for it.
- **A dependency goes with the skill that names it.** When a pushed skill names a base agent (`agents/<name>.md`, copied to the target's `.claude/agents/`) or a sibling base skill the target lacks, push that too, and whatever it names in turn. A skill pushed without its agent stops at its first step. An agent the target already has under the same name is synced like a skill, steps 1 to 4. One under a different name is not a substitute: push the base one, leave theirs alone, and report both.
