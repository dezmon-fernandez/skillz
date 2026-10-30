# Research agents: three kinds, split by what each may touch

Saved 2026-10-29 to come back to. Nothing here is built yet. Evidence is in
`evals/generate-plan-v2-workspace/real-work-2026-10-29-story-e/comments.md`.

## The idea

The developer, verbatim: "a third type of agetn gets bash for running experiements and that would
motivTE THE agetn t oexplore that direction. then the readonly would be codebase i think, then web
fetch would get the appropraite web tools to actually read adn report back in a specifci format"

Earlier, verbatim: "we can tell the reseach agent to sample a size of at least n. isnt that the prupose
of a reasearhc agent?"

## The three

- **Codebase researcher: Read, Glob, Grep. No shell.** Reports the files to read and what exists
  today. Its line numbers come from tools that print real ones.
- **Experiment agent (new): a shell.** Given a claim about real data, it measures it: the whole set
  when that is free, at least n samples only when each one is a paid or rate-limited call. It saves the
  sample under `.agents/samples/` and reports each claim as
  `<claim>: measured <how>, <n> of <total>, <when>, <sample path>`. It never writes to a source, and
  the main thread asks the developer before anything that costs money or needs a key. Python runs
  through `uv run`.
- **When an experiment is asked for.** The developer, verbatim: "if research requies experiemnt it can
  ask the user than too during the clear up unkowns stage". The planner lists each experiment it wants
  where it clears up unknowns with the developer, beside the `Assuming` list: what it settles, how, and
  what it costs. The developer's answer there decides which ones run.
- **Web researcher: web search and fetch.** Reads documentation and other people's failures, and
  reports in a fixed format. It does not try to fetch live data.

## Why, measured

- **Line numbers.** Across Story D and both Story E runs, the scout and code researchers ran 290 file
  views and 265 searches through the shell, against 48 Read calls. About 95% of their shell use was
  viewing, searching or listing files. The two wrong citations scored on Story D both came from `cat`.
- **Measuring.** No agent can measure today. The web researcher has no shell, and ESPN refused its
  fetches with 403 on Story D. The code researchers have a shell but are briefed to read code. So the
  main thread measured, and on Story D it measured 2 box scores and 51 players where v1 measured 68
  and 454 and found the name bug.
- **Report shape.** The templates have no slot for how many records a claim was checked on, so 51 of
  51 reads the same as 454 of 454. They also have no length bound: reports run 13,500 to 40,000
  characters each.

## How code research is split

Today the count follows directories: one researcher per slice, at most five (v1 groups search hits
by directory; v2's scout names the slices on its route). Nothing weighs overlap: on Story D the ESPN
doc and client were each read by 6 agents.

The developer, verbatim: "maybe nlb and nfl should be there own dindividual agents adn another for
how wevertyhgi is wired". Put generally, split by role, not directory:

- **The area the feature lands in** (Story E: the NBA slice).
- **One per existing sibling feature it copies** (Story E: the NFL stat pack, MLB game logs).
- **The wiring:** how a feature is registered and run, such as scheduling, commands, routes,
  settings, and the docs that move with them.

On Story E, v1's agents came close to this by accident (NBA ingest, NBA store and live, the NFL
stat-pack pattern, the MLB game-logs pattern, with no wiring agent). v2's scout split by the
feature's route instead (source and storage, keeping it current, the stat-pack read, docs and
decisions, with no agent on the pattern to copy).

**Agents report facts; the main thread designs.** The developer, verbatim: "maybe thats okay cause if
the main thread looks into all three in can determine the ebst move adn when to refacotr or where to
incroporte / notice when things are irght / wrognw ay to do thins". Kept: a researcher never says how to
build. It tags each file `mirror`, `reuse`, `change`, `match` or `follow as a test`, and the main
thread, holding the area, the patterns and the wiring together, picks the move. That holds only if the
reports also say where an existing pattern is the wrong one to copy, under `Patterns` (`Forbidden`,
`Trap`) and `Open Choices`.

## Briefs, measured (Story E)

Each code researcher's brief, split into its parts, and how long the main thread took to write it.

| Version | Brief | Definition | Scout report | The agent's own part | Writing time |
|---|---|---|---|---|---|
| v1 (no scout) | 3,300 to 4,500 | none | none | all of it | 10 to 15 s |
| v2 | 24,400 to 34,500 | 10,400 | 6,800 to 16,700 | 5,500 to 7,500 | 66 to 96 s |
| v3 | 20,300 to 33,500 | 10,800 to 12,900 | 8,500 to 19,900 | 700 to 900 | 53 to 91 s |

- The definition and the scout's report are the same text in every brief, retyped each time: about
  100,000 characters per plan in v2 and v3. In v3 the agent's own part was under 1,000 characters.
- The definition is used: most reports have one `Today` line per criterion (27 of 27).
- Of the files the scout's report names, each researcher opened about half to three quarters (7 to
  12 of 13 to 19). The rest belong to other slices.
- v1's short briefs went out in seconds, and its researchers still pointed the main thread at 20 of
  the 21 files it opened. Its citations were the least accurate (10 of 15).

The decision this feeds: how to give every researcher the shared text without retyping it.

## What Claude Code offers (docs, 2026-10-30)

- **Fork** (`https://code.claude.com/docs/en/sub-agents#fork-the-current-conversation`): inherits the
  whole conversation, no brief to write, first request reads the parent's prompt cache. It runs with
  the main session's system prompt, tools and model, so no `.claude/agents/` definition: no
  read-only tool list, no cheaper model, no report template. On by default since 2.1.302. How a
  skill asks for one is not documented.
- **A regular agent** gets its own prompt, the delegation message, the CLAUDE.md and AGENTS.md
  files, a git status, and any preloaded skills. Not the parent's conversation or the files it read.
- **Shared text without retyping:** a file the agent reads; a `SubagentStart` hook's
  `additionalContext`, added before the agent's first turn; a `skills:` preload, which suits fixed
  instructions, not per-feature data.

## What published work says (16 sources, 2026-10-30)

- **Context is lost at agent boundaries.** Two SWE-bench teams merged agents for that reason
  (Martinez and Franch, arXiv 2506.17208); MAST's 1,642 traces show agents disobeying their task
  spec 11.8% of the time (arXiv 2503.13657).
- **Long context hurts focus.** Focused prompts of about 300 tokens beat full ones of about 113,000,
  and one distractor lowers scores (Chroma, "Context Rot"). This counts against forking a long
  session into every agent.
- **For coding, many agents rarely beat one when compute is matched** (Kim et al., arXiv 2512.08296:
  -15% to -2% on a SWE-bench Verified subset; Tran and Kiela, arXiv 2604.02460). Gains come on
  parallel, read-heavy research (Anthropic, multi-agent research system: +90.2%, mostly from
  tokens spent). Agents that only read are the easier case (LangChain; Cognition, 2026).
- **A brief needs an objective, an output format, tool and source guidance, and task boundaries**;
  vague ones duplicate work and leave gaps (Anthropic). No source tests a long brief against a
  short one.
- **Pass results on word for word.** Forwarding subagent answers verbatim instead of relaying them
  gave about 50% (LangChain, multi-agent benchmark, tau-bench).
- **Return short.** Anthropic's guidance: a subagent returns a distilled summary, often 1,000 to
  2,000 tokens. Ours return 13,500 to 40,000 characters.
- **Review works best with no shared context** (Cognition, 2026; Claude Code best practices). Keep
  the plan reviewer fresh.

## Open questions

- Does the experiment agent start with the code researchers? It needs only the definition's
  `Assuming` list, which `generate-plan-v2` writes before research.
- One experiment agent per claim, or one per data source?
- A length bound per report, and where the long detail goes instead.
- The main thread still reads with `sed` (about 1,260 lines on Story D). If its own citations stay
  wrong, a hook on its shell reads comes next.
- `generate-plan-v2` then depends on three research agents, and must say what to do when one is missing.
