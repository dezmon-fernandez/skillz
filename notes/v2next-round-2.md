# v2-next, round 2: what to fix

Story E, 2026-10-29 to 30: five arms planned, built and reviewed the same story from the same
commit, taking every recommendation. A blind judge ranked v3 first and v2-next last. Evidence is
in `evals/generate-plan-v2-workspace/real-work-2026-10-29-story-e/`: `judge/report.md`, `now.md`,
`reviews/`, `v2next/`.

Next round: v1 is the original piv loop, v2 is v3 (now on main), v3 is v2-next with these fixes.

## Fixes

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

## Known, left as is

- The walk proposed dropping Story E's required repair lane, and "take all reccs" took it. The
  cost test in `plan-reviewer-v2.md:123` beat its own "never question how much the plan sets out
  to build". The developer, verbatim: "no leave that". The daily re-read recovers a missed game
  the next day.
- One run per arm. The middle four could swap on a rerun: with the same plan, arm B's review
  caught the bad game-id cell that fails the whole load, and v2-next's did not.
