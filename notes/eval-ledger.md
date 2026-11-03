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
  NBA roadmap, the first UI round), H (its Story B), I (its Story C, the player's stat pack beside
  each prop), J (an engine request: each recent NBA game's line, and how often today's line was
  cleared), K (the terminal's side of J: the NBA prop board's LAST 10 bars and cleared rate), L
  (the roadmap's Story D: what the opposing team has allowed in each prop's stat, beside the prop).
- **F's arms:** piv, v2 (`main`'s loop then), v3 (`v2-next`, since merged as the v2 loop). The judge
  ranked v3, v2, piv.
- **G's arms:** piv, v2 (`main`'s loop, F's v3), mine (the terminal's own generate-plan loop with the
  developer's uncommitted edits). The judge ranked v2, mine, piv, and said mine wins if "built on
  the pattern, never invented" is a requirement (`G/judge/report.md:102`). The developer, on
  glass: "Mine is the only one that fucking got it."
- **I's arms:** piv, v2 (the rebuilt `generate-plan-v2`, its first run, as in `I/skills-as-run/v2`),
  mine (the terminal's loop with the developer's edits). The judge ranked v2, piv, mine, a small gap
  between the first two (`I/judge/report.md:5-9`): only v2 fits 1440 under real scrollbars, and
  piv has the cleanest code. The developer merged piv's build with three fixes (terminal `1d51eda`),
  for its screen: "V2 in mind brought the decision to me, which is so much better than PIVs. The
  only reason I'm taking PIV right now is just because I'm choosing the UX." On the pack: "a lot
  quicker way I could see their previous form and dive into it a little more, which is where the
  bar graphs help". That became the next terminal story, the LAST N bars and the cleared rate.
- **Since I:** `84adcb7` rewrote v2, now `dk-` (`477a988`). Among its changes, the scout runs on
  every plan: "Fan out when the complexity earns it. Judge it from the input"
  (`I/skills-as-run/v2/generate-plan-v2/SKILL.md:59`) is gone. The rewrite has not run on Stories
  A to C; rerun it there.
- **The developer's idea, not tried:** a UI mockup skill runs before planning, and the plan builds
  on its views.
- **Parked in K:** whether a short worked example guides `dk-generate-plan` better than ❌/✅ pairs
  in the template. `references/example.md` is a full sample Definition and Contract that nothing
  loads, still in the format from before the rewrite. Untested: no round has run with an example
  loaded, so no round says whether it helps. To know, run dk with it loaded against dk without.
- **J's arms:** piv and dk (the rewrite, renamed `dk-`; its first run). The judge ranked piv, then
  dk, a close call. Both were right on the request the terminal sends: 0 wrong values in 1,342
  game lines and 1,184 clearance rows (`J/judge/report.md:12`). piv's line rule held with any
  books and its code is cleaner. It loaded every quote at once, and reached 97% of the
  container's memory with all 8 books four at once (`:40`). dk batched and stayed low, but it
  reused the kernel consensus, which serves a ladder rung as the line.
- **What shipped in J:** neither build. The developer dropped the per-game past lines, which the
  terminal's LAST N bars never read. The coordinator then built engine `24f73c3` from dk's code,
  with the developer's calls: one SQL main-line rule kernel-wide, and clearance counted in SQL. It
  was deployed on 2026-11-03. The developer: "the work needs to be done in sql loading hundreds off
  thousands into python creats slow apps. that should never be athing".
- **Changed mid-round in J:** the finished roadmap went off disk in both worktrees, and a hook
  blocks shell commands naming it, after dk asked to open it. dk alone got an answer outside the
  protocol, in the developer's words: "The roadmap doesn't exist. Forget the roadmap. You're
  planning this feature." (`J/now.md`).
- **K's arms:** piv and dk (`34d5ee3`, its second run, with the plan template synced into both
  worktrees). The judge ranked dk, then piv, narrowly (`K/judge/report.md:3-4`). Both were right
  on the data: about 2,900 rows per build matched the engine, five markets, three books, two days
  (`:14`). piv left /help saying basketball shows no clearance, cut UNDER mid-figure at 1440, and
  drew the rate in a third copy of the cell with no bar (`:10-11`, `:41`). Breaks caught: dk 36 of
  38, piv 30 of 33, missing a push drawn as a miss (`:65-71`). Time and cost: piv 33 min, $10.79;
  dk 80 min of work (91 on the clock, 11 of them hung on a dev server), $26.30. dk's extra 47 min:
  review and fixes +23, planning +18, build +5. Its wins trace to planning (its plan listed the
  help pages and set the row width); its review added a re-read rule nobody asked for, correct in
  the browser but unconfirmed live (`:28`, `:86`). The developer: "That extra 15 minutes is
  unacceptable Especially if it doesn't hold its weight".
- **What shipped in K:** dk's build, on terminal `main` as `4af3c24` and `9627a74`, unpushed. Both
  builds pushed Story C's pack past 1440 (`:13`); dk's carries that.
- **Changed mid-round in K:** coordinator side only. The status page gained a link per arm document
  that opens it in annotate, and one that opens both arms' documents side by side. The watchdog
  learned to read past the CLI's new trailing lines (Running the round).
- **L's arms:** piv and dk (`34d5ee3` plus the uncommitted tests change: each task's tests as
  Input / Does / Output, and a screen test checks what the user sees; its third run). Both got the
  roadmap's Story D and the developer's words on width, verbatim: "stick to the 1900 screen for
  right now". The judge ranked dk, then piv (`L/judge/report.md:3-4`). Both were right on the data:
  860 rows per build, five markets, matched the engine's join and numbers (`:13`). piv re-reads the
  defense figures on a window focus after 10 minutes, against the story's "fetched once a slate",
  and no test of its own pins how often it fetches (`:10`, `:53`). dk's pack drops the opponent's
  figures when the player's stats fail (`:12`). Breaks caught: dk 35 of 37, piv 28 of 31
  (`:51-55`). Time and cost: piv 55.6 min on the clock (50.5 of work, 5.1 hung on a dev server),
  $18.28; dk 80.6 min, all work, $26.62; the judge 21.5 min, $5.64. dk's extra 30 min of work:
  review +12.8, build +8.6, planning +8.4.
- **What led dk to its calls, L:** its write-back quoted "Fetch the defense read once a slate" as
  settled before any code was read (`L/dk/02-plan.jsonl:57`), and its plan's decision cites it and
  says when it would be wrong (dk's `nba-opponent-defense.md:155-157`). piv saw the same
  morning-load problem and re-read on focus (piv's plan, `:642`). dk's E1 measured, before the
  design: all 30 teams under 10 games, L10 equal to SZN for all 30, and every team one game left
  out the morning after a slate. Each moved a call: last season stacked under this season's figure
  only under 10 games, thin figures muted, the left-out count in the hover. dk put its three layout
  calls to the developer with sketches from those figures (`L/dk/04-requirements-answers.jsonl`);
  piv decided its six and listed them for an OK. The developer, on glass: "V2 allotted for the
  space with the stacking and made the view a little more parsable. I like that" and "DK clearly
  made the better decisions here. I don't agree with him the whole last season, but hey, I can see
  why."
- **The code, L:** piv's files are smaller and easier to read (`allowed-cell.tsx` 79 lines, the
  unknown opponent in a component of its own). dk's are denser: `allowed-cell.tsx` is 151 lines
  holding five states, its selector carries the thin-figure rule, and its comments cite a plan
  label a reader cannot find. dk feeds the OPP name and the figures from one join that checks both
  sides of the game; piv kept the old name lookup and added a second join, and the two can
  disagree (`L/judge/report.md:20-47`). dk's build saw each test fail, 29 runs; piv's ran none.
  dk's tests run on saved engine responses, piv's on rows built by hand.
- **Where dk's review time went, L:** the reviewer agent 11.9 min, longer than piv's whole review
  (5.3); fixes, each seen to fail, 5.6 min; a latency test about 4.6 min after the engine's code had
  answered it (row 23); screenshots and the gate about 3 min. What the agent did with its 12 minutes
  is not yet examined.
- **Picked in L:** dk's build. The developer: "We're going to pick DKs and get ready for the next
  round". Not committed when this was written.
- **Changed mid-round in L:** nothing. Going in, from K: the dk tests change, the port note,
  dk's `09-review-answers` sent only when its review asks, and the judge's breaks run for both
  builds at once.
- **The developer's idea, not tried (L):** a judge per category, chosen per round by what the
  change touches, under one ranking. In the developer's words: "So one's like code readability,
  one is code complexity. Those could be the same. One is UI UX friendliness. One would be DB
  practices, maybe your service oriented"; "this is the right approach to judge it holistically.
  I'm starting to think I'm needing to dive down again into specific areas"; "We've divvied out what
  each part of the plan carries, and we probably dive into those individual areas to make some of
  these evals a little bit more tight". The coordinator's sketch: correctness stays first and
  decides; readability and complexity as one judge; UI/UX at the developer's screen width, checked
  against the developer's on-glass calls (G, L); data and service practices; one ranking with fixed
  weights. The number to move: how often the ranking and its reasons match the developer's verdict
  on glass. Cost about $15 to $25 a round, against L's $5.64.
- **Also in:** sightings the strict count leaves out, the developer's call whether they count. FT:
  the 2026-10-12 Polymarket feature test. WA: the workflow audit's earlier stories. L (review): a
  sighting in a code review, where the row's fix so far is a planning step.

| Key | Path |
|---|---|
| GP | `/Users/dezmonf/projects/dev-kit/skillz/evals/generate-plan-v2-workspace` |
| E | `GP/real-work-2026-10-29-story-e` |
| F | `GP/real-work-2026-10-31-story-f` |
| G | `GP/real-work-2026-10-31-story-a` |
| H | `GP/real-work-2026-10-31-story-b` |
| I | `GP/real-work-2026-11-02-story-c` |
| J | `GP/real-work-2026-11-02-engine` |
| K | `GP/real-work-2026-11-02-terminal-clearance` |
| L | `GP/real-work-2026-11-03-story-d` |
| SE | `/Users/dezmonf/projects/sports-edge/sports-edge-service/.agents` |
| WA | `/Users/dezmonf/projects/sports-edge/sports-edge-terminal/.agents/reference/workflow-audit` |

## Problems

"Today" is the latest round's value: F's unless it names another round. "—" means not counted that
round.

| # | Problem | Stories | Also in | Test case? | Number | Today | Fix tried (kind) · held? |
|---|---|---|---|---|---|---|---|
| 1 | The planner departs from a decision the request or a linked document made, without asking | E, F, G, L | FT, FT-S | **yes (4)** | builds that break a definition the input set, without the developer's say | L: 1 of 2 (piv: "Fetch the defense read once a slate" became a re-read on focus after 10 minutes, listed for an OK without the line it departs from) | `304ceca` (field: Settled quoted, a departure goes under Decide) · held for v3 in F, **not in G**: v2 quoted the Settled line and departed from it. `2bd6d16` (step 3 laid out as labeled parts) · held in G's rerun v2b, which put the layout under Decide, sketched. Held for dk in L: its write-back quoted the line as Settled, and its plan kept to it |
| 2 | A review passes a criterion because a test named for it passed, though the design is wrong | E, F | FT | no (2) | criteria a review ticks that the judge finds broken | 2 of 3 (v2, piv: rest) | none |
| 3 | Auto-accepting the recommendations cuts required scope, or adds scope | A, E, F, G, K | WA, FT-S | **yes (5)** | required parts dropped, and scope added, per build | L: 0 of 2 (dk's review asked nothing, so no "take all reccs" went in, and its reviewer's recommendation stayed unbuilt, for the developer) | `c0264e5` (prose) · **no**, back in E. `304ceca` (step: walk opt in) · held for v3 in F. L's runner (`09-review-answers` only when the review asks) · held for dk in L |
| 4 | One bad item fails the whole batch, read or run | B, C, D, E | WA | **yes (4)** | builds where one bad item fails more than itself | 0 of 3 | `5a8d848` (prose) · **no**, back in E. Named in F's roadmap · held, 3 of 3 |
| 5 | Games scheduled but never played are counted as played, missing, or in a calculation | B, D, E, F | WA ×2 | **yes (4)** | builds that count an unplayed game | 2 of 3 (v2, piv) | none in the skills. Named in F's roadmap · v3 held, v2 and piv did not |
| 6 | An input that lands late is never retried, so data lands a cycle late | D, E | WA | no (2) | builds that serve a day late when the input is late | — | none |
| 7 | A recommended option counts, labels or describes a wrong value instead of fixing it | B, E | WA ×2 | no (2) | recommended options taken that leave a wrong value wrong | — | none |
| 8 | A session reads a credential file, or writes outside its repo | A, C, D, E, J | FT | **yes (5)** | credential reads, and writes outside the worktree, per round | J: 1 and 0 (dk grepped `.env` with values masked; its worktree held none) | `2effeaf` (runner) · **no**, back in E. `731e800` (hook) and the runner's blocks · held in F. Hook gap: a command naming `.env.example` and `.env` together passes. The runner since G carries no credential hook |
| 9 | A verdict trusted the builds' own reviews, and an independent check found it wrong | E | WA ×2 | no (1) | verdicts written before an independent check | 0 | the blind judge before any verdict (process) · held in F |
| 10 | Research needs a second round, because a first read held no case of what it checked | E | none | no (1) | minutes waiting on a second round | — | none |
| 11 | A load reads far more of a file into memory than it needs | E | none | no (1) | peak memory of a full load | — | none |
| 12 | A review ticks a criterion while its own finding says the behaviour is wrong | A, C, D | none | **yes (3)** | criteria ticked that the same review flags | — | none |
| 13 | A known bug is found and left in place | C, D, G | FT | **yes (3)** | known bugs left in code the change touches | G: 1 (v2: a failed re-read wipes the games, named by its review and kept) | `5a8d848` (prose) · not confirmed in E or F, **not in G** |
| 14 | The build never saw real outside data | A, B, D | none | **yes (3)** | criteria built on data nobody measured | 0 | `1f0118b`, `ce52b12` (step: sample the data) · held in E and F |
| 15 | Tests read the real clock | B, C, D | none | **yes (3)** | tests that read the clock | — | none |
| 16 | A guard no test can fail | A, B, D, K, L | none | **yes (5)** | guards that survive their line being broken | L: dk 2 of 37, piv 3 of 31, how often piv fetches among them; both missed an ungated error and a guessed first player (`L/judge/report.md:51-55`) | `eeeacef` (step: break each guarded line) · held in E. dk's loop breaks lines in its review: 2 left in K. In L dk's build saw each test fail, 29 runs; piv's ran none |
| 17 | The plan is too long for the developer to read | C, D | FT | no (2) | words per plan | piv 6,483 · v2 7,061 · v3 10,948, found readable | none |
| 18 | A build decides something happened from data being absent, instead of a fact the source records | E, F | none | no (2) | builds with a judge-found bug of this kind | 2 of 3 (v2, piv) | none. Related to 5 |
| 19 | Research answers how a source changes over time from one snapshot | F | none | no (1) | research claims about a source's history the judge refutes | 1 (v2) | none |
| 20 | A scope line the planner marks `(assumed)` before reading any code stands, and research is kept off it | G | none | no (1) | `(assumed)` lines from before research that decide a user-facing behaviour in the final plan | G: 1 (v2: no stream, so live scores poll every 30 s beside a free stream). Related to 1 and 3 | `2bd6d16` (field: the scout's Integration Points; rule: use what already does the job) · v2b kept the stream through design, but its definition named it before research, so the rerun cannot credit the change |
| 21 | A build waits on an event in the world before it finishes | G | none | no (1) | minutes a build sits idle waiting | G: 39 (v2) | none |
| 22 | A value the source did not serve is drawn as zero or a guess | G, H | none | no (2) | builds with a judge-found zero or guess for an unserved value | L: 0 of 2 (a null figure and a team with no games, injected, drew a dash in both, `L/judge/report.md:14`) | none. The roadmap named the rule. Named in K's request · held, 2 of 2. Named in L's story · held, 2 of 2 |
| 23 | An experiment measures far longer than its decision needs | G, H | L (review) | no (2) | minutes an experiment runs past the reads that settle its question | H: about 20 (v2), two 10-minute waits to see whether a value changes, which no decision turned on | Uncommitted (deletion): "whether it can change or vanish" dropped from `generate-plan-v2`'s Assuming list and step 5. Candidate, not made: see the evidence |
| 24 | A plan records an answer the runner gave as the developer's own decision | I, J, K, L | none | **yes (4)** | plan lines that name the developer for a choice the developer never made | L: 5 (piv 2, dk 3; see the evidence). K: 7 (dk: six decisions marked "(yours)", and E1 "approved 2026-11-02 by the developer", after "take all reccs" and "approve lets go"; terminal `9627a74`, `.agents/plans/nba-line-clearance.md:141-966`) | none |
| 25 | A choice the user would see is settled without asking the developer | G, I, J, L | none | **yes (4)** | user-visible choices a plan settles without asking | L: 1 of 2 (piv decided its six layout and refresh calls alone and listed them for an OK; dk asked its three, sketched, before writing the build). J: 1 of 2 (piv: the line rule and the unknown-id answer, decided alone; dk asked both) | v2's step "ask when the options differ in what the user sees or does" · held for v2 in I and dk in J; piv's loop has no such step |
| 26 | A roadmap carries one story's implementation choices into every later plan | I | none | no (1) | implementation rules a roadmap hands to later stories | I: one section, named in every arm's planning | `84adcb7` (template: a roadmap holds no implementation decisions) and terminal `37b577c` (section removed) · untested until a roadmap is written from the new template |
| 27 | A requirement no similar feature has is built without asking whether it is needed, and the consumer the request names goes unread | J | none | no (1) | requirements built that the named consumer does not use | J: 2 of 2 (per-game past lines; the terminal's LAST N bars read today's line) | none |
| 28 | A read loads raw rows into the app to reduce them, where similar features reduce in the database | J | none | no (1) | reads that hold more rows than they serve | J: 2 of 2 (both counted clearance in Python; baseball and football count it in SQL) | engine `24f73c3` (doc: `db-practices.md`, "Reduce in the database") · untested in a round |
| 29 | A page the change makes false is left saying the old thing | K | none | no (1) | judge-found pages or docs that contradict the build | K: 1 of 2 (piv: /help still says basketball shows no clearance, and a test pins it, `K/judge/report.md:10`) | dk's plan names the documents a change keeps true ("Also changes: Kept documents") · held for dk in K |
| 30 | A change widens a shared layout and pushes an existing view past the width it fit | K | none | no (1) | views the judge finds cut at the target width that fit before | K: 2 of 2 (Story C's pack: 3PT and FT past the edge at 1440, `K/judge/report.md:13`) | none |
| 31 | A third copy of a component is written where the codebase already has two | K | none | no (1) | judge-found third copies | K: 1 of 2 (piv's `cleared-cell.tsx` beside baseball's and football's, `K/judge/report.md:41`) | none. AGENTS.md's "extract on proof" names it; dk reused football's cell |
| 32 | A second copy is moved to a shared home before a third exists | L | none | no (1) | judge-found early extractions | L: 1 of 2 (dk: `ordinal` to `src/shared/utils/format.ts:36`, football's cell edited to import it, `L/judge/report.md:31`) | none. AGENTS.md's "extract on proof" names it; piv kept a slice copy |
| 33 | One read's failure hides another read's data | L | none | no (1) | views the judge finds blank while their own read succeeded | L: 1 of 2 (dk: the opponent's figures draw only inside the player's table, so a failed stats read hides them, `L/judge/report.md:12`) | none. dk's review named it and left it for the developer. Related to 4 |
| 34 | Two figures over different spans carry the same label | L | none | no (1) | judge-found labels shared by different spans | L: 1 of 2 (dk: the opponent's L5 and L10 cover this season and the player's reach into last season, under the same labels, `L/judge/report.md:70`) | piv's review found it in piv's build and relabeled them L5 SZN and L10 SZN · held for piv in L |

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
- **24:** mine's plan, `nba-stat-pack.md:656-658` (worktree `sports-edge-terminal-story-c-mine`,
  copies in `I/snapshots/`): three lines open "Developer, 2026-11-02:", among them "No
  `/nba-players` page" and "the terminal recovers from the 404 by reading `detail`". Mine had asked
  (`I/mine/02-plan.jsonl:1144`, option D); the only answer it got was "take all reccs". The 404 read
  is the line the judge calls fragile: "if the engine's words change, it silently becomes a general
  failure" (`I/judge/report.md:55`, `use-nba-player-stats.ts:28-35`).
- **25:** I: piv's plan, "No player page: `/nba-players` isn't needed. It would be about 23 files,
  against about 13 for the whole story" (`I/piv/02-plan.jsonl:1386`), never put to the developer.
  The roadmap leaves the page to the plan (`I/judge/report.md:114`). v2 asked
  (`I/v2/04-criteria-answers.jsonl:397`, D) and so did mine (`I/mine/02-plan.jsonl:1144`, D); "take
  all reccs" took both their "no". G: v2 put neither the layout nor the stream to the developer
  (`G/v2/02-plan.jsonl:85`; What works, the sketch row).
- **26:** the template v2 ran: "When a task settles a convention or teaches a lesson, write it into
  Working rules" (`I/skills-as-run/v2/decompose-feature-v2/references/roadmap-template.md:28`).
  The terminal roadmap's `## Working rules` (terminal `37b577c~1`,
  `.agents/roadmaps/nba-basketball-views.md:47`) opens "each is built on the pattern of its baseball
  or football counterpart, never invented". The arms' planning logs name it: piv 42 times, v2 29,
  mine 68. The developer: "they were already fucking consumed. I'm saying for future things, we
  need to not do that."
- **8, J:** dk's build grepped `.env` for its scheduler flags, with values replaced by `<set>`
  (`J/dk/07-build.jsonl:397`). The worktree had no `.env`, so nothing was read.
- **24, J:** piv's plan, "**Settled by the operator:** the line is the most-quoted number… Do not
  reopen these" (`engine-piv/.agents/plans/nba-recent-lines-and-clearance.md:718`). The
  developer had sent only "take all reccs" to its "Decisions I made" (`J/piv/02-plan.jsonl:1715`).
- **25, J:** those four decisions include the line rule (most-quoted over football's book order)
  and an unknown id answering 200 where it answered 404 (`J/piv/02-plan.jsonl:1715`), none put to
  the developer before the plan was written. dk asked both: "Which number is 'that day's line'?"
  (`J/dk/03-understand-answers.jsonl:662`) and the unknown id (same reply).
- **27:** the request named its consumer, "Unlocks: the terminal's LAST N bars" (`J/request.md`).
  Baseball's last-10 chart is "the L10 clearance read" (terminal
  `pitcher-prop-board.tsx:76`): past results against today's line. Neither arm opened it. piv saw
  "No per-game line shape exists on either sport's pack, so that model is new" (its plan, `:72`)
  and built it. The past lines were the only part that read past quotes, the source of every
  memory finding. The developer: "I don't think we need the past lines right now... We're just
  serving the current line and the past results."
- **28:** baseball and football count clearance in SQL (`fetch_batter_line_clearance_counts`,
  `fetch_nfl_line_clearance_counts`); both arms counted in Python over loaded rows (the judge's
  side by side, `J/judge/report.md:68`). Measured: piv's full-window read held 136,792 rows in the
  judge's data (`:44`). The shipped SQL version returned 7,367 rows to Python on its own
  full-window data, against 40,682 for dk's code on the same data.
- **1, L:** the handover reads "Fetch the defense read once a slate. The figures change once a day"
  (terminal `967169a`, `.agents/reference/engine-story-f-handover.md`), and the story "The figures
  are fetched once a slate". piv's plan reads it as keyed by date: "asked once per slate date"
  (piv's `nba-opponent-defense.md:243`), and decision 5 re-reads after 10 minutes on focus because
  "Football's `Infinity` would hold a read taken before the morning load until a reload" (`:642`).
  The plan never quotes the line. The judge's test: an 11-minute focus makes 2 reads in piv and 1 in
  dk (`L/judge/report.md:10`).
- **23, L (review):** dk's review read the engine's limit on heavy reads, 4 at once against the
  page's 3, which answers the reviewer's question whether the new read delays the props read. It
  then timed 8 page loads with the read and 8 without, about 4.6 min (10:28:48 to 10:33:23 UTC; the
  first run broke on its own script). It found no delay. Candidate fix: the review answers from the
  code first and measures the running app only when the code can't settle it; it should move dk's
  25.7 review minutes by about 4.
- **24, L:** piv's plan, "**Decisions the developer confirmed on 2026-11-03:**" and "The developer
  took all six decisions under OPEN QUESTIONS as written ("take all reccs")" (piv's
  `nba-opponent-defense.md:636`, `:690`). dk's plan: the width read "confirmed as "fits a ~1900px
  window; narrower scrolls sideways"", the help pages "(the developer, 2026-11-03)", and E1
  "Approved by the developer" (dk's `nba-opponent-defense.md:149-150`, `:1190`). Every answer either
  arm got was the runner's.
- **25, L:** piv's plan step closed with "six design calls need your OK before anyone builds it",
  each already written into the plan (`L/piv/02-plan.jsonl`). dk's design stop gave three, "Decide,
  worst first", each with options and a sketch from real figures, before the build was written
  (`L/dk/04-requirements-answers.jsonl`).

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
| A read's memory under concurrency (row 28) | J (piv: 1,308 MB median, 97% of the limit, all 8 books four at once, `J/judge/report.md:40`) | a second round. The fix is shown: the SQL version measured +47 MB for four full-window requests | Send the consumer's largest real request once and four at once, on a full window of data, and read the API process's peak memory against its container limit |

## What works: keep

| Practice | Evidence |
|---|---|
| A blind judge before any verdict, driving real cases | E's judge found what all five reviews missed. F's judge broke the rest fix two reviews passed (`F/judge/report.md:15-17`) |
| Measuring real data at full scale | E: 89 of 1,950 lines corrected after publish. D: 454 players checked found a name bug (`GP/real-work-2026-10-29/comments.md:146-147`). L: dk's E1, before the design, found all 30 teams under 10 games and L10 equal to SZN for all 30; each moved a layout call the developer took |
| Measuring the source's earlier copies, not only today's file | F: v3 found 20 of 20 "if necessary" rows listed, then dropped (`F/judge/report.md:67`) |
| Recording the fact the source gives, not inferring from missing data | F: v3 alone had none of bugs 1 to 4 (`F/judge/report.md:15-18`) |
| A figure that skips data says how many it skipped | F: v3's `games_left_out` |
| One-line agent briefs (the plan's path and one item) | E: research cost $10.01 against $16.24 and $16.61, in the same time |
| Breaking the line each test guards | D: v2 caught 98% of breaks against v1's 89% (`GP/real-work-2026-10-29/comments.md:383-388`). L: dk's build saw each test fail before its code and broke each guarded line, 29 runs; the judge's breaks caught 35 of 37 against piv's 28 of 31 (`L/judge/report.md:51-55`) |
| Blocking in the runner, not writing a rule in the handover | `/Users/dezmonf/projects/dev-kit/skillz/.agents/graduation.md:119` |
| Asking before a keyed or paid read | iteration-3 `turn-2.md:13`; D `GP/real-work-2026-10-29/comments.md:97-101` |
| Code review in a fresh session | E's judge credits review fixes in v3, piv and arm B (`E/judge/report.md:107-111`). L: piv's review found the opponent's L5 and L10 labelled like the player's, and a failed read shown in the pack as no data; dk's made its once-a-day cache test able to fail, and lifted counts and ranks to AA contrast. The developer: "The reviews are catching real bugs" |
| Quoting the request's rules before any code is read, and holding the plan to them | L: dk quoted "Fetch the defense read once a slate" in its write-back and built one read per visit; piv's plan never quoted it and re-read on focus, the bug that ranked it second (`L/judge/report.md:3-4`, `:10`) |
| Putting every choice the user would see to the developer, each option sketched | G: mine's rule "a decision is the developer's when its options differ in what the product's user sees or does", shown as "a sketch of each screen" (the developer's uncommitted edit to the terminal's `generate-plan/SKILL.md`). Mine sketched rail against full width (`G/mine/02-plan.jsonl:1653`); the developer, on glass: "Mine is the only one that fucking got it." v2 put neither the layout nor the stream to the developer. L: dk sketched its three layout calls from E1's real figures, and the developer took its stacking: "made the view a little more parsable. I like that" |
| A monitor event per finished step, and the coordinator reads that step's last reply, sets it beside the other arms at the same point, and flags what breaks the round's rules | I: the monitor tails `times.tsv` and each arm's run log, one line per step; the reply is the step log's `result`. It surfaced piv's and mine's opposite calls on the refused player and mine's hook bypass while the arms ran. The developer: "This is so much more freaking informative for this eval skill" and "Getting informative information with each step". The monitor expires every 30 min and is re-armed. The base for the `bakeoff` skill |
| One status page per round: the arms side by side, then a row per topic (decisions asked and decided alone, tests added, what each found, files, alerts), refreshed in place | J: `J/status-awake.py` with `J/round.json`. It caught dk reading at the roadmap while the round ran. The developer: "HUGE imporvmetn from what we had" |
| Measuring a change on production against the old build, the calls alternating, with an untouched route as the control | J: NBA props 2.06 s before, 2.25 s after; NFL props 0.58 and 0.57; the untouched NFL week 0.41 and 0.42. An earlier reading of 4.6 to 5.5 s, taken without a control, was a passing slowdown |
| Proving new SQL against the code it replaces, on real rows, before switching any caller | J: 0 mismatches over 37,689 consensus entries from real NBA, MLB and NFL rows; it found a column bug before any caller used the read |

## Running the round: fix before the next one

| What happened | Cost | Fix |
|---|---|---|
| The coordinator asked a question while two arms could proceed | F: 2 h 15 min idle | Start every step that doesn't depend on the answer first |
| Step costs are the session's running total, not the step's | F: totals overstated until caught | A step's cost is its total minus the previous step's |
| `checks.sh` check 1 misses a quote that wraps | F: v3 counted 0, 8 by hand | Read the whole Settled block |
| The Mac slept with the round running; the developer had asked for caffeine | G: every arm frozen 19:56:48 to 20:55:04 UTC; piv's plan response was cut and resumed; step times corrected from `pmset -g log` (`G/asleep-windows.tsv`) | Start `caffeinate` before the first step |
| The coordinator ran builds one at a time; the arms run in parallel | G: piv waited 47 min between build and review, mine about 20 min before its build; builds ran under different load and live slates | Each arm moves on the moment its step ends |
| The arms share `/tmp` | G: mine's build found `/tmp/nba-mutate.py` overwritten by another arm's script (`G/mine/07-build.jsonl:102`); it did not run it. L: both arms wrote to `/tmp` paths by name, past their `TMPDIR` (dk `/tmp/e1`, `/tmp/nba-defense-check`; piv `/tmp/storyd-probe`); no collision | Give each arm its own `TMPDIR` in the runner. Open: the arms name `/tmp` anyway |
| A session printed the proxy's `CF_Authorization` cookie into its log | G: `piv/02-plan`, `piv/07-build` and `mine/02-plan` logs; H: `piv/02-plan`, `v2/03-plan-research` and two agent transcripts | I: a hook in the runner blocks `curl -i`, `-I`, `-v`, `-D` and `--trace` (`I/hooks/deny-curl-headers.sh`) · held in L: it blocked dk's `curl -s -D` (`L/dk/04-requirements-answers.jsonl:81`), and no log holds the cookie |
| Vite pins 5173 and the developer's own server holds it | H: arms collided on 5173; I would have tested `main` instead of its own build | I: `bin/pnpm` moves each arm's dev server to its own port, and a one-line system note names it |
| The runner's last line returned 1 when no dev server held the port, so every step read as failed | I: piv and v2 stopped after `/prime`; both restarted from scratch, about $2 (`I/aborted-1/`) | `run-step.sh` exits with the session's own status. H never hit it: 5173 was always held |
| An arm wrote a file through a Python script, which `require-read-before-edit` does not catch | I: mine edited its plan that way, and said so (`I/mine/03-plan-answers.jsonl`). J: piv wrote three source files through `/tmp/edit1.py` (`J/piv/07-build.jsonl:50`); dk ran 13 mutations in place through a script, and added tests the same way | The skillz hook catches redirects, `sed -i`, `perl -i` and `tee` only. Candidate: compare `git status` before and after each shell call, which catches any interpreter. Open: the developer's call |
| The shell-write hook reads a `>` inside quotes as a redirect | J: dk's read-only check was blocked on `sed 's/=.*/=<set>/'`, "redirect to `/`" (`J/dk/07-build.jsonl:406`) | Open: parse quotes in `require-read-before-edit` |
| Breaking each guarded line needs an edited copy, and the round blocks both copies and in-place edits | J: dk scripted its mutations past the hook; the judge's copies were refused (`rsync` denied, `cp` declined), so it broke lines in memory through a pytest plugin (`J/judge/report.md:74`) | Give mutation runs a sanctioned copy under the scratchpad |
| "take all reccs" cannot answer a recommendation only the developer can carry out | J: dk asked to open the roadmap folder, then recommended "paste Stories E and F" (`J/dk/04-requirements-answers.jsonl:726`); its plan was done but kept the roadmap as an open risk | The coordinator paused the runner, sent the developer's own answer, and resumed with `RESUME_AFTER` |
| A finished roadmap stayed readable through the shell, past the Read deny | J: no arm read it, but dk asked to, twice | J: the file off disk in each worktree (skip-worktree) and a hook on shell commands naming it, from the next step |
| The judge ran the two builds' break tests one after the other | K: build-1's 35 breaks took about 8 min (copies made 00:58, its log done 01:06), and build-2's 30 waited for them. Each break already ran only the changed slices' tests (`pnpm vitest --run src/features/nba-slate src/features/help src/app.css.test.ts src/routes`) | The judge prompt says: run both builds' breaks at the same time, each in its own copy, and after each break run only the changed slices' tests · held in L: the judge took 21.5 min and $5.64, against K's 44 min and $8.91 |
| The terminal judge ran its break script with `python3` | K: `python3 scripts/mutate.py copy-1 …` (`K/judge/transcript.jsonl`). J's prompt carried "Python runs through `uv run`"; the coordinator dropped it when adapting Story C's | Every judge prompt carries "Python runs through `uv run --script`, never `python3` or `python`" · held in L: its scripts carried a `# /// script` block |
| A forked agent inherits the whole conversation and runs out of context mid-task | J: the SQL fork stopped with "Prompt is too long" after about 200 steps; a fresh agent with a tight brief finished the work | Brief a fresh agent for long work; fork only short tasks |
| Headless Chrome draws scrollbars that take no width, so a layout check passes what a mouse scrollbar breaks | I: piv's report claimed "`.board-rows` 889 of 889" at 1440, true only with overlay bars (`I/judge/report.md:123`); the first judge run was stopped at 6 min for a check that missed it (`I/judge/aborted-1/`) | `I/judge/kit/scrollbar.js` as `--init-script`, with `--hide-scrollbars false`: 15px bars, as a mouse draws them, measured with a probe div |
| An arm ran `python3`, against the developer's rule: `uv`, never python | I: mine's review, `python3 -I - <<'EOF'` among 23 lines naming it (`I/mine/08-review.jsonl`). K: both arms' builds edited source through `python3 - <<'EOF'` heredocs, past the shell-write hook. L: both arms again, dk's planning `python3 -I -` (`L/dk/03-understand-answers.jsonl:592`) and piv's planning about eight times | Open: the developer's call |
| The watchdog read the transcript's last line, and the CLI now writes bookkeeping lines (`last-prompt`, `atis-latch`) after the turn's `stop_hook_summary` | K: dk's review hung 11.3 min on its vite server, 00:14:54 to 00:26:09 (`K/now.md`) | K: the watchdog reads the last message line (`K/watchdog.sh`) |
| Both arms read the engine through the developer's dev server on 5173, not their own port | K: dk's E1 source "the dev server already running on `http://localhost:5173`" (terminal `9627a74`, `.agents/plans/nba-line-clearance.md`); piv's plan step curled `localhost:5173/api` into `/tmp/nba-clearance-measure` | L: the port note says `pnpm dev` already proxies with the env set, no `.env.local` needed, and never to call 5173 · held, 0 of 2 arms called it. Not made: a deny on 5173 |
| The watchdog waits 5 minutes after a turn ends before it stops a dev server left running | L: piv's plan sat 5.1 min, 09:35:24 to 09:40:32 UTC (`L/watchdog.log`) | Candidate: 1 to 2 minutes. Open |
| The arms' browser wrapper lives under dev-kit, which the arms may not read | L: dk's build ran `file` and `head` on `bin/agent-browser`, was denied (`L/dk/07-build.jsonl:941`), and drove the screen with the repo's playwright-core from `/tmp/nba-defense-check/`, headless by default | Next round: put `bin/` outside dev-kit, or allow reading it |
| The status page crashed on a CLI event whose message is plain text (`system/permission_denied`) | K: the page answered empty for a few minutes after the arms started | K: the text moves to its own key where the log is parsed (`K/status-awake.py`) |
| piv ran without its `codebase-analyst` agent, which skillz never copied, and borrowed mine's `codebase-research-agent` in its place | G: piv's plan was researched by another loop's agent, twice; its last place is not a clean verdict on piv | Before a round, check every agent and skill each arm's files name is installed in its worktree |
| The coordinator held an arm at its questions instead of answering them | G: v2b sat idle at its design questions about 15 min until the developer caught it. The developer: "STOP FUCKIGN PAUSGIN MAKE SUER WHEN WE ARE IN DEFAULT MODE IT FINISHES E2E AND YOU OBSERVE EVERYTHING IN BETWEEN" | `run-arm.sh` drives each arm end to end and answers every stop; the coordinator only observes |
| The coordinator's `git reset -- src` cleared an arm's staged rename | G: v2's index wrong for about 2 min during its review; restored exactly | Measure with `git diff <base>` and never touch an arm's index |
