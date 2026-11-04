// Draws the status page from what view.ts read: the run list, the open run's header and steps, its tests and
// files, and the report on its own page. Every piece of HTML is a part in parts.html; this file only works out
// the values each part is filled with.

import { basename, join, resolve } from 'node:path';
import { waitingTurn } from './answers.ts';
import { md } from './markdown.ts';
import { loadRun, registered } from './run-folder.ts';
import { page, part } from './template.ts';
import { runData } from './view.ts';
import type { Alert, Answered, RunView, Step, StepView, TurnView } from './types.ts';

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

// The whole page. Its script refreshes the runs on screen from /live every 5 s in place, asking for the same runs.
// It never refreshes while you type an answer, or while text is selected, and it keeps what you opened or typed.
export function pageHtml(runDirs: string[]): string {
  const ids = runDirs.map((d) => basename(d));
  const query = ids.length > 1 ? ids.map((id) => `runs=${encodeURIComponent(id)}`).join('&') : ids.length ? `run=${encodeURIComponent(ids[0])}` : '';
  return page({ query, live: liveHtml(runDirs) });
}

// The part of the page that refreshes: the run list, and the open run or, for several, one column each. A folder
// that is not in the registry is named as a problem, never read.
export function liveHtml(runDirs: string[]): string {
  const now = Date.now();
  const updated = part('updated', { time: clock(new Date(now).toISOString()) });
  const known = new Set(registered().map((d) => resolve(d)));
  const onScreen = runDirs.map((d) => basename(d)).join(',');
  const body = (dir: string) => (known.has(resolve(dir)) ? runBody(dir, now, onScreen) : problems([`no run ${basename(dir)} on this Mac`]));
  const list = runList(runDirs.filter((d) => known.has(resolve(d))));
  if (runDirs.length <= 1) return updated + list + (runDirs.length ? body(runDirs[0]) : '');
  return updated + list + part('columns', {
    columns: runDirs.map((d) => part('column', { label: basename(d), body: body(d) })).join('')
  });
}

// One run's view: its header, steps, report, tests and files. Alone or in a column, it is drawn the same.
// `onScreen`: the ids of the runs on screen, so a form sent from this run returns to the same view.
function runBody(runDir: string, now: number, onScreen: string): string {
  const view = runData(runDir, now);
  const run = view.run;
  if (!run) return problems(view.problems);
  const finished = (run.state === 'done' || run.state === 'ended') && (run.report === 'written' || run.report === 'failed');
  const driverDown = !view.driverAlive && !finished;
  return part('run', {
    name: run.name, started: clock(run.started), time: minutes(view.seconds), cost: money(view.cost), state: run.state,
    mode: part('mode', { run: run.id, autonomous: view.mode === 'autonomous', view: onScreen }),
    driverDown, dir: runDir,
    needsYou: !driverDown && (run.state === 'waiting' || run.state === 'failed'),
    needsWord: run.state === 'failed' ? 'Failed' : 'Waiting on you', reason: run.reason,
    problems: problems(view.problems),
    steps: view.steps.map((sv) => renderStep(view, sv, now, onScreen)).join(''),
    hasReport: !!view.report, param: encodeURIComponent(run.id), reportWord: run.report === 'writing' ? 'being written' : 'not yet',
    tests: renderTests(view), files: renderFiles(view)
  });
}

// /report: the report on a page of its own.
export function reportHtml(text: string): string {
  return part('report-page', { report: md(text) });
}

// Every run, each with a box: the boxes ticked open those runs side by side. The runs on screen are ticked.
function runList(open: string[]): string {
  const on = new Set(open.map((d) => resolve(d)));
  const items = registered().map((dir) => {
    const run = loadRun(dir);
    const id = basename(dir);
    const current = on.has(resolve(dir));
    if (!run) return part('run-item-unreadable', { current, param: encodeURIComponent(id), id, file: join(dir, 'run.json') });
    return part('run-item', { current, param: encodeURIComponent(id), id, name: run.name, started: clock(run.started), state: run.state });
  });
  return part('runs', { items: items.join('') });
}

function renderStep(view: RunView, sv: StepView, now: number, onScreen: string): string {
  const s = sv.step;
  const runId = view.run!.id;
  const asked = sv.decisions.filter((d) => d.kind === 'answered').length;
  const open = s.state === 'waiting' || s.state === 'failed';
  return part('step', {
    state: s.state, run: runId, id: s.id, label: s.label, icon: s.state === 'done' ? '✓' : s.state === 'failed' ? '✕' : '',
    started: s.state !== 'pending', time: minutes(sv.seconds), cost: money(s.turns.reduce((a, t) => a + (t.cost ?? 0), 0)),
    stateWords: STATE_WORDS[s.state],
    waitingSince: s.state === 'waiting' && s.turns.length > 0, since: s.turns.length ? clock(s.turns[s.turns.length - 1].ended ?? '') : '',
    manyTurns: s.turns.length > 1, turnCount: s.turns.length,
    hasDecisions: sv.decisions.length > 0, answered: asked, alone: sv.decisions.length - asked,
    hasTasks: !!sv.tasks, tasksDone: sv.tasks?.done.size ?? 0, tasksListed: sv.tasks?.listed.length ?? 0,
    file: s.file, reason: s.reason,
    turns: sv.turns.map((t, k) => renderTurn(runId, sv, t, k === sv.turns.length - 1 && open, stoppedAt(sv, k), now)).join(''),
    tasks: renderTasks(sv),
    hasEvents: sv.events.length > 0, events: sv.events.map((e) => part('event', { text: e.replace(/^\S+ turn \d+: /, '') })).join(''),
    problems: problems(sv.problems),
    answer: open ? answerForm(runId, sv, onScreen) : ''
  });
}

// Whether turn k stopped for an answer: one was sent after it, or the step is waiting on it. A retry resends a turn
// that failed, so it answers nothing.
function stoppedAt(sv: StepView, k: number): boolean {
  const next = sv.step.turns[k + 1];
  if (next) return next.retryOf === undefined;
  return sv.step.state === 'waiting';
}

// "took 3 of 4 recommendations · differed on Q2 Edge cases"
const answeredWords = (a: Answered) => `took ${a.took} of ${plural(a.of, 'recommendation')}${a.differed.length ? ` · differed on ${a.differed.join(', ')}` : ''}`;

// Replies in order, a thin rule between each two.
const replyList = (replies: string[]) => replies.map((r) => part('reply', { html: md(r) })).join(part('reply-rule'));

// `openReply`: a step waiting on you shows its whole last reply open, since it is what you answer; the replies the
// turn gave before it, while its agents worked, are folded above it.
function renderTurn(runId: string, sv: StepView, t: TurnView, openReply: boolean, stopped: boolean, now: number): string {
  const turn = t.turn;
  const running = turn.ended ? '' : t.agents.filter((a) => !a.done).map((a) => part('agent', {
    name: a.name, model: a.model, time: minutes(now / 1000 - a.start), calls: Object.values(a.calls).reduce((x, y) => x + y, 0), last: a.last
  })).join('');
  const done = t.agents.filter((a) => a.done);
  // An ended turn lists every agent it started, each with how it ended.
  const ended = turn.ended ? t.agents.map((a) => part('agent-line', {
    name: a.name, model: a.model, time: minutes(a.end - a.start), calls: Object.values(a.calls).reduce((x, y) => x + y, 0),
    how: a.done ? 'finished' : 'did not finish'
  })).join('') : '';
  const notes = sv.notes.filter(([n]) => n === turn.n).map(([, text]) => text);
  const has = t.replies.length > 0;
  const earlier = t.replies.slice(0, -1);
  return part('turn', {
    n: turn.n, isRetry: turn.retryOf !== undefined, retryOf: turn.retryOf ?? '', by: turn.by === 'developer' ? 'by you' : 'by config',
    meta: turn.ended ? `${minutes(turn.seconds ?? 0)} · ${turn.cost === null ? '-' : money(turn.cost)}` : 'running',
    prompt: clip(turn.prompt, 300),
    stopped: stopped && !!turn.stop, part: turn.stop?.part ?? '', why: turn.stop?.why ?? '',
    hasAnswered: !!turn.answered, answered: turn.answered ? answeredWords(turn.answered) : '',
    showNow: !turn.ended && (!!t.now || !!running), now: t.now, running,
    hasDone: !turn.ended && done.length > 0, ended, doneCount: plural(done.length, 'agent'), doneNames: done.map((a) => a.name.split(' ')[0]).join(', '),
    openReply: has && openReply, foldedReply: has && !openReply, replyKey: `${runId}-${sv.step.id}-${turn.n}-reply`,
    earlier: replyList(earlier), earlierWord: earlier.length === 1 ? 'Its earlier reply' : `Its ${earlier.length} earlier replies`,
    last: has ? md(t.replies[t.replies.length - 1]) : '', replies: replyList(t.replies),
    replyWord: t.replies.length > 1 ? `Read its ${t.replies.length} replies` : 'Read its reply',
    hasAlerts: t.alerts.length > 0,
    alerts: t.alerts.map((a) => part('alert', { kind: a.kind, name: ALERT_NAMES[a.kind], text: clip(a.text, 200), who: a.who })).join(''),
    decisions: renderDecisions(sv, t),
    hasNotes: notes.length > 0, notes: notes.map(md).join(''),
    notesComing: !notes.length && turn.watched === 'watching', watcherFailed: !notes.length && turn.watched === 'failed'
  });
}

// What was answered at the turn's stop: its questions read from the turn's log, as the driver logs them now, or those
// the decision logged when the log yields none. A run logged before the grill's questions were read shows them too.
function renderDecisions(sv: StepView, t: TurnView): string {
  const rows = sv.decisions.filter((d) => d.turn === t.turn.n);
  const question = ([text, rec]: [string, string]) => part('question', { text, hasRec: !!rec, rec: clip(rec, 240) });
  const out = rows.filter((d) => d.kind === 'answered').map((d) => {
    const asked = t.questions.length ? t.questions : d.questions;
    return part('answered', {
      count: asked.length, who: d.by === 'config' ? 'answered for you' : 'you answered', answer: clip(d.answer, 120),
      hasQuestions: asked.length > 0, questions: asked.map(question).join('')
    });
  });
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

function answerForm(runId: string, sv: StepView, onScreen: string): string {
  const s = sv.step;
  // The turn page.ts checks an answer against.
  const n = waitingTurn(s);
  const hidden = part('answer-hidden', { run: runId, step: s.id, turn: n, view: onScreen });
  if (s.state === 'failed') return part('answer-failed', { hidden });
  return part('answer-reply', { hidden, id: `answer-${runId}-${s.id}`, label: s.label, key: `${runId}-${s.id}-${n}` });
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
