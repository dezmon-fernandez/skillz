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

- **Stories:** A (iteration-1), B (iterations 2 and 3), C, D, E, F, G (Story A of the terminal's
  NBA roadmap, the first UI round).
- **F's arms:** piv, v2 (`main`'s loop then), v3 (`v2-next`, since merged as the v2 loop). The judge
  ranked v3, v2, piv.
- **G's arms:** piv, v2 (`main`'s loop, F's v3), mine (the terminal's own generate-plan loop with the
  developer's uncommitted edits). The judge ranked v2, mine, piv, and said mine wins if "built on
  the pattern, never invented" is a requirement (`G/judge/report.md:102`). The developer, on
  glass: "Mine is the only one that fucking got it."
- **Also in:** sightings the strict count leaves out, the developer's call whether they count. FT:
  the 2026-10-12 Polymarket feature test. WA: the workflow audit's earlier stories.

| Key | Path |
|---|---|
| GP | `/Users/dezmonf/projects/dev-kit/skillz/evals/generate-plan-v2-workspace` |
| E | `GP/real-work-2026-10-29-story-e` |
| F | `GP/real-work-2026-10-31-story-f` |
| G | `GP/real-work-2026-10-31-story-a` |
| H | `GP/real-work-2026-10-31-story-b` |
| I | `GP/real-work-2026-11-02-story-c` |
| SE | `/Users/dezmonf/projects/sports-edge/sports-edge-service/.agents` |
| WA | `/Users/dezmonf/projects/sports-edge/sports-edge-terminal/.agents/reference/workflow-audit` |

## Problems

"Today" is the latest round's value: F's unless it says E or G. "—" means not counted that round.

| # | Problem | Stories | Also in | Test case? | Number | Today | Fix tried (kind) · held? |
|---|---|---|---|---|---|---|---|
| 1 | The planner departs from a decision the request or a linked document made, without asking | E, F, G | FT, FT-S | **yes (3)** | builds that break a definition the input set, without the developer's say | G: 1 of 3 (v2) | `304ceca` (field: Settled quoted, a departure goes under Decide) · held for v3 in F, **not in G**: v2 quoted the Settled line and departed from it. `2bd6d16` (step 3 laid out as labeled parts) · held in G's rerun v2b, which put the layout under Decide, sketched |
| 2 | A review passes a criterion because a test named for it passed, though the design is wrong | E, F | FT | no (2) | criteria a review ticks that the judge finds broken | 2 of 3 (v2, piv: rest) | none |
| 3 | Auto-accepting the recommendations cuts required scope, or adds scope | A, E, F, G | WA, FT-S | **yes (4)** | required parts dropped, and scope added, per build | G: v2 added an AGENTS.md rule and a lint plugin from its review's recommendation | `c0264e5` (prose) · **no**, back in E. `304ceca` (step: walk opt in) · held for v3 in F |
| 4 | One bad item fails the whole batch, read or run | B, C, D, E | WA | **yes (4)** | builds where one bad item fails more than itself | 0 of 3 | `5a8d848` (prose) · **no**, back in E. Named in F's roadmap · held, 3 of 3 |
| 5 | Games scheduled but never played are counted as played, missing, or in a calculation | B, D, E, F | WA ×2 | **yes (4)** | builds that count an unplayed game | 2 of 3 (v2, piv) | none in the skills. Named in F's roadmap · v3 held, v2 and piv did not |
| 6 | An input that lands late is never retried, so data lands a cycle late | D, E | WA | no (2) | builds that serve a day late when the input is late | — | none |
| 7 | A recommended option counts, labels or describes a wrong value instead of fixing it | B, E | WA ×2 | no (2) | recommended options taken that leave a wrong value wrong | — | none |
| 8 | A session reads a credential file, or writes outside its repo | A, C, D, E | FT | **yes (4)** | credential reads, and writes outside the worktree, per round | 0 and 0 | `2effeaf` (runner) · **no**, back in E. `731e800` (hook) and the runner's blocks · held in F. Hook gap: a command naming `.env.example` and `.env` together passes |
| 9 | A verdict trusted the builds' own reviews, and an independent check found it wrong | E | WA ×2 | no (1) | verdicts written before an independent check | 0 | the blind judge before any verdict (process) · held in F |
| 10 | Research needs a second round, because a first read held no case of what it checked | E | none | no (1) | minutes waiting on a second round | — | none |
| 11 | A load reads far more of a file into memory than it needs | E | none | no (1) | peak memory of a full load | — | none |
| 12 | A review ticks a criterion while its own finding says the behaviour is wrong | A, C, D | none | **yes (3)** | criteria ticked that the same review flags | — | none |
| 13 | A known bug is found and left in place | C, D, G | FT | **yes (3)** | known bugs left in code the change touches | G: 1 (v2: a failed re-read wipes the games, named by its review and kept) | `5a8d848` (prose) · not confirmed in E or F, **not in G** |
| 14 | The build never saw real outside data | A, B, D | none | **yes (3)** | criteria built on data nobody measured | 0 | `1f0118b`, `ce52b12` (step: sample the data) · held in E and F |
| 15 | Tests read the real clock | B, C, D | none | **yes (3)** | tests that read the clock | — | none |
| 16 | A guard no test can fail | A, B, D | none | **yes (3)** | guards that survive their line being broken | — | `eeeacef` (step: break each guarded line) · held in E |
| 17 | The plan is too long for the developer to read | C, D | FT | no (2) | words per plan | piv 6,483 · v2 7,061 · v3 10,948, found readable | none |
| 18 | A build decides something happened from data being absent, instead of a fact the source records | E, F | none | no (2) | builds with a judge-found bug of this kind | 2 of 3 (v2, piv) | none. Related to 5 |
| 19 | Research answers how a source changes over time from one snapshot | F | none | no (1) | research claims about a source's history the judge refutes | 1 (v2) | none |
| 20 | A scope line the planner marks `(assumed)` before reading any code stands, and research is kept off it | G | none | no (1) | `(assumed)` lines from before research that decide a user-facing behaviour in the final plan | G: 1 (v2: no stream, so live scores poll every 30 s beside a free stream). Related to 1 and 3 | `2bd6d16` (field: the scout's Integration Points; rule: use what already does the job) · v2b kept the stream through design, but its definition named it before research, so the rerun cannot credit the change |
| 21 | A build waits on an event in the world before it finishes | G | none | no (1) | minutes a build sits idle waiting | G: 39 (v2) | none |
| 22 | A value the source did not serve is drawn as zero or a guess | G, H | none | no (2) | builds with a judge-found zero or guess for an unserved value | H: 1 (piv: `#<id>` for an unnamed player, code only) | none. The roadmap named the rule. piv's fix in progress |
| 23 | An experiment measures far longer than its decision needs | G, H | none | no (2) | minutes an experiment runs past the reads that settle its question | H: about 20 (v2), two 10-minute waits to see whether a value changes, which no decision turned on | Uncommitted (deletion): "whether it can change or vanish" dropped from `generate-plan-v2`'s Assuming list and step 5. Candidate, not made: see the evidence |

**The pattern so far:** prose fixes (`5a8d848`, `c0264e5`) failed to hold. Step fixes (`eeeacef`,
`1f0118b`, `304ceca`) held. The runner fix `2effeaf` failed until the runner blocked the reads. A
requirement the roadmap names holds in every build (row 4 in F); left to the planner, it recurs
(rows 5 and 18).

## Evidence

- **1:** `E/v2next/03-plan-research.jsonl:938`, `:1821`; `E/judge/report.md:76`.
  `WA/feature-test/polymarket-plan-review-old-decisions.md:31`. `WA/feature-test-ledger.md:617-621`.
  F: piv's plan, `nba-story-f-opponent-defense.md:829` ("Rejected: `status == "final"` for rest"),
  decided without asking; v3 asked, `F/v3/03-plan-research.jsonl:1193` (Decide 4).
  G: v2 quoted "each is built on the pattern of its baseball or football counterpart, never
  invented" (`G/plans/v2-plan.md:199`) and wrote rows with "no rail or panes" as an "except"
  (`:135`), never under Decide. piv asked (`G/piv/02-plan.jsonl:1105`, Layout); mine asked with a
  sketch of each option (`G/mine/02-plan.jsonl:1653`, Decision 3).
- **2:** `E/reviews/2-code-review-v2next.md:36`.
  `WA/feature-test/builds/polymarket-new/docs/code-reviews--polymarket-price-history.md:69`.
  F: `F/v2/08-review.jsonl:439`, `F/piv/08-review.jsonl:470`, against `F/judge/report.md:15-17`.
- **3:** `E/judge/report.md:83`, `:104`. `GP/iteration-1/harness/v1-run-results/turn-2.json:1`.
  `WA/reviews-service.md:1566-1567`. `WA/feature-test-ledger.md:391`.
  F: `F/judge/report.md:61`; `F/piv/02-plan.jsonl:69` (recommends 1B); `F/v2/06-walk-answers.jsonl:131`.
  G: `G/v2/09-review-answers.jsonl:93` (`.biome/plugins/no-object-search-catch.grit` and the AGENTS.md
  line, after "take all reccs").
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
  `WA/feature-test-ledger.md:331`. G: v2's review, "a failed re-read replaces the rows until the
  next one" (`G/v2/08-review.jsonl:68`), recommended and taken; the judge forced it
  (`G/judge/report.md:24`).
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
- **20:** v2's step 1, written with no tool call, as `generate-plan-v2/SKILL.md:33` asks ("Before
  you open any code"): "Will not do: The live game-state routes or a stream… (assumed)"
  (`G/v2/02-plan.jsonl:85`). Approved whole with "approve lets go". The final plan keeps "A stream"
  under Will not do (`G/plans/v2-plan.md:171`) and tells its experiments "Do not open
  `/live/nba/game-state/stream`" (`:960`, `:981`). Neither v2's main thread nor its agents opened
  football's stream hook `use-nfl-game-state.ts`; piv's did 6 times, mine's 20. The scout works
  from the Definition's "what it will not do" (`agents/codebase-scout-agent-v2.md:20-24`): it
  globbed `nfl-slate/use-served-week/**`, where the stream hook sits, and read only the week read
  beside it, `use-nfl-week.ts`. Its review offered
  the stream as option 3, "reverses your 'no stream' decision" (`G/v2/08-review.jsonl:615`), a
  decision the developer never made. piv and mine stream, as football does.
- **20, judged:** v2 ran up to 30 s behind the engine at a 75-second sample; piv and mine matched
  it (`G/judge/report.md:87`).
- **1 and 20, the rerun:** v2b, from `main` with `2bd6d16`, stopped its design with "What shape
  should the page take before Story B has a pane to fill?", each option sketched, and a design
  built on the stream, quoting the Settled line it differs from (`G/v2b/03-plan-research.jsonl:1608`).
- **21:** `G/v2/07-build.jsonl:359`: "Still waiting on the 22:00Z tip-off" (idle 21:32:37 to
  22:11:39 UTC, after its gate was green).
- **22:** `G/judge/report.md:19`.
- **23:** v2b's E2, 00:20 to 00:43 UTC (`G/v2b/03-plan-research.jsonl:559`). Its season reads and
  stream captures took about 5 minutes. The rest was a watcher waiting for a game to go live, a
  6-minute `until … date ≥ 00:36` wait, and 48 reads of the credit counter (`:1023`, `:1160`)
  to show the stream spends nothing, which the contract states ("FREE: a connection is a
  subscription to what the runner already holds") and E1 had read in the engine's code. Five of
  the night's seven games were live throughout (its own reads at 00:29 and 00:36), so any one of
  them showed the stream pushing within seconds. The
  developer: "a 30 minute time test isnt warranted for wiring up an api stream with a contract",
  and "if it needs to expxlore unknowns yes but even then it likely can be done m ore efficitnely".
- **23, H:** v2's definition listed A11, "A prop can vanish between reads, or a line can move", from
  the skill's Assuming line "whether it can change or vanish". Its E3 re-asked A11 by reading the
  next day's props twice, "at least 10 minutes after the first, to diff" (E3 in the plan,
  `H/snapshots/v2-03-plan-research-files.tgz`), while
  that day held no quotes, so it diffed two empty reads; planning waited on it. Its last step
  waited 10 more minutes for a second read of the first posted quotes; nothing moved. The board
  draws what the engine serves, so no answer changed the code. Most of E1's 12-day sweep confirmed
  what the generated types state. The developer: "Do we not fucking trust our types? I literally
  own the fucking repo."
- **23, the fix to make (the developer: "a quick candidate to fix early"):**
  - Run an experiment only to learn something nobody has written down. If the code, an API spec,
    its types or the docs answer it, read the answer there.
  - Suggest experiments after the code and docs are read, never before. Before then everything
    looks unknown.
  - Put each one to the developer in one line: the question, what in the plan changes with the
    answer, why nothing written answers it, what it reads, how long and what it costs. It runs only
    on a yes. Nothing runs without asking, free or not.
  - The experiment agent stays, with one added line: never wait for something to change; measure
    what is there now.
  - Comes out of `generate-plan-v2`: measuring every assumption about outside data, the experiment
    list approved before any code is read, one experiment per assumption, and sending free
    experiments without asking.
  - Should move: H's 20 minutes of waiting to none; v2's research from 33 minutes toward mine's
    19; H's 3 experiments (26 minutes) to the 2 that mattered, read size and how often the
    engine's lead line falls off the display books, a few minutes.
  - Check: rerun v2's planning on H's request with the old and the new skill; count experiments
    and minutes waiting.

## Judge checks

A check is a kind of problem, not one bug. It joins only when all four hold:

1. It is a general class that can show up in any feature
2. It was seen in more than one round
3. A fix was seen to remove it, with a test that fails without the fix
4. The judge can detect it the same way in any build

The judge's prompt reads this section. A story's one-off bugs stay in the rounds' evidence.

| Check | Seen | Fix shown to remove it | How the judge detects it |
|---|---|---|---|
| A guard no test can fail (row 16) | A, B, D | `eeeacef` (break each guarded line), held in E | Break each guard and rule the change adds, in a copy, and run the tests. A break no test catches is a finding |

**Pending:** one condition missing.

| Check | Seen | Missing | How the judge detects it |
|---|---|---|---|
| A value the source did not serve shows as zero or a guess (row 22) | G (mine: `0 GAMES` while the count is unserved), H (piv: `#<id>` for an unnamed player, code only) | the fix: piv's, in progress, seen to work | For each value the feature shows from a source, make the source leave it empty or omit it. Anything shown but the no-value mark (a zero, a default, an id, a guess) is a finding |

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
| Putting every choice the user would see to the developer, each option sketched | G: mine's rule "a decision is the developer's when its options differ in what the product's user sees or does", shown as "a sketch of each screen" (the developer's uncommitted edit to the terminal's `generate-plan/SKILL.md`). Mine sketched rail against full width (`G/mine/02-plan.jsonl:1653`); the developer, on glass: "Mine is the only one that fucking got it." v2 put neither the layout nor the stream to the developer |
| A monitor event per finished step, and the coordinator reads that step's last reply, sets it beside the other arms at the same point, and flags what breaks the round's rules | I: the monitor tails `times.tsv` and each arm's run log, one line per step; the reply is the step log's `result`. It surfaced piv's and mine's opposite calls on the refused player and mine's hook bypass while the arms ran. The developer: "This is so much more freaking informative for this eval skill" and "Getting informative information with each step". The monitor expires every 30 min and is re-armed. The base for the `bakeoff` skill |

## Running the round: fix before the next one

| What happened | Cost | Fix |
|---|---|---|
| The coordinator asked a question while two arms could proceed | F: 2 h 15 min idle | Start every step that doesn't depend on the answer first |
| Step costs are the session's running total, not the step's | F: totals overstated until caught | A step's cost is its total minus the previous step's |
| `checks.sh` check 1 misses a quote that wraps | F: v3 counted 0, 8 by hand | Read the whole Settled block |
| The Mac slept with the round running; the developer had asked for caffeine | G: every arm frozen 19:56:48 to 20:55:04 UTC; piv's plan response was cut and resumed; step times corrected from `pmset -g log` (`G/asleep-windows.tsv`) | Start `caffeinate` before the first step |
| The coordinator ran builds one at a time; the arms run in parallel | G: piv waited 47 min between build and review, mine about 20 min before its build; builds ran under different load and live slates | Each arm moves on the moment its step ends |
| The arms share `/tmp` | G: mine's build found `/tmp/nba-mutate.py` overwritten by another arm's script (`G/mine/07-build.jsonl:102`); it did not run it | Give each arm its own `TMPDIR` in the runner |
| A session printed the proxy's `CF_Authorization` cookie into its log | G: `piv/02-plan`, `piv/07-build` and `mine/02-plan` logs; H: `piv/02-plan`, `v2/03-plan-research` and two agent transcripts | I: a hook in the runner blocks `curl -i`, `-I`, `-v`, `-D` and `--trace` (`I/hooks/deny-curl-headers.sh`) |
| Vite pins 5173 and the developer's own server holds it | H: arms collided on 5173; I would have tested `main` instead of its own build | I: `bin/pnpm` moves each arm's dev server to its own port, and a one-line system note names it |
| The runner's last line returned 1 when no dev server held the port, so every step read as failed | I: piv and v2 stopped after `/prime`; both restarted from scratch, about $2 (`I/aborted-1/`) | `run-step.sh` exits with the session's own status. H never hit it: 5173 was always held |
| An arm wrote a file through a Python script, which `require-read-before-edit` does not catch | I: mine edited its plan that way, and said so (`I/mine/03-plan-answers.jsonl`) | The skillz hook catches redirects, `sed -i`, `perl -i` and `tee` only. Open: the developer's call |
| piv ran without its `codebase-analyst` agent, which skillz never copied, and borrowed mine's `codebase-research-agent` in its place | G: piv's plan was researched by another loop's agent, twice; its last place is not a clean verdict on piv | Before a round, check every agent and skill each arm's files name is installed in its worktree |
| The coordinator held an arm at its questions instead of answering them | G: v2b sat idle at its design questions about 15 min until the developer caught it. The developer: "STOP FUCKIGN PAUSGIN MAKE SUER WHEN WE ARE IN DEFAULT MODE IT FINISHES E2E AND YOU OBSERVE EVERYTHING IN BETWEEN" | `run-arm.sh` drives each arm end to end and answers every stop; the coordinator only observes |
| The coordinator's `git reset -- src` cleared an arm's staged rename | G: v2's index wrong for about 2 min during its review; restored exactly | Measure with `git diff <base>` and never touch an arm's index |
