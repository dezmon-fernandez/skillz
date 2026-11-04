// Draws the status page from what view.ts read: the run list, the open run's header and steps, its tests and
// files, and the report on its own page. Every piece of HTML is a part in parts.html; this file only works out
// the values each part is filled with.

import { basename, join, resolve } from 'node:path';
import { waitingTurn } from './answers.ts';
import { md } from './markdown.ts';
import { loadRun, registered } from './run-folder.ts';
import { page, part } from './template.ts';
import { runData } from './view.ts';
import type { Alert, RunView, Step, StepView } from './types.ts';

const STATE_WORDS: Record<Step['state'], string> = {
  pending: 'not started', running: 'running', waiting: 'waiting on you', done: 'done', failed: 'failed'
};
const ALERT_NAMES: Record<Alert['kind'], string> = { failed: 'Failed', denied: 'Denied', blocked: 'Hook' };
const FILE_SIGNS: Record<string, string> = { added: '+', changed: '~', deleted: '−' };

const clip = (text: string, n: number) => (text.length <= n ? text : text.slice(0, n).replace(/\s+\S*$/, '').replace(/[,;:]+$/, '') + '…');
const minutes = (seconds: number) => (seconds >= 60 ? `${(seconds / 60).toFixed(1)} min` : `${Math.round(seconds)} s`);
const money = (n: number) => `$${n.toFixed(2)}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const clock = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const problems = (list: string[]) => list.map((text) => part('problem', { text })).join('');

// The whole page. Its script refreshes the open run from /live every 5 s in place. It never refreshes while you
// type an answer, or while text is selected, and it keeps what you opened or typed.
export function pageHtml(openRun: string | null): string {
  return page({ run: openRun ? basename(openRun) : '', live: liveHtml(openRun) });
}

// The part of the page that refreshes: the run list and the open run.
export function liveHtml(runDir: string | null): string {
  const now = Date.now();
  const updated = part('updated', { time: clock(new Date(now).toISOString()) });
  if (!runDir) return updated + runList(null);
  const view = runData(runDir, now);
  const run = view.run;
  if (!run) return updated + runList(runDir) + problems(view.problems);
  const finished = (run.state === 'done' || run.state === 'ended') && (run.report === 'written' || run.report === 'failed');
  const driverDown = !view.driverAlive && !finished;
  return updated + runList(runDir) + part('run', {
    name: run.name, started: clock(run.started), time: minutes(view.seconds), cost: money(view.cost), state: run.state,
    mode: part('mode', { run: run.id, speed: view.mode === 'speed' }),
    driverDown, dir: runDir,
    needsYou: !driverDown && (run.state === 'waiting' || run.state === 'failed'),
    needsWord: run.state === 'failed' ? 'Failed' : 'Waiting on you', reason: run.reason,
    problems: problems(view.problems),
    steps: view.steps.map((sv) => renderStep(view, sv, now)).join(''),
    hasReport: !!view.report, param: encodeURIComponent(run.id), reportWord: run.report === 'writing' ? 'being written' : 'not yet',
    tests: renderTests(view), files: renderFiles(view)
  });
}

// /report: the report on a page of its own.
export function reportHtml(text: string): string {
  return part('report-page', { report: md(text) });
}

function runList(open: string | null): string {
  const items = registered().map((dir) => {
    const run = loadRun(dir);
    const id = basename(dir);
    if (!run) return part('run-item-unreadable', { param: encodeURIComponent(id), id, file: join(dir, 'run.json') });
    const current = !!open && resolve(open) === resolve(dir);
    return part('run-item', { current, param: encodeURIComponent(id), name: run.name, started: clock(run.started), state: run.state });
  });
  return part('runs', { items: items.join('') });
}

function renderStep(view: RunView, sv: StepView, now: number): string {
  const s = sv.step;
  const runId = view.run!.id;
  const asked = sv.decisions.filter((d) => d.kind === 'answered').length;
  const open = s.state === 'waiting' || s.state === 'failed';
  return part('step', {
    state: s.state, id: s.id, label: s.label, icon: s.state === 'done' ? '✓' : s.state === 'failed' ? '✕' : '',
    started: s.state !== 'pending', time: minutes(sv.seconds), cost: money(s.turns.reduce((a, t) => a + (t.cost ?? 0), 0)),
    stateWords: STATE_WORDS[s.state],
    waitingSince: s.state === 'waiting' && s.turns.length > 0, since: s.turns.length ? clock(s.turns[s.turns.length - 1].ended ?? '') : '',
    manyTurns: s.turns.length > 1, turnCount: s.turns.length,
    hasDecisions: sv.decisions.length > 0, answered: asked, alone: sv.decisions.length - asked,
    hasTasks: !!sv.tasks, tasksDone: sv.tasks?.done.size ?? 0, tasksListed: sv.tasks?.listed.length ?? 0,
    file: s.file, reason: s.reason,
    turns: sv.turns.map((t, k) => renderTurn(runId, sv, t, k === sv.turns.length - 1 && open, now)).join(''),
    tasks: renderTasks(sv),
    hasEvents: sv.events.length > 0, events: sv.events.map((e) => part('event', { text: e.replace(/^\S+ turn \d+: /, '') })).join(''),
    problems: problems(sv.problems),
    answer: open ? answerForm(runId, sv) : ''
  });
}

// `openReply`: a step waiting on you shows its whole last reply open, since it is what you answer.
function renderTurn(runId: string, sv: StepView, t: StepView['turns'][number], openReply: boolean, now: number): string {
  const turn = t.turn;
  const running = turn.ended ? '' : t.agents.filter((a) => !a.done).map((a) => part('agent', {
    name: a.name, model: a.model, time: minutes(now / 1000 - a.start), calls: Object.values(a.calls).reduce((x, y) => x + y, 0), last: a.last
  })).join('');
  const done = t.agents.filter((a) => a.done);
  const notes = sv.notes.filter(([n]) => n === turn.n).map(([, text]) => text);
  const reply = t.reply ? md(t.reply) : '';
  return part('turn', {
    n: turn.n, isRetry: turn.retryOf !== undefined, retryOf: turn.retryOf ?? '', by: turn.by === 'developer' ? 'by you' : 'by config',
    meta: turn.ended ? `${minutes(turn.seconds ?? 0)} · ${turn.cost === null ? '-' : money(turn.cost)}` : 'running',
    prompt: clip(turn.prompt, 300),
    showNow: !turn.ended && (!!t.now || !!running), now: t.now, running,
    hasDone: done.length > 0, doneCount: plural(done.length, 'agent'), doneNames: done.map((a) => a.name.split(' ')[0]).join(', '),
    openReply: !!t.reply && openReply, foldedReply: !!t.reply && !openReply, reply, replyKey: `${runId}-${sv.step.id}-${turn.n}-reply`,
    hasAlerts: t.alerts.length > 0,
    alerts: t.alerts.map((a) => part('alert', { kind: a.kind, name: ALERT_NAMES[a.kind], text: clip(a.text, 200), who: a.who })).join(''),
    decisions: renderDecisions(sv, turn.n),
    hasNotes: notes.length > 0, notes: notes.map(md).join(''),
    notesComing: !notes.length && turn.watched === 'watching', watcherFailed: !notes.length && turn.watched === 'failed'
  });
}

function renderDecisions(sv: StepView, turn: number): string {
  const rows = sv.decisions.filter((d) => d.turn === turn);
  const question = ([text, rec]: [string, string]) => part('question', { text, hasRec: !!rec, rec: clip(rec, 240) });
  const out = rows.filter((d) => d.kind === 'answered').map((d) => part('answered', {
    count: d.questions.length, who: d.by === 'config' ? 'answered for you' : 'you answered', answer: clip(d.answer, 120),
    hasQuestions: d.questions.length > 0, questions: d.questions.map(question).join('')
  }));
  const alone = rows.filter((d) => d.kind === 'decided-alone');
  if (alone.length) out.push(part('decided-alone', { count: alone.length, items: alone.flatMap((d) => d.questions.map(question)).join('') }));
  return out.join('');
}

function renderTasks(sv: StepView): string {
  if (!sv.tasks) return '';
  const { listed, done, doing, merged } = sv.tasks;
  const items = listed.map(([id, title]) => {
    const row = merged[id];
    return part('task', {
      mark: done.has(id) ? 'done' : doing.has(id) ? 'doing' : 'todo', id, title,
      hasRow: !!row, time: row ? minutes(row.time) : '',
      hasFailed: !!row?.failed.length, failedTitle: row ? row.failed.map((f) => f.slice(0, 200)).join('\n') : '',
      failedCount: plural(row?.failed.length ?? 0, 'call')
    });
  }).join('');
  return part('tasks', { done: done.size, listed: listed.length, plan: basename(sv.plan), items });
}

function answerForm(runId: string, sv: StepView): string {
  const s = sv.step;
  // The turn page.ts checks an answer against.
  const n = waitingTurn(s);
  const hidden = part('answer-hidden', { run: runId, step: s.id, turn: n });
  if (s.state === 'failed') return part('answer-failed', { hidden });
  return part('answer-reply', { hidden, id: `answer-${s.id}`, label: s.label, key: `${runId}-${s.id}-${n}` });
}

function renderTests(view: RunView): string {
  if (!view.tests.length) return part('tests-none');
  return view.tests.map(([path, names]) => part('test-file', {
    key: `${view.run!.id}-tests-${path}`, path, count: names.length,
    items: names.map(([says, doc]) => part('test', { says, doc })).join('')
  })).join('');
}

function renderFiles(view: RunView): string {
  if (!view.files.length) return part('files-none');
  return part('files', {
    items: view.files.map(([kind, path, added, removed]) => part('file', { kind, sign: FILE_SIGNS[kind], path, added, removed })).join('')
  });
}
