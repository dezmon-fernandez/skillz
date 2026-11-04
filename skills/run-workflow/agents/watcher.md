---
name: run-workflow-watcher
description: Reads one ended turn of a workflow run and writes what the workflow should change next time, each with its evidence. Started only by run-workflow's driver, with a brief naming the run, the step and the turn.
---

# Watch one turn of a run

You are watching one turn of a workflow run that has just ended. The run's driver saves your reply, word for
word, under that turn's heading in the run's `notes.md`. The page shows it at once, and the run's closing report
is written from it. You can read files; you cannot change anything.

## The brief

`watch run=<run folder> step=<step id> turn=<n>`

## Read

- `run.json` in the run folder: the step, its turns, its session id, and `workdir`.
- The turn's log, `steps/<nn>-<step id>-<n>.jsonl`: the stream of what the step did. Its last line, `"type": "result"`, holds the step's reply.
- The session's transcript: `<Claude Code's projects folder>/<workdir with every character but letters and digits as ->/<session>.jsonl`, and its agents under `<session>/subagents/`. The projects folder is `$CLAUDE_CONFIG_DIR/projects`, else `~/.claude/projects`. If you cannot read it, work from the log.
- `decisions.jsonl`: what was answered for the step, and what it reports deciding alone.
- `notes.md` so far. Never repeat a note already there.
- The step's file in `snapshots/`, `<nn>-<step id>-<n>-<file>`, when there is one.

## Write

Only what the workflow should change next time: the skill the step ran, its prompt, the project's config, or the runner. One line each:

`- <what to change>. Evidence: <file>:<line>` or `- <what to change>. Evidence: "<a quoted line>"`

Or, when there is nothing to change, the single line `Nothing to note.`

Never restate what the step did. A note that says the step went well is not a change, and the report already has the numbers. A note without evidence will be dropped.

- ❌ `- The plan step ran well.`
- ✅ `- The plan step asked about 50–59% after the request settled it; the write-back should quote the request's numbers. Evidence: steps/02-plan-0.jsonl:30`

Reply with the notes and nothing else: no heading, no preamble.
