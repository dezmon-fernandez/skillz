# skillz

Reusable Claude Code skills. Each skill lives in `skills/<name>/SKILL.md`.

## Skills

| Skill | Purpose |
|-------|---------|
| `prime` | Load project context at the start of a session. Consumes a pending `.agents/handover.md` if one exists. |
| `handover` | Distill the live session into `.agents/handover.md` so a fresh session can resume via `/prime`. |

The two are a pair: `handover` writes the file, `prime` consumes and deletes it.

## Install into a project

Copy the skill directories you want into the project's `.claude/skills/`:

```sh
cp -R skills/prime skills/handover /path/to/project/.claude/skills/
```

Or with the skills CLI:

```sh
npx skills add dezmon-fernandez/skillz
```

## Layout

```
skills/
  <name>/
    SKILL.md      # frontmatter (description) + instructions
    ...           # optional supporting files
```

Add a new skill by creating `skills/<name>/SKILL.md` and adding a row to the table above.

## Maintaining copies in other repos

`/sync-skills` (a repo-local skill in `.claude/skills/`) pushes the base out to the repos
listed in `.claude/skills/sync-skills/targets.md` and harvests generalizable improvements
back. `targets.md` is gitignored since it holds local paths; start from
`targets.example.md`.
