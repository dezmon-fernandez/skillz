---
name: commit
description: >-
  Stage the current work and write one atomic commit in the repo's own convention,
  capturing any change to the agent-context files in the body. Use when asked to
  "commit this", "make a commit", or after a change is verified and ready to land.
---

# commit — one change, one message, the repo's own idiom

A commit message is read years later by someone with no memory of this session, usually
through `git log` while hunting for why something is the way it is. Write for that reader.

**Atomic.** One commit is one change. Unrelated work in the same tree is a second commit
or is left unstaged — never folded in to save a round trip.

## Procedure

### 1. Review

```bash
git status
git diff HEAD
git diff --stat HEAD
git ls-files --others --exclude-standard   # untracked
```

### 2. Stage

Stage the tracked and untracked files that belong to *this* change. Never stage:
credential or environment files, large binaries, or anything unrelated to the task.

### 3. Learn the convention before writing the message

The repo already has one. Find it, do not assume it:

```bash
git log --oneline -20
```

Check for a release or lint config that fixes the allowed types (a semantic-release
config, a commitlint config, a CONTRIBUTING file). If one exists, its list is the only
list — a type outside it breaks the release, and the message is not yours to improvise.

❌ `feat: stuff` (type guessed, scope omitted, says nothing)
✅ `fix(auth): reject tokens whose issuer no longer matches the tenant`

Body: **why**, not what. The diff already says what changed; it cannot say what the
alternative was or which bug this closes.

Attribution lines (`Co-Authored-By`, tool footers) follow the repo's convention — check
recent commits before adding or omitting one.

### 4. Capture agent-context changes in the body

If this commit touches the files that steer agents — the rules file at the project root,
anything under the agent-config directory (skills, commands, hooks, docs, rules) — add a
`Context:` section to the body:

```
feat(session): retry when the worker subprocess dies mid-run

Exponential backoff on crash. Previously one crash failed the whole run.

Context:
- Added a retry convention to the rules file
- Added a skill for inspecting session state
- Surfaced issue: module mocks in the retry tests need an isolated batch

Fixes #482
```

**Why this matters:** the git log is the project's long-term memory, and the agent layer
evolves faster than the code. A context change that lands silently cannot be traced back
to the problem that caused it, so the next person deletes the rule that was protecting
them.

### 5. Report

Verify with `git log -1 --oneline` and `git show --stat`, then report the hash, the full
message in a code block, the files committed, and the insertion/deletion counts.

## Notes

- Nothing to commit → say so plainly; do not invent a change.
- A failing pre-commit hook is a result, not an obstacle: report its output, fix the
  cause, and do not reach for `--no-verify` without being told to.
