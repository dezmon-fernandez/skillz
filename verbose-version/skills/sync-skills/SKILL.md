---
name: sync-skills
description: >-
  Sync skills and commands between the team gold standard (.opencode/) and the
  operator's personal Claude Code set (.claude/), applying the cross-tool
  portability rules. Use when asked to "sync skills", "port a skill", "check
  skill drift", or before graduating a skill from staging into either tree.
---

# sync-skills — keep .opencode and .claude copies aligned

> **DRAFT — not yet reviewed.** The operator has not done a prose pass or approved
> this skill. Treat the rules as claims to verify, not doctrine, until this banner
> is removed.

`.opencode/` is the version-controlled team gold standard (read by coworkers'
opencode). `.claude/` is the operator's personal set (read by their Claude Code;
gitignored, intentionally near-copies). Sync is manual and one-way at a time —
the operator says which direction. Never sync without showing the diff first.

## Procedure

1. Show the drift:

   ```bash
   diff -ru .opencode/skills .claude/skills
   diff -ru .opencode/commands .claude/commands 2>/dev/null
   ```

   Note: opencode commands are flat files (`commands/prime.md`); Claude skills are
   directories (`skills/prime/SKILL.md`). A command syncs to `.claude/skills/<name>/SKILL.md`
   or `.claude/commands/<name>.md` — Claude Code treats the two identically.

2. For each drifted file, report what differs and which side is newer. The
   operator picks direction per file — expected divergences (Claude-only
   frontmatter in `.claude` copies) are NOT drift; leave them.

3. Port with the rules below. Verify afterward:
   - opencode side: `opencode debug skill` must list the skill; missing = frontmatter
     problem. The CLI re-reads disk every run, so it sees the file at once — **a running
     session does not.** opencode loads config once and never hot-reloads, so a skill,
     command, agent or plugin change reaches a live session only after a restart.
     Verifying with the CLI and then testing in an already-open session reads as a
     broken sync when nothing is wrong.
   - `opencode debug config` shows what actually REGISTERED — commands under `command`,
     agents under `agent`, each body captured as `template` / `prompt`. Use it when
     `debug skill` looks right but the entry misbehaves.
   - Claude side: new/renamed skills appear next session.

## Portability rules (each one paid for — all verified against opencode v1.18.25 source or tested live)

**Frontmatter (opencode's accepted keys are closed sets — everything else fails silently):**

| File    | opencode accepts                                              |
| ------- | ------------------------------------------------------------- |
| skill   | `name`, `description`, `license`, `compatibility`, `metadata` |
| command | `description`, `agent`, `model`, `variant`, `subtask`         |
| agent   | see the Agents section below                                  |

- **Always write explicit `name:` on a SKILL**, matching the directory name. opencode
  silently drops a skill without `name:` (Claude Code infers it from the directory, which
  hides the bug). A `name:` that contradicts the directory registers under the wrong name
  and shadows the real one. Lowercase-hyphenated, 64 chars max. Commands take their name
  from the FILENAME — `name:` is not an accepted command key, so do not carry it across.
- **`description:` is effectively required on a skill.** opencode filters out a skill
  without one and the model never sees it. It is also the only thing the model reads when
  deciding whether to load the skill: say what it does AND when to fire, third person,
  trigger words and filenames front-loaded.
- **Canonical files carry only `name:` + `description:`.** Claude-only fields —
  `paths:`, `disable-model-invocation:`, `allowed-tools:`, `argument-hint:` — live in the
  `.claude` copy only. The three files fail differently: opencode ignores unknown keys in
  SKILLS, they sit outside the accepted set in COMMANDS, and in AGENTS they are silently
  swallowed into `options`.
- **Never put `model:` in a shared file** — both tools read it with incompatible
  formats (Claude: `opus`; opencode: `provider/model`).
- **Never hand-write `template:` or `prompt:`.** A command's body IS its `template`; an
  agent's body IS its `prompt`. Declaring either key in frontmatter collides with the body.
- `disable-model-invocation: true` has no opencode equivalent in the file; the
  mapping is `permission.skill: { "<name>": "deny" }` in opencode.json (the skill
  stays user-invokable via slash — denial only hides it from the model). Truly
  user-only things should be commands instead.

**`` !` `` injected commands:**

- Valid in: Claude Code always (skills and commands, user- or model-invoked), and
  opencode COMMANDS. Literal text in opencode model-loaded SKILLS — so `` !` ``
  belongs only in files that are commands on the opencode side; skills use plain
  "Run X" instructions.
- **Guard every command**: `` !`cmd 2>/dev/null || echo "(fallback)"` ``. A
  non-zero exit aborts the ENTIRE invocation in Claude Code — nothing renders
  (opencode is nothrow). One missing binary on a teammate's machine kills the
  whole skill otherwise.
- **Placeholders sit alone on their own line**, label on the line above. Output
  replaces the placeholder in place — inline or bulleted placeholders wrap the
  OUTPUT in the surrounding text and render as soup.
- Claude Code dedupes a re-invoked skill whose rendered content is unchanged (short
  note, no second copy); opencode re-appends full content every time. Keep skills
  static (no volatile `` !` `` output) or repeat-loads get expensive.

**`$ARGUMENTS` (the rule that decides skill vs command):**

- opencode substitutes `$ARGUMENTS` — and `$1`, `$2`, … for positionals — in COMMANDS
  ONLY. In a model-loaded skill it stays literal text, so a skill body reading
  `Read plan file: $ARGUMENTS` tells the model to open a file named `$ARGUMENTS`.
- Therefore **any procedure that takes an argument is a command on the opencode side**,
  whatever shape it has on the Claude side. This is what put generate-plan, review-plan
  and execute-feature-plan in `.opencode/commands/` rather than `.opencode/skills/`.
- Claude Code substitutes in both, so the constraint is one-directional: opencode always
  decides.

**Placement (who fires it decides the directory):**

- Model-triggered guidance → `skills/` on both sides.
- Human-fired procedures (prime, handover) → `.opencode/commands/*.md` for the
  team. opencode hides skill-sourced entries from `/` autocomplete on purpose
  (`/skills` dialog or typing the full name still works); real commands
  autocomplete and shadow same-named skills.
- Path-triggered enforcement: Claude side uses `paths:` frontmatter (native);
  opencode side uses `.opencode/plugins/skill-triggers.js` +
  `.opencode/skill-triggers.json` (opencode has no native path triggers).

**Environment:**

- opencode natively scans `.claude/skills` (project and `~/.claude`). The
  operator's shell sets `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` so their opencode
  reads only `.opencode/`. Never put that variable in a repo file — it would also
  disable teammates' personal `~/.claude/skills`.
- Where the same skill name is visible to opencode from both trees, the `.claude`
  copy wins and shadows the canonical one.

## Agents (the third artifact type — less portable than skills)

|                 | opencode                                                | Claude Code                            |
| --------------- | ------------------------------------------------------- | -------------------------------------- |
| Location        | `.opencode/agent(s)/<name>.md`                           | `.claude/agents/<name>.md`             |
| Spawned by      | the `task` tool                                          | the `Agent` tool, via `subagent_type`  |
| Body            | becomes the prompt                                       | becomes the prompt                     |
| Model           | `provider/model-id`                                      | bare alias (`opus`, `sonnet`, `haiku`) |
| Tool limits     | `permission:` — allow/ask/deny, globs, LAST match wins    | `tools:` — flat allowlist              |
| Primary vs sub  | `mode: primary / subagent / all`                         | none; every agent is a delegate        |
| Unknown keys    | silently routed into `options`                           | ignored                                |

The body and `description` are shared; `model`, `mode`, and `permission`/`tools` are per-tool.
A four-field divergence, not a rewrite.

- **`model:` blocks a shared file outright** — same key, incompatible values, both tools read it.
  Same rule as skills, but it bites harder: a skill rarely pins a model, an agent almost always does.
- **`mode:` is opencode-only** and is dead weight on the Claude side, where every agent is already a
  delegate. Because opencode routes unknown keys into `options` instead of erroring, a typo like
  `modes:` vanishes silently and the agent registers as primary. Spell it right or lose the setting
  with no warning.
- **`permission:` and `tools:` are not mechanically translatable.** `edit: deny` maps to omitting
  Edit/Write from `tools:`, but opencode's `ask` has no agent-level expression in Claude Code — there
  is no third state. Anything resting on `ask` gets re-thought, not converted.
- **Never name the delegation tool in the body.** "Spawn via the `task` tool" is wrong in Claude Code;
  "use the Agent tool" is wrong in opencode. Write the prompt as the agent's ROLE and priorities and
  let each harness spawn it — a role-only prompt ports byte-for-byte, which is most of the file.
- **`description:` ports unchanged** and earns its place on both sides: it is what the spawning model
  reads to decide whether to delegate at all.
- **Project scope shadows global.** Configs deep-merge with project winning, so an agent in
  `.opencode/agent/` overrides a same-named one from `~/.config/opencode/` for anyone working in this
  repo — without touching their machine. That is the lever for superseding an installer-provisioned
  agent rather than depending on it.

`# VALIDATE` — the Claude Code column is model knowledge, NOT tested against the installed version.
`name`, `description`, `tools`, `model` are confident; whether it also accepts `color` or other keys
is unconfirmed. Verify before this table becomes doctrine.
