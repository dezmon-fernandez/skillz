// Answers, decisions and mode: whether a turn that ended needs an answer, where that answer comes from (the
// config's list in autonomous mode, the developer on the page in human approval), and the log of every answer sent
// and every call a step made alone.
//
// The page writes answers/ and mode; the driver reads them and is the only writer of decisions.jsonl.

import { appendFileSync, linkSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { finished } from './finished.ts';
import { lines, repliesOf, replyOf } from './log.ts';
import { decided, openQuestions } from './questions.ts';
import { seams } from './launch.ts';
import { saveRun, writeAtomic } from './run-folder.ts';
import type { Action, Answer, By, Config, Decision, Mode, Run, Step, StepConfig, Turn } from './types.ts';

// ── The mode ──

// A run started before the modes were renamed wrote "speed" or "slot-in"; slot-in was human approval.
export function readMode(runDir: string): Mode {
  try {
    const mode = readFileSync(join(runDir, 'mode'), 'utf8').trim();
    return mode === 'human-approval' || mode === 'slot-in' ? 'human-approval' : 'autonomous';
  } catch {
    return 'autonomous';
  }
}

export function writeMode(runDir: string, mode: Mode): void {
  writeAtomic(join(runDir, 'mode'), mode + '\n');
}

// ── The answer files ──

const answerFile = (runDir: string, step: string, turn: number) => join(runDir, 'answers', `${step}-${turn}.json`);

// A double click or a second tab sends the same answer twice. link() refuses an existing name, so only the first
// save creates the file, and the file is whole the moment it appears.
export function saveAnswer(runDir: string, step: string, turn: number, answer: Answer): boolean {
  mkdirSync(join(runDir, 'answers'), { recursive: true });
  const final = answerFile(runDir, step, turn);
  const temp = `${final}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(temp, JSON.stringify(answer) + '\n');
  try {
    linkSync(temp, final);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  } finally {
    unlinkSync(temp);
  }
}

export function readAnswer(runDir: string, step: string, turn: number): Answer | null {
  try {
    return JSON.parse(readFileSync(answerFile(runDir, step, turn), 'utf8')) as Answer;
  } catch {
    return null;
  }
}

// The turn an answer for the step is keyed by: its last turn, or 0 for a step that failed before any was sent.
export const waitingTurn = (step: Step) => (step.turns.length ? step.turns[step.turns.length - 1].n : 0);

// ── The decisions log ──

export function appendDecision(runDir: string, decision: Decision): void {
  appendFileSync(join(runDir, 'decisions.jsonl'), JSON.stringify(decision) + '\n');
}

export function readDecisions(runDir: string): Decision[] {
  let text: string;
  try {
    text = readFileSync(join(runDir, 'decisions.jsonl'), 'utf8');
  } catch {
    return [];
  }
  const out: Decision[] = [];
  for (const row of text.split('\n')) {
    if (!row.trim()) continue;
    try {
      out.push(JSON.parse(row));
    } catch {
      // A half-written line is the one being appended; the next read has it.
    }
  }
  return out;
}

// With no answer, what the last reply decided alone; with one, the answer and the open questions it accepted.
export function logDecisions(runDir: string, step: Step, turn: Turn, replies: string[], answer: string | null, by: By): void {
  const at = new Date().toISOString();
  const evidence = `${turn.log}:${resultLine(runDir, turn.log)}`;
  if (answer === null) {
    for (const item of decided(replies[replies.length - 1] ?? '')) {
      appendDecision(runDir, { at, step: step.id, turn: turn.n, kind: 'decided-alone', questions: [item], answer: '', by, evidence });
    }
    return;
  }
  appendDecision(runDir, { at, step: step.id, turn: turn.n, kind: 'answered', questions: openQuestions(replies), answer, by, evidence });
}

// The line number of the turn's result line in its log, for a decision's evidence.
function resultLine(runDir: string, log: string): number {
  let rows: string[];
  try {
    rows = readFileSync(join(runDir, log), 'utf8').split('\n');
  } catch {
    return 0;
  }
  for (let k = rows.length - 1; k >= 0; k--) {
    try {
      if (JSON.parse(rows[k]).type === 'result') return k + 1;
    } catch {
      // Not a JSON line.
    }
  }
  return 0;
}

// ── Whether a turn needs an answer, and which ──

// `asks`: whether the turn left open questions (openQuestions).
export function needsAnswer(step: StepConfig, done: boolean, asks: boolean, mode: Mode): boolean {
  if (!done) return true;
  if (mode === 'human-approval') return asks;
  return !!step.answerIfAsks && asks;
}

// The config's answer for the step's next stop, or null when they are used up. The k-th stop takes answers[k],
// whoever answered the stops before it, so a stop the developer answered uses its entry. A retried turn resends
// an answer, so it is no new stop.
export function nextConfigAnswer(step: Step, sc: StepConfig): string | null {
  const stops = step.turns.filter((t) => t.n > 0 && t.retryOf === undefined).length;
  return sc.answers?.[stops] ?? null;
}

// Whether the waiting step's last turn needs an answer in autonomous mode. Human approval holds a finished step
// whose reply asks; autonomous moves it on, unless the step answers when its reply asks.
function asksWhenAutonomous(runDir: string, run: Run, sc: StepConfig, step: Step): boolean {
  const turn = step.turns[step.turns.length - 1];
  if (!turn) return true;
  const events = lines(join(runDir, turn.log));
  const done = finished(sc, replyOf(events), run.workdir, Date.parse(run.started))[0];
  return needsAnswer(sc, done, openQuestions(repliesOf(events)).length > 0, 'autonomous');
}

// Polls every pollMs: the page's answer file for the waiting turn; and, for a waiting step in autonomous mode, what
// autonomous would have done when its turn ended: move on, or send the config's answer if one is left (a switch to
// autonomous answers a stop already waiting). A failed step takes only Retry or End. Null when the driver's patience
// runs out first.
export async function waitForAnswer(runDir: string, run: Run, config: Config, stepIndex: number):
  Promise<{ answer: Answer; by: By } | null> {
  const step = run.steps[stepIndex];
  const sc = config.steps[stepIndex];
  const n = waitingTurn(step);
  const until = Date.now() + seams.patience;
  for (;;) {
    const answer = readAnswer(runDir, step.id, n);
    if (answer && (step.state !== 'failed' || answer.kind === 'retry' || answer.kind === 'end')) {
      if (answer.kind !== 'reply' || answer.text) return { answer, by: 'developer' };
    }
    if (step.state === 'waiting' && readMode(runDir) === 'autonomous') {
      const at = new Date().toISOString();
      if (!asksWhenAutonomous(runDir, run, sc, step)) return { answer: { kind: 'go-on', text: '', at }, by: 'config' };
      const text = nextConfigAnswer(step, sc);
      if (text !== null) return { answer: { kind: 'reply', text, at }, by: 'config' };
    }
    if (Date.now() >= until) return null;
    await new Promise((done) => setTimeout(done, Math.min(seams.pollMs, Math.max(1, until - Date.now()))));
  }
}

// A developer's answer, or the config's after a switch to autonomous, applied to the waiting step. Returns the turn to
// send now, or null.
export function applyAnswer(runDir: string, run: Run, i: number, answer: Answer, by: By): Action | null {
  const step = run.steps[i];
  const turn = step.turns[step.turns.length - 1];
  if (answer.kind === 'end') {
    run.state = 'ended';
    run.reason = `ended by the developer at ${step.label}`;
    saveRun(runDir, run);
    return null;
  }
  if (answer.kind === 'go-on') {
    step.state = 'done';
    step.reason = by === 'developer' ? 'moved on by the developer' : '';
    run.state = 'running';
    run.reason = '';
    saveRun(runDir, run);
    return null;
  }
  if (answer.kind === 'retry') {
    if (!turn) {
      // Nothing was sent, so the step is tried from its prompt again. Its answer key is reused by the next
      // failure, so this one is set aside.
      renameSync(answerFile(runDir, step.id, 0), join(runDir, 'answers', `${step.id}-0.used-${Date.now()}.json`));
      step.state = 'pending';
      step.reason = '';
      run.state = 'running';
      run.reason = '';
      saveRun(runDir, run);
      return null;
    }
    return { kind: 'send', stepIndex: i, prompt: turn.prompt, by: turn.by, retryOf: turn.n };
  }
  logDecisions(runDir, step, turn, repliesOf(lines(join(runDir, turn.log))), answer.text, by);
  return { kind: 'send', stepIndex: i, prompt: answer.text, by };
}
