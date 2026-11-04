// What the page shows of one run, read from its folder, its step logs, the session transcripts and its workdir.
// render.ts draws it. Reading never changes the run, and one file it cannot read becomes a problem line, never a
// blank page.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { alertsIn } from './alerts.ts';
import { readDecisions, readMode } from './answers.ts';
import { filesTouched, testsAdded } from './changes.ts';
import { label, lines, replyOf, stamp, transcriptPath } from './log.ts';
import { questions } from './questions.ts';
import { driverAlive, loadRun } from './run-folder.ts';
import { agents, planInPrompt, taskState } from './tasks.ts';
import type { RunView, StepView } from './types.ts';

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
      notes: [], events: [], problems: []
    };
    const head = `${String(i + 1).padStart(2, '0')} ${step.label}, turn `;
    sv.notes = notes.filter(([h]) => h.startsWith(head)).map(([h, body]) => [Number(h.slice(head.length)), body]);
    sv.events = events.map((e) => e.replace(/^\S+ /, '')).filter((e) => e.startsWith(`${step.id} turn `));
    const transcript = step.session ? lines(transcriptPath(run.workdir, step.session)) : [];
    const subagents = step.session ? join(transcriptPath(run.workdir, step.session).replace(/\.jsonl$/, ''), 'subagents') : '';
    for (const turn of step.turns) {
      view.cost += turn.cost ?? 0;
      view.seconds += turn.seconds ?? (turn.ended ? 0 : Math.max(0, (now - Date.parse(turn.started)) / 1000));
      const file = join(runDir, turn.log);
      if (!existsSync(file)) {
        if (turn.ended) sv.problems.push(`could not read ${turn.log}`);
        sv.turns.push({ turn, reply: '', questions: [], alerts: [], agents: [], now: '' });
        continue;
      }
      const log = lines(file);
      const reply = replyOf(log);
      let stepText = '';
      try {
        stepText = readFileSync(file, 'utf8');
      } catch {
        sv.problems.push(`could not read ${turn.log}`);
      }
      const mine = log.filter((e) => e.type === 'assistant' && !e.parent_tool_use_id)
        .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : [])).filter((b: any) => b?.type === 'tool_use');
      sv.turns.push({
        turn, reply, questions: reply ? questions(reply) : [], alerts: alertsIn(log, step.label),
        agents: subagents ? agents(subagents, stepText) : [], now: turn.ended ? '' : mine.length ? label(mine[mine.length - 1]) : ''
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

// notes.md's sections, "## <nn> <label>, turn <n>", as (heading, body).
function noteSections(text: string): [string, string][] {
  const out: [string, string][] = [];
  for (const part of text.split(/^## /m).slice(1)) {
    const [heading, ...body] = part.split('\n');
    out.push([heading.trim(), body.join('\n').trim()]);
  }
  return out;
}

function readText(file: string, problems: string[], name: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') problems.push(`could not read ${name}`);
    return '';
  }
}
