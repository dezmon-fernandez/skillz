---
name: commit
description: >-
  Stage the current work and write one atomic commit in the repo's own convention. It
  records any change to the files that steer the agent in the commit body. Use when asked to
  "commit this", "make a commit", or after a change is verified and ready to land.
---

# commit: one change, one message, the repo's own idiom

A commit message is read years later, through `git log`, by someone with no memory of this
session who is asking why something is the way it is. Write for that reader.

**Atomic.** One commit is one change. Unrelated work in the same tree goes in a second
commit, or it is left unstaged. Never fold it in to save time.

## Procedure

### 1. Review

```bash
git status
git diff HEAD
git diff --stat HEAD
git ls-files --others --exclude-standard   # untracked
```

### 2. Stage

Stage the tracked and untracked files that belong to *this* change. Never stage credential
or environment files, large binaries, or anything unrelated to the task.

### 3. Learn the convention before writing the message

The repo already has one. Find it instead of assuming it:

```bash
git log --oneline -20
```

Check for a release or lint config that sets the allowed types (a semantic-release config,
a commitlint config, a CONTRIBUTING file). If one exists, its list is the only list. A type
outside it breaks the release, and you may not make one up.

❌ `feat: stuff` (type guessed, scope omitted, says nothing)
✅ `fix(auth): reject tokens whose issuer no longer matches the tenant`

The body says **why**, not what. The diff already says what changed. It cannot say what the
alternative was or which bug this closes.

**No attribution lines, ever.** No `Co-Authored-By`, no "Generated with" footer. This holds
even when the tool you run in adds one by default, and even when recent commits carry one.

### 4. Capture agent-context changes in the body

Agent-steering files are the rules file at the project root and anything under the
agent-config directory (skills, commands, hooks, docs, rules). If this commit touches any,
add a `Context:` section to the body:

```
feat(session): retry when the worker subprocess dies mid-run

Exponential backoff on crash. Previously one crash failed the whole run.

Context:
- Added a retry convention to the rules file
- Added a skill for inspecting session state
- Surfaced issue: module mocks in the retry tests need an isolated batch

Fixes #482
```

**Why this matters:** the git log is the project's long-term memory, and agent files change
faster than code. A context change with no note cannot be traced to the problem that caused
it. The next person then deletes the rule that was protecting them.

### 5. Report

Verify with `git log -1 --oneline` and `git show --stat`. Then report:

- the hash
- the full message, in a code block
- the files committed
- the insertion and deletion counts

## Notes

- If there is nothing to commit, say so plainly. Do not invent a change.
- A failing pre-commit hook is a result, not an obstacle. Report its output and fix the
  cause. Do not use `--no-verify` unless you are told to.
