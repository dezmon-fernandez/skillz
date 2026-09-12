# Rules for this repo

The README says what exists and how to install it. This file says how it must be built.
Everything in `skills/` and `hooks/` is a base that gets copied into other repos, so the
bar is: would this hold up, unchanged, in a project you have never seen?

## Skills

**One skill, one job.** The description names the job and quotes the phrases that should
trigger it ("do a handover", "hand this off"). If you cannot write that sentence, it is
two skills or none.

**Frontmatter is the contract.** `name` matches the directory. `description` is the only
thing the model reads before deciding to load the skill, so it carries the trigger and the
scope, not the procedure. Use `disable-model-invocation: true` for anything that writes
outside the repo or spends money; the operator invokes those by hand.

**Write for a reader with no memory.** The skill runs in a fresh session with no idea
what the author knew. Say what the output is, who consumes it, and what happens if it is
wrong. Give the rule, then show it applied: the ❌/✅ pair pattern in `handover` is the
house style.

**Short.** A page, two at most. A long skill is skimmed, and a skimmed skill is the same as
no skill. Cut any section that has nothing real in it. Supporting files hold the long
reference material, and the SKILL.md points at them.

**No project nouns.** No package manager, framework, path, or domain term from any one
repo. If a rule only makes sense conditionally ("if this is a Python project…"), it is
project-specific and belongs in that repo's copy, not here. `sync-skills` enforces this
on the way back in; write it that way on the way out.

**Verbatim beats paraphrase.** Where a skill quotes the operator, prints a banner, or
carries a constraint into a file, mark it verbatim and keep it verbatim.

**Every `!` command must be safe to fail.** Injected shell runs before the model sees
anything. Guard it (`2>/dev/null || echo "(none)"`) so a missing file reads as a fact,
not an error.

## Hooks

Skills say what the model should do. Hooks make the harness do it whether the model
remembers or not. Reach for a hook when the rule must hold every time: a file that must
never be committed, a check that must run after every edit, context that must load at
session start.

**Two homes, one standard.**

- Skill-scoped: declared under `hooks:` in the SKILL.md frontmatter. Registered when the
  skill is invoked, gone when it ends. Use for behavior that only makes sense while that
  skill is active. `once: true` for one-shot setup.
- Standalone: `hooks/<name>/` holding the script and a `hooks.json` fragment that installs
  it. These get pasted into a project's `.claude/settings.json`. Use for rules that hold
  across a whole project regardless of skill.

**Script contract.** JSON on stdin, parsed with `jq`. Exit 0 with no output means "no
opinion". Exit 2 blocks, and stderr says why in one line the model can act on. Any other
exit is a non-blocking error and must not be used to signal a decision. Decisions go in
JSON on stdout (`permissionDecision`, `additionalContext`), never in prose.

**Paths are `${CLAUDE_PROJECT_DIR}`-relative.** Never a hardcoded absolute path, never
`$HOME`. The same script has to run in every target repo.

**Idempotent and fast.** Hooks fire on every matching event, including resumes and
retries. Running twice must equal running once. Anything slower than a second gets
`async: true` or a tighter matcher, and every hook sets an explicit `timeout`.

**Fail open unless the hook exists to block.** A missing `jq`, an unreadable file, an
unexpected event shape: exit 0 and stay silent. Only a hook whose whole purpose is to
deny may exit 2 on uncertainty, and then the reason says it was uncertainty.

**Narrow matchers.** `Edit|Write` over `.*`. A hook that fires on everything is a tax on
every tool call in every repo that installs it.

## Pairing a skill with a hook

A hook belongs to a skill when the skill's procedure has a step that says "always" or
"never". Move that step into a hook, then have the skill state that the hook exists and
what it enforces, so a session that finds the hook firing knows why. The skill must still
work with the hook absent; the hook only tightens it.

## Before committing

- Read the changed SKILL.md as if you had never seen this repo. Anything you would need
  to ask about is a missing sentence.
- Run every hook script by hand with a fabricated stdin payload for each exit path: no
  opinion, block, and internal error. Print the exit code.
- Grep the diff for project nouns.
- New skill or hook: add its row to the README table. The README is the inventory; this
  file is not.
- Commit messages describe the rule that changed, not the file.
