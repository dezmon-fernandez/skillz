# Eval ledger: what recurs, what was tried, what works

Read this before choosing a round's changes. Update it after each round's blind judge, never from a
build's own review.

## Rules

- **Test cases.** A problem gets a pinned test case only when it shows up in three rounds. Fewer
  sightings make a ledger row, not a test. Sightings count per round, not per arm: two arms built
  from the same plan are one sighting. When unsure whether two sightings are the same problem, they
  are not.
- **Sightings.** A code sighting counts only when the blind judge or a rerun confirms it. A planning
  sighting counts from the plan or the transcript, what the session did, never from its summary of
  itself.
- **Changes.** Every change names, before it is made, the number it should move, where that number
  is read, and its value today. A change that can't name one is not made.

## Rounds

A round is one story built with these skills. Iterations 2 and 3 both ran Story B, so they count as
one.

- **Stories:** A (iteration-1), B (iterations 2 and 3), C, D, E, F.
- **F's arms:** piv, v2 (`main`'s loop then), v3 (`v2-next`, since merged as the v2 loop). The judge
  ranked v3, v2, piv.
- **Also in:** sightings the strict count leaves out, the developer's call whether they count. FT:
  the 2026-10-12 Polymarket feature test. WA: the workflow audit's earlier stories.

| Key | Path |
|---|---|
| GP | `/Users/dezmonf/projects/dev-kit/skillz/evals/generate-plan-v2-workspace` |
| E | `GP/real-work-2026-10-29-story-e` |
| F | `GP/real-work-2026-10-31-story-f` |
| SE | `/Users/dezmonf/projects/sports-edge/sports-edge-service/.agents` |
| WA | `/Users/dezmonf/projects/sports-edge/sports-edge-terminal/.agents/reference/workflow-audit` |

## Problems

"Today" is the latest round's value: F's unless it says E. "—" means not counted that round.

| # | Problem | Stories | Also in | Test case? | Number | Today | Fix tried (kind) · held? |
|---|---|---|---|---|---|---|---|
| 1 | The planner departs from a decision the request or a linked document made, without asking | E, F | FT, FT-S | no (2) | builds that break a definition the input set, without the developer's say | 1 of 3 (piv) | `304ceca` (field: Settled quoted, a departure goes under Decide) · held for v3 in F |
| 2 | A review passes a criterion because a test named for it passed, though the design is wrong | E, F | FT | no (2) | criteria a review ticks that the judge finds broken | 2 of 3 (v2, piv: rest) | none |
| 3 | Auto-accepting the recommendations cuts required scope, or adds scope | A, E, F | WA, FT-S | **yes (3)** | required parts dropped, and scope added, per build | piv added pace and per-100 before any research; v2's walk cut the board's opponent link | `c0264e5` (prose) · **no**, back in E. `304ceca` (step: walk opt in) · held for v3 in F |
| 4 | One bad item fails the whole batch, read or run | B, C, D, E | WA | **yes (4)** | builds where one bad item fails more than itself | 0 of 3 | `5a8d848` (prose) · **no**, back in E. Named in F's roadmap · held, 3 of 3 |
| 5 | Games scheduled but never played are counted as played, missing, or in a calculation | B, D, E, F | WA ×2 | **yes (4)** | builds that count an unplayed game | 2 of 3 (v2, piv) | none in the skills. Named in F's roadmap · v3 held, v2 and piv did not |
| 6 | An input that lands late is never retried, so data lands a cycle late | D, E | WA | no (2) | builds that serve a day late when the input is late | — | none |
| 7 | A recommended option counts, labels or describes a wrong value instead of fixing it | B, E | WA ×2 | no (2) | recommended options taken that leave a wrong value wrong | — | none |
| 8 | A session reads a credential file, or writes outside its repo | A, C, D, E | FT | **yes (4)** | credential reads, and writes outside the worktree, per round | 0 and 0 | `2effeaf` (runner) · **no**, back in E. `731e800` (hook) and the runner's blocks · held in F. Hook gap: a command naming `.env.example` and `.env` together passes |
| 9 | A verdict trusted the builds' own reviews, and an independent check found it wrong | E | WA ×2 | no (1) | verdicts written before an independent check | 0 | the blind judge before any verdict (process) · held in F |
| 10 | Research needs a second round, because a first read held no case of what it checked | E | none | no (1) | minutes waiting on a second round | — | none |
| 11 | A load reads far more of a file into memory than it needs | E | none | no (1) | peak memory of a full load | — | none |
| 12 | A review ticks a criterion while its own finding says the behaviour is wrong | A, C, D | none | **yes (3)** | criteria ticked that the same review flags | — | none |
| 13 | A known bug is found and left in place | C, D | FT | no (2) | known bugs left in code the change touches | — | `5a8d848` (prose) · not confirmed in E or F |
| 14 | The build never saw real outside data | A, B, D | none | **yes (3)** | criteria built on data nobody measured | 0 | `1f0118b`, `ce52b12` (step: sample the data) · held in E and F |
| 15 | Tests read the real clock | B, C, D | none | **yes (3)** | tests that read the clock | — | none |
| 16 | A guard no test can fail | A, B, D | none | **yes (3)** | guards that survive their line being broken | — | `eeeacef` (step: break each guarded line) · held in E |
| 17 | The plan is too long for the developer to read | C, D | FT | no (2) | words per plan | piv 6,483 · v2 7,061 · v3 10,948, found readable | none |
| 18 | A build decides something happened from data being absent, instead of a fact the source records | E, F | none | no (2) | builds with a judge-found bug of this kind | 2 of 3 (v2, piv) | none. Related to 5 |
| 19 | Research answers how a source changes over time from one snapshot | F | none | no (1) | research claims about a source's history the judge refutes | 1 (v2) | none |

**The pattern so far:** prose fixes (`5a8d848`, `c0264e5`) failed to hold. Step fixes (`eeeacef`,
`1f0118b`, `304ceca`) held. The runner fix `2effeaf` failed until the runner blocked the reads. A
requirement the roadmap names holds in every build (row 4 in F); left to the planner, it recurs
(rows 5 and 18).

## Evidence

- **1:** `E/v2next/03-plan-research.jsonl:938`, `:1821`; `E/judge/report.md:76`.
  `WA/feature-test/polymarket-plan-review-old-decisions.md:31`. `WA/feature-test-ledger.md:617-621`.
  F: piv's plan, `nba-story-f-opponent-defense.md:829` ("Rejected: `status == "final"` for rest"),
  decided without asking; v3 asked, `F/v3/03-plan-research.jsonl:1193` (Decide 4).
- **2:** `E/reviews/2-code-review-v2next.md:36`.
  `WA/feature-test/builds/polymarket-new/docs/code-reviews--polymarket-price-history.md:69`.
  F: `F/v2/08-review.jsonl:439`, `F/piv/08-review.jsonl:470`, against `F/judge/report.md:15-17`.
- **3:** `E/judge/report.md:83`, `:104`. `GP/iteration-1/harness/v1-run-results/turn-2.json:1`.
  `WA/reviews-service.md:1566-1567`. `WA/feature-test-ledger.md:391`.
  F: `F/judge/report.md:61`; `F/piv/02-plan.jsonl:69` (recommends 1B); `F/v2/06-walk-answers.jsonl:131`.
- **4:** `E/judge/report.md:78-79`. `GP/iteration-2/harness/results/v2/execute.reply.md:20`.
  `GP/real-work-2026-10-28/comments.md:63-64`.
  `GP/real-work-2026-10-29/compare/4-code-reviews/v1/outputs/nba-live-games.md:88`.
  `WA/reviews-service.md:1498`. F (held): `F/judge/report.md:27-33`.
- **5:** `E/judge/report.md:98`. `GP/iteration-2/harness/results/v1/turn-3.reply.md:38`.
  `GP/iteration-3/compare/6-code-reviews/new_skill/outputs/code-review.md:90`.
  `GP/real-work-2026-10-29/comments.md:124-125`. `WA/reviews-service.md:859`. `WA/plan-gate.md:934`.
  F: `F/judge/report.md:15-16`.
- **6:** `E/judge/report.md:77`. `SE/code-reviews/nba-live-games.md:89`. `WA/plan-gate.md:506`.
- **7:** `E/reviews/4-code-review-armB-no-walk.md:86-96`.
  `GP/iteration-2/harness/results/v1/turn-3.reply.md:39`, `review-code.reply.md:68-72`.
  `WA/reviews-terminal.md:817`, `:826`. `WA/reviews-service.md:1497`.
- **8:** `E/results.md:36-38`.
  `GP/real-work-2026-10-28/story-a-b-records/execution-reports/nba-prop-recorder-report.md:182`.
  `GP/real-work-2026-10-28/v1/02-plan.jsonl:89`. `GP/real-work-2026-10-29/comments.md:298-301`.
  `WA/feature-test-ledger.md:336-337`. F hook gap: `F/v3/07-build.jsonl:11`.
- **9:** `E/now.md:20` against `E/judge/report.md`. `WA/reviews-service.md:1490`. `WA/paper-trail.md:174`.
- **10:** `E/comments.md:155`.
- **11:** `E/judge/report.md:105`.
- **12:** `GP/iteration-1/compare/7-code-reviews/old_skill/outputs/code-review.md:28` against `:89`.
  `GP/real-work-2026-10-28/plans-story-c/3-code-review/v1/outputs/review.md:40` against `:81`.
  `SE/code-reviews/nba-live-games.md:42` against `:89`.
- **13:** `GP/real-work-2026-10-28/comments.md:10-13`. `GP/real-work-2026-10-29/comments.md:146-147`.
  `WA/feature-test-ledger.md:331`.
- **14:** iteration-1 v1 `report.md:75`. iteration-2 v1 `report.md:3`. `SE/code-reviews/nba-live-games.md:61`.
- **15:** iteration-2 v2 `code-review.md:55`. iteration-3 `code-review.md:65`.
  `SE/plan-reviews/nba-prop-board-prices.md:32`.
  `GP/real-work-2026-10-29/compare/3-build-reports/v2/outputs/nba-live-games-report.md:116`.
- **16:** iteration-1 v1 `code-review.md:65`. iteration-2 v2 `code-review.md:43`.
  `GP/real-work-2026-10-29/comments.md:356-363`.
- **17:** `GP/real-work-2026-10-28/comments.md:38-40`. `GP/real-work-2026-10-29/comments.md:233-237`.
  `WA/feature-test-ledger.md:51`.
- **18:** `E/judge/report.md:69`. F: `F/judge/report.md:15-18`.
- **19:** `F/judge/report.md:67`.

## What works: keep

| Practice | Evidence |
|---|---|
| A blind judge before any verdict, driving real cases | E's judge found what all five reviews missed. F's judge broke the rest fix two reviews passed (`F/judge/report.md:15-17`) |
| Measuring real data at full scale | E: 89 of 1,950 lines corrected after publish. D: 454 players checked found a name bug (`GP/real-work-2026-10-29/comments.md:146-147`) |
| Measuring the source's earlier copies, not only today's file | F: v3 found 20 of 20 "if necessary" rows listed, then dropped (`F/judge/report.md:67`) |
| Recording the fact the source gives, not inferring from missing data | F: v3 alone had none of bugs 1 to 4 (`F/judge/report.md:15-18`) |
| A figure that skips data says how many it skipped | F: v3's `games_left_out` |
| One-line agent briefs (the plan's path and one item) | E: research cost $10.01 against $16.24 and $16.61, in the same time |
| Breaking the line each test guards | D: v2 caught 98% of breaks against v1's 89% (`GP/real-work-2026-10-29/comments.md:383-388`) |
| Blocking in the runner, not writing a rule in the handover | `/Users/dezmonf/projects/dev-kit/skillz/.agents/graduation.md:119` |
| Asking before a keyed or paid read | iteration-3 `turn-2.md:13`; D `GP/real-work-2026-10-29/comments.md:97-101` |
| Code review in a fresh session | E's judge credits review fixes in v3, piv and arm B (`E/judge/report.md:107-111`) |

## Running the round: fix before the next one

| What happened | Cost | Fix |
|---|---|---|
| The coordinator asked a question while two arms could proceed | F: 2 h 15 min idle | Start every step that doesn't depend on the answer first |
| Step costs are the session's running total, not the step's | F: totals overstated until caught | A step's cost is its total minus the previous step's |
| `checks.sh` check 1 misses a quote that wraps | F: v3 counted 0, 8 by hand | Read the whole Settled block |
