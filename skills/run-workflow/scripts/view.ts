// What the page shows of one run, read from its folder, its step logs, the session transcripts and its workdir.
// render.ts draws it. Reading never changes the run, and one file it cannot read becomes a problem line, never a
// blank page.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDecisions, readMode } from './answers.ts';
import { filesTouched, testsAdded } from './changes.ts';
import { contentOf, label, lines, repliesOf, stamp, subagentsOf, transcriptPath } from './log.ts';
import { openQuestions } from './questions.ts';
import { driverAlive, loadRun } from './run-folder.ts';
import { agents, planInPrompt, taskState } from './tasks.ts';
import { noteHeading } from './watcher.ts';
import type { Alert, Event, RunView, StepView } from './types.ts';

export function runData(runDir: string, now: number): RunView {
  const view: RunView = {
    run: null, dir: runDir, mode: readMode(runDir), driverAlive: driverAlive(runDir), steps: [], files: [], tests: [],
    report: null, seconds: 0, cost: 0, problems: []
  };
  const run = loadRun(runDir);
  if (!run) {
    view.problems.push(`could not read ${join(runDir, 'run.json')}`);
    return view;
  }
  view.run = run;
  const decisions = readDecisions(runDir);
  const notes = noteSections(readText(join(runDir, 'notes.md'), view.problems, 'notes.md'));
  const events = readText(join(runDir, 'events.log'), view.problems, 'events.log').split('\n').filter(Boolean);
  const report = readText(join(runDir, 'report.md'), view.problems, 'report.md');
  view.report = report || null;
  run.steps.forEach((step, i) => {
    const sv: StepView = {
      step, turns: [], tasks: null, plan: '', decisions: decisions.filter((d) => d.step === step.id),
      notes: [], events: [], problems: [], seconds: 0
    };
    sv.notes = notes.flatMap(([heading, body]): [number, string][] => {
      const turn = step.turns.find((t) => noteHeading(i, step.label, t.n) === heading);
      return turn ? [[turn.n, body]] : [];
    });
    sv.events = events.map((e) => e.replace(/^\S+ /, '')).filter((e) => e.startsWith(`${step.id} turn `));
    const transcript = step.session ? lines(transcriptPath(run.workdir, step.session)) : [];
    const subagents = step.session ? subagentsOf(transcriptPath(run.workdir, step.session)) : '';
    for (const turn of step.turns) {
      // A turn still running counts up to now.
      const seconds = turn.seconds ?? (turn.ended ? 0 : Math.max(0, (now - Date.parse(turn.started)) / 1000));
      sv.seconds += seconds;
      view.seconds += seconds;
      view.cost += turn.cost ?? 0;
      const file = join(runDir, turn.log);
      if (!existsSync(file)) {
        if (turn.ended) sv.problems.push(`could not read ${turn.log}`);
        sv.turns.push({ turn, replies: [], questions: [], alerts: [], agents: [], now: '' });
        continue;
      }
      const log = lines(file);
      const replies = repliesOf(log);
      const mine = log.filter((e) => e.type === 'assistant' && !e.parent_tool_use_id)
        .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : [])).filter((b: any) => b?.type === 'tool_use');
      sv.turns.push({
        turn, replies, questions: openQuestions(replies), alerts: alertsIn(log, step.label),
        agents: subagents ? agents(subagents, log) : [], now: turn.ended ? '' : mine.length ? label(mine[mine.length - 1]) : ''
      });
    }
    const first = step.turns[0];
    const plan = first ? planInPrompt(first.prompt, run.workdir) : null;
    if (plan && first) {
      const last = step.turns[step.turns.length - 1];
      const from = Date.parse(first.started) / 1000 - 5;
      const to = (last.ended ? Date.parse(last.ended) : now) / 1000 + 5;
      const window = transcript.filter((e) => {
        const t = stamp(e);
        return t !== null && t >= from && t <= to;
      });
      sv.plan = plan;
      sv.tasks = taskState(plan, window, sv.turns.flatMap((t) => t.agents), step.state === 'running');
    }
    view.steps.push(sv);
  });
  view.files = filesTouched(run.workdir, run.base);
  view.tests = testsAdded(run.workdir, run.base);
  return view;
}

// notes.md's sections, "## <noteHeading>", as (heading, body).
function noteSections(text: string): [string, string][] {
  const out: [string, string][] = [];
  for (const part of text.split(/^## /m).slice(1)) {
    const [heading, ...body] = part.split('\n');
    out.push([heading.trim(), body.join('\n').trim()]);
  }
  return out;
}

// What the run's rules stopped in one step's log: a denied call or a hook that blocked one. The log carries the
// agents' calls too, marked with the call that started them.
export function alertsIn(events: Event[], step: string): Alert[] {
  const uses: Record<string, Event> = {};
  const out: Alert[] = [];
  for (const e of events) {
    const who = e.parent_tool_use_id ? 'an agent' : 'the session';
    // A denied shell command arrives as its own system event, with no tool result after it.
    if (e.type === 'system' && e.subtype === 'permission_denied') {
      const use = uses[e.tool_use_id ?? ''];
      out.push({ kind: 'denied', step, who, text: use ? label(use) : String(e.message_text ?? '').slice(0, 160) });
      continue;
    }
    for (const b of contentOf(e)) {
      if (e.type === 'assistant' && b?.type === 'tool_use') {
        uses[b.id ?? ''] = b;
      } else if (e.type === 'user' && b?.type === 'tool_result' && b.is_error) {
        const text = resultText(b);
        const use = uses[b.tool_use_id ?? ''];
        if (text.includes('denied by your permission settings') || (text.includes('Permission to use') && text.includes('denied'))) {
          out.push({ kind: 'denied', step, who, text: use ? label(use) : text.slice(0, 160) });
        } else if (text.includes('hook error') || text.includes('Blocked')) {
          // A hook's block arrives as "PreToolUse:Bash hook error: [<command>]: <its stderr>"; the stderr is the reason.
          const reason = /[\w-]*:? ?\bblocked\b[^\n]*/i.exec(text);
          out.push({ kind: 'blocked', step, who, text: `${use ? label(use) : ''}. ${reason ? reason[0] : ''}`.slice(0, 260) });
        }
      }
    }
  }
  return out;
}

function resultText(block: Event): string {
  const content = block.content;
  if (Array.isArray(content)) return content.filter((c) => c && typeof c === 'object').map((c) => c.text ?? '').join('\n');
  return String(content ?? '');
}

function readText(file: string, problems: string[], name: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') problems.push(`could not read ${name}`);
    return '';
  }
}
