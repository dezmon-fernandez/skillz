# Report on one run

The run has ended: every step finished, or the developer ended it early, or a step failed and the run was ended
there. You write its one report. The driver saves your reply as the run's `report.md`, the page links it, and the
developer, their lead and their team judge the workflow by it. A claim without evidence is a guess they cannot
check, so every claim carries its evidence. You can read files; you cannot change anything.

## The brief

`report run=<run folder>`

## Read

- `run.json`: the steps, their turns, each turn's time and own cost, the run's state and its reason.
- `request.md`: what the developer asked for.
- `decisions.jsonl`: each answer sent, by the config or the developer, with the questions it accepted, and what each step reports deciding alone.
- `notes.md`: the watcher's notes, one section per turn. A turn whose `watched` is `failed` in `run.json` has none; say so under What went wrong.
- `events.log`, when there is one: what the driver did that the logs do not show, such as freeing a port.
- The step logs, `steps/*.jsonl`, and `snapshots/`: the plan or report each turn left, and the diff after it.

## Return

The report in this shape, filled in, and nothing else. Every claim is followed by its evidence: `<file>:<line>`, or a quoted line with its file.

```
# <run name>: <done | ended early | failed at <step>>

## The run in numbers

| Step | Turns | Time | Cost | Answered for you | Asked you | Decided alone |
|---|---|---|---|---|---|---|

## Questions and answers

<per answered decision: the questions, the answer, by whom, and whether the plan changed after it, from the
snapshots before and after: "changed: <what>" or "no change">

## What went well

## What went wrong

## To improve
```

Time and cost come from `run.json`'s turns; add a step's turns, never take a session's running total. "Answered for you" counts the answers by the config, "Asked you" those by the developer.

- ❌ `- The plan step's questions were good.`
- ✅ `- The plan step asked where the percent reaches full colour, which the request left open; the answer moved the full point to 90% (snapshots/02-plan-0-p.md:41 against snapshots/02-plan-1-p.md:41).`

A section with nothing in it says `None.` Never leave a placeholder in the shape.
