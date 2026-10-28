---
name: eval-skill
disable-model-invocation: true
description: >-
  Test a change to a skill, with the developer as the judge. Two ways: set up worktrees so
  the developer tries the new version on real work, or run the old and new versions on the
  same pinned request and put the results side by side on one page. Either way, the
  developer comments on the output, and their comments decide what the skill changes next.
  Use when asked to "eval this skill", "test this skill change", "try the new version",
  "compare the old and new version", "is the new version better", or "read my comments".
argument-hint: "[skill name, and the request or session to test it with]"
---

# eval-skill: test a skill change, with the developer as the judge

## Skill: $ARGUMENTS

A skill change is better only if the developer, reading what it produced on a real task,
says so. This skill sets up the test and puts the results in front of them. The developer
decides the test case, the checks, and whether each result passes. They judge by commenting
on the output. A wrong test leads them to keep a worse version or drop a better one. Every
check and grade you produce is a suggestion until they confirm it.

**Dependencies.**

- Required: `claude` (the CLI, 2.1.257 or later), git, and `jq`. Comparing also needs a
  machine where Claude Code's sandbox runs. If any is missing, stop and say so.
- Never compare without the sandbox. A run that can read other folders can find an earlier
  answer, and its content checks then measure that answer.
- Optional: `skill-creator`. When installed, use its test-case folder format, its grader
  instructions (`agents/grader.md`), and its benchmark script. Without it, use the folder
  shapes below, brief each grader yourself to grade every judgment check pass or fail with
  a quote, and count the passes per version and per run.
- Optional: the `annotate` skill. When installed, the developer comments in it.

## Two ways to test

- **Try it on real work.** The developer uses the new version on a task they need done, in
  worktrees beside their main checkout, and judges it as they go. This is the strongest
  evidence. Start here unless the developer asks for a comparison.
- **Compare old and new.** Both versions run on the same pinned request, and the results go
  side by side. Use it to check a change, or to find out whether a session the developer
  judged was luck. Each run is a full session that spends the account's usage: it counts
  against a subscription's limits, or is billed to an API key. Say how many runs you will
  start, and get the developer's yes first.

A real-work session the developer judged becomes the test case for the comparison.

## Try it on real work

1. For each repo the task touches, make a worktree on its own branch beside the main
   checkout: `git worktree add ../<repo>-<label> -b try-<label> main`. The main checkout
   stays as it is.
2. Copy the version under test into the worktree's `.claude/skills/` and `.claude/agents/`,
   uncommitted, under names that sit beside the current version (such as a `-v2` suffix), so
   the developer can run either one.
3. Install dependencies from the lockfile only. Never copy a file holding keys, such as
   `.env`. Give the developer the command to copy it instead.
4. Before anything starts from a worktree, check how the repo starts its services. A service
   started there can claim the main checkout's ports, or start with empty data. Tell the
   developer which to run from where.
5. A relative path between sibling repos resolves to the main checkouts, not to their
   worktrees. Name any such path the developer will meet.
6. Give the developer each folder, its branch, and the command that opens a session there.
7. When they are done, find the session's transcript in `~/.claude/projects/` by the
   worktree's path. Read what the session wrote, not a summary, and put it on a page for
   their comments (see Judge by comment). Remove a worktree or its branch only on their word.

## Compare old and new

### 1. Build the test case with the developer

- **The request:** the developer's own words, from a real session where one exists. Copy
  them from the session's transcript, never retype them. Cut only what is not part of the
  request, and show what you cut.
  - ❌ A prompt written for the test: `Plan the export feature. Treat the scope as agreed.`
  - ✅ The developer's words exactly as they typed them, typos included.
- **The repo state:** the repo and commit the request was made against. Check that nothing
  in the repo already holds the answer, such as a document that specifies the feature. A
  test that hands over the answer measures nothing.
- **What the run can still reach:** the sandbox shuts out every user's folders, but not the
  live web through WebFetch and WebSearch, the hosts the case lets shell commands reach, or
  files outside users' folders. These cannot be pinned, only watched. Write them down.
- Show the developer all three and wait for their yes.
- Once one case works, add a case where the skill must not act, such as a request it should
  decline or answer briefly, also in the developer's words. With only cases where it acts,
  a skill that always acts passes.

### 2. Propose the checks; the developer decides

- Each check is one plain statement about the output that a person can verify.
- Split them: **shape** checks for what the change is meant to change, and **content**
  checks for what must not get worse.
- A content check names the content, never the new version's headings. Tied to a heading,
  the old version can never pass it, whatever it found.
- Mark each check as one a script can decide, or one that needs judgment.
- **Behavior checks are scripts** over the run's record: the agents it started, the tools
  it called, what it asked, the files it wrote. Never give a grader the record: on a long run
  it sees only part. Write each as a range or an outcome, never an exact list of steps. The
  same request takes different valid paths.
  - ❌ `The run makes exactly 9 tool calls, in this order.`
  - ✅ `The run starts one scout agent and no other research agent.`
- **Prose checks that are a list or a number are scripts**: banned words, lines per section,
  text copied word for word. A grader decides only what no list catches, such as a new
  metaphor.
- Start with a few checks. Each later round adds one check per kind of failure the
  developer's comments name.
- The developer keeps, rewrites, or drops each check. Never change a check after seeing
  results to make a run pass. A flawed check gets a new version, with the developer's yes,
  for the next round.

### 3. Run both versions the same way

- `scripts/run-version.sh` does one run, in a fresh copy of the repo: the pinned commit and
  its history, nothing later, with the version under test in its `.claude/`. The old
  version comes from a git ref, the new one from the working tree. The copy is removed when
  the run ends. `DRY_RUN=1` checks the setup without a session.
- The run is sandboxed. Its file tools and shell commands, and its agents', can read the
  copy and nothing else in any user's folders. If the sandbox cannot start, the run stops.
  Never run without it.
- The prompt is the request, word for word. Add nothing: an instruction added for the test
  changes what is tested.
- Run old and new at the same time. One run of each shows the shape of the difference.
  Run three of each before calling a difference real.

### 4. Check each run before grading it

- Read the paths the run named outside its copy (`outside-reads.txt`), the tool calls Claude
  Code refused (`denials.json`), and the commands the sandbox blocked as they ran
  (`sandbox-blocks.txt`). A blocked read of an earlier answer shows the run went looking
  for one. A read that got through means the sandbox leaked: mark the run, and its content
  checks do not count.
- Compare cost, not tokens. The token count covers only the main session. The cost is the
  work priced at API rates, even on a subscription: a measure of size, not a charge.

### 5. Grade, then hand it to the judge

- Score the checks a script can decide with a script.
- Send each run's outputs to its own grader agent, unlabeled, so it cannot tell which
  version it is reading. It grades each judgment check with a quote, and says which checks
  are weak.
- Run graders on a different model from the one that ran the skill. A grader rates its own
  model's writing higher.
- A check whose grader disagreed with the developer gets a grader of its own next round.
- A check that locks a behavior in passes only when every run passes it. Show each check
  run by run, never as an average. A behavior that holds in 2 runs of 3 is not locked.
- Put the results on a results page, never as a wall of terminal text: the score per
  version, each check for every run, and the main difference side by side. The comments
  happen on a second page, below.

## Judge by comment

Both ways of testing end here.

1. **Where they comment.**
   - With the `annotate` skill installed, open the outputs in it: the iteration folder, or
     the files a real-work session wrote. Its Send hands back every comment at once.
   - Without it, publish one page: each output, word for word, in its own tab, the skill's
     diff in another, and a comment button on every section. Use the page's built-in
     comments so they can all be read back in one call. Do not build a comment store into
     the page.
   - When neither `annotate` nor a published page is available, write each output to a file
     with numbered sections. The developer writes notes against the numbers in the terminal,
     and each proposed edit is shown as its exact before and after text.
2. **The developer comments**, as much as they want, in their own words. Wait until they say
   they are done. Do not act on a comment as it lands: the next one may change it.
3. **Read every comment at once and show each proposed edit in view, never only described.**
   Make each edit in the file it changes, uncommitted: the skill, a check, or the test case.
   Open those files in `annotate` with `--base HEAD`, so changed lines are highlighted and
   removed lines show where they were cut. Reply with one line per comment: its words and
   where its edit is. A comment you cannot turn into one edit goes back as a question, not
   a guess. Group comments that name the same kind of failure, and propose one check for
   each kind.
4. **The developer's Send is the decision.** No comment on a change approves it. A comment
   changes it or drops it. Revert every rejected edit from git. Nothing is committed
   without their yes.
5. **Record** each comment, its decision, and what the next round changes, in that round's
   `comments.md` (see Where things live).

- ❌ `Comment 3: story C is too long. I'd add a five-line limit. Approve?`
- ✅ The sentence is in the skill file, uncommitted, open in `annotate` against the last
  commit, highlighted, with `3. "this story is too long" (story C): SKILL.md line 84`.

## Where things live

Keep cases and results outside the skill's directory, which is copied into other repos.
Put them in `evals/` at the repo root. Keep `evals/` out of git when the repo is public: a
case names private paths.

```
evals/
  cases/<case>/        prompt.md, case.yaml, graders/, case.env, README.md
  <skill>-workspace/iteration-<N>/
    comments.md        each comment, its decision, and what the next round changes
    <case>/<old_skill | with_skill>/run-<n>/
                       outputs/, prompt.txt, version.txt, run.json, timing.json,
                       grading.json, sandbox.json, denials.json, sandbox-blocks.txt,
                       outside-reads.txt, transcript.jsonl, subagents/
  <skill>-workspace/real-work-<date>/
    comments.md        the same, for a session on real work
```

- `prompt.md`: the request, word for word.
- `case.yaml`: the case's name and what a good result looks like.
- `graders/`: one file per check, holding its type (`script` or `llm`) and its sentence.
- `README.md`: where the request came from, and what a run can still reach.
- `case.env`: the repo, the commit, what a run installs and may use, and the hosts its
  shell commands may reach. The script's header gives its fields.

## Report

- Trying it on real work: each worktree's folder, branch, and the command to start.
- Comparing: the results page's link, the comment page's address, the score per version,
  and the decisions still open for the developer.
- After the comments: the list of entries, each to approve or reject.
