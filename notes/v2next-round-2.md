# v2-next, round 2: what to fix

Story E, 2026-10-29 to 30: five arms planned, built and reviewed the same story from the same
commit, taking every recommendation. A blind judge ranked v3 first and v2-next last. Evidence is
in `evals/generate-plan-v2-workspace/real-work-2026-10-29-story-e/`: `judge/report.md`, `now.md`,
`reviews/`, `v2next/`.

Next round: v1 is the original piv loop, v2 is v3 (now on main), v3 is v2-next with these fixes.

## Fixes

Decided 2026-10-31: fix 1 went in as `Settled` quoted with its source line, and a design that
differs from it goes under Decide. The walk became the developer's opt-in review, with no
reviewer agent. Fixes 2 to 8 are out: each moved too little to measure, or only restated a rule
the skill already had.

1. **A departure from the roadmap goes under Decide, with the roadmap's line quoted.** The
   roadmap said rest is "days since the team's previous game ... from the schedule". The scout
   flagged it and named the line. The planner wrote "`rest_days` is the player's own gap;
   rejected the team's gap" under Shown, not Decide, so the developer never saw the conflict.
   The build served wrong rest every morning until last night's lines landed. v2 and v3 followed
   the roadmap and have no such bug. `v2next/03-plan-research.jsonl` lines 938 (scout) and 1821
   (the Shown list).
2. **Bring back one code researcher per area, or bound the main thread's own reading.** The
   research step took 26.3 min against v3's 27.8 and v2's 28.5: the main thread's reading took
   back what the parallel agents saved. Its cost, $10.01 against $16.61 and $16.24, is the part
   worth keeping.
3. **Each experiment names its fallback at step 1.** E5 was a second round of experiments and
   cost 10 minutes.
4. **`code-reviewer-v2` recreates the edge states a criterion names and reads the real output.**
   It ticked rest because a test named for it passed; the test held the wrong design. The
   original's reviewer recreated the morning state (last night's game stored, its lines not in)
   and caught the same bug in its own build. v2's reviewer traced the late-file path and said keep
   it; the judge found lines a day late. `reviews/2-code-review-v2next.md:36`,
   `reviews/3-code-review-original.md:30-40`, `reviews/6-code-review-v2.md:102-109`.
5. **A review's recommended option is the one that fixes the wrong value.** Arm B's review offered
   null rest as option 2 and recommended option 1, a count; taking it left rest wrong.
   `reviews/4-code-review-armB-no-walk.md:86-96`.
6. **`deny-credential-reads` misses `.env*` and `*.env` searches.** The original's build confirmed
   `*.env` by running it.
7. **The plan template drops the roadmap's walkthrough rule.** Only the original honoured it.
8. **Levers not yet tried:** the thinking level; break only the lines that guard a rule; write the
   walk's result as the original's short walkthrough; put each task's spec under the task.

## Where the time goes

Story E, re-timed from the session transcripts on 2026-10-31. Minutes; planning includes the walk.

| Arm | Planning | Build | Review | Total |
|---|---|---|---|---|
| original (piv) | 28.7 | 35.9 | 26.0 | 90.6 |
| v2 | 57.2 | 62.4 | 32.9 | 152.5 |
| v3 | 59.2 | 51.4 | 32.5 | 143.1 |
| v2-next | 65.5 | 51.6 | 34.7 | 151.8 |

- **Planning is still where the time goes:** 29 to 37 min more than the original, against 15 to
  26 more for the build.
- **Research takes 26 to 28 min in every layout tried.** Main-thread thinking (16 to 19 min) and
  the slowest agent set it.
  - v2-next's one-line briefs cut research cost from $16.61 to $10.01, but saved only about 1.5
    min. The main thread's own reading (6.2 min) and the second round (3.8 min) took back the
    rest.
  - Fix 2 would move time between the main thread and agents, not cut it.
- **The walk is its own 26.5 min.** Build and review took the same time with it (86.3 min) and
  without it (arm B, 87.0). The judge credits it with one catch, memory. It counts the dropped
  repair lane and the scope creep against it.
- **Every step ran Opus 5.5 at `xhigh`,** with thinking on and fast mode off
  (`sdk_opt_in_required`). The plan reviewer ran Opus at `xhigh`, and the research agents ran
  Sonnet 5.5 at `high`. Each session transcript records it on every turn (`perTurnEffort`); the
  step's stream does not.

## Next experiment: execution at Opus 5.5 medium

- **Why:** a build is mostly model time (v2-next's: 31 of 52 min writing and thinking), working
  from a plan that is already settled. Medium is Opus 5.5's default, and Anthropic's effort guide
  starts well-specified agentic coding at medium.
- **How:** every runner pins effort per model with `--settings`, never `--effort`: Opus 5.5
  `xhigh` and Sonnet 5.5 `high` for planning and review, as Story E ran, and Opus 5.5 `medium`
  for the build. So the arms still differ only in the planner. Tested on 2026-10-31:
  - `--effort xhigh` alone pushes every agent to `xhigh`, so a Sonnet agent ran `xhigh`.
  - Per-model `--settings` gives each model its own level; the Sonnet agent ran `medium`.
  - An agent's own `effort` field beats both.
  Check each step's transcript (`perTurnEffort`) to confirm the level.
- **Judged on:** what the blind judge and the review find. Story F is a different story from
  Story E, so its build times show what medium costs, not what it saved.
- **What it saved, after Story F:** rebuild one Story E plan at medium. Its `xhigh` build and the
  judge's expected figures are already saved, so effort is the only difference.

## Known, left as is

- The walk proposed dropping Story E's required repair lane, and "take all reccs" took it. The
  cost test in `plan-reviewer-v2.md:123` beat its own "never question how much the plan sets out
  to build". The developer, verbatim: "no leave that". The daily re-read recovers a missed game
  the next day.
- One run per arm. The middle four could swap on a rerun: with the same plan, arm B's review
  caught the bad game-id cell that fails the whole load, and v2-next's did not.

The eval ledger, `notes/eval-ledger.md`, now holds what recurs across rounds and what held; read it before choosing the next round's changes.
