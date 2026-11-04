// The driver: the detached process `run.ts drive <run>` that works one run through its steps. It holds the run's
// lock, asks nextAction() what to do, sends a turn or waits for an answer, judges each turn that ends, and writes
// the report once every step is done or the run is ended. Only one driver works a run at a time.

import { copyFileSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { applyAnswer, logDecisions, needsAnswer, nextConfigAnswer, readMode, waitForAnswer } from './answers.ts';
import { finished, newestMatch } from './finished.ts';
import { initOf, lines, repliesOf, replyOf, resultOf } from './log.ts';
import { openQuestions } from './questions.ts';
import { seams } from './launch.ts';
import { aliveAs, driverAlive, loadRun, saveRun, stdout } from './run-folder.ts';
import { recordEnd, runTurn } from './turn.ts';
import { watchdog } from './watchdog.ts';
import { startWatcher, writeReport } from './watcher.ts';
import type { Action, Config, Event, Run, Step, StepConfig, Turn } from './types.ts';

const STOP: Action = { kind: 'stop', stepIndex: null, prompt: '', by: 'config' };
const REPORT: Action = { kind: 'report', stepIndex: null, prompt: '', by: 'config' };
const waitOn = (i: number): Action => ({ kind: 'wait', stepIndex: i, prompt: '', by: 'config' });

class MissingFile extends Error {
  step: string;
  constructor(step: string, label: string) {
    super(`{file:${step}} has nothing to name: the ${label} step left no file`);
    this.step = step;
  }
}

const configOf = (runDir: string): Config => JSON.parse(readFileSync(join(runDir, 'config.json'), 'utf8'));
const requestOf = (runDir: string): string => readFileSync(join(runDir, 'request.md'), 'utf8');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const clipText = (text: string, n: number) => (text.length <= n ? text : text.slice(0, n) + '…');

export async function drive(runDir: string): Promise<number> {
  runDir = resolve(runDir);
  if (!takeLock(runDir)) return 0;
  const run = loadRun(runDir);
  if (!run) {
    releaseLock(runDir);
    console.error(`no run in ${runDir}`);
    return 1;
  }
  const watchers: Promise<void>[] = [];
  run.driverPid = process.pid;
  saveRun(runDir, run);
  try {
    // Read inside the try, so a config.json that cannot be read fails the run with its reason.
    const config = configOf(runDir);
    let queued: Action | null = null;
    for (;;) {
      const action: Action = queued ?? nextAction(run, runDir);
      queued = null;
      if (action.kind === 'stop') break;
      if (action.kind === 'report') {
        await writeReport(runDir, run, config, watchers);
        break;
      }
      const i = action.stepIndex!;
      if (action.kind === 'running') {
        // The driver that started the turn took its watchdog with it: a dev server the turn left running would
        // hold it forever.
        const step = run.steps[i];
        watchdog(runDir, run, config, i, step.turns[step.turns.length - 1]);
        await new Promise((done) => setTimeout(done, seams.pollMs));
        continue;
      }
      if (action.kind === 'send' || action.kind === 'ended') {
        const turn = action.kind === 'send'
          ? await runTurn(runDir, run, config, i, action.prompt, action.by, action.retryOf)
          : run.steps[i].turns[run.steps[i].turns.length - 1];
        watchers.push(startWatcher(runDir, run, config, i, turn));
        queued = afterTurn(runDir, run, config, i, turn);
        continue;
      }
      const got = await waitForAnswer(runDir, run, config, i);
      // Nobody answered within the driver's patience: it stops, and resume picks the wait up.
      if (!got) break;
      queued = applyAnswer(runDir, run, i, got.answer, got.by);
    }
  } catch (error) {
    run.state = 'failed';
    run.reason = `the driver failed: ${(error as Error).message}; see driver.log`;
    console.error((error as Error).stack);
  } finally {
    run.driverPid = null;
    saveRun(runDir, run);
    releaseLock(runDir);
  }
  return 0;
}

// ── The lock ──

export function takeLock(runDir: string): boolean {
  const file = join(runDir, 'driver.pid');
  for (let tries = 0; tries < 2; tries++) {
    try {
      writeFileSync(file, `${process.pid}\n`, { flag: 'wx' });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    let text = '';
    let young = false;
    try {
      text = readFileSync(file, 'utf8').trim();
      young = seams.now() - statSync(file).mtimeMs < 2000;
    } catch {
      continue;
    }
    // An empty file this young is another driver between creating it and writing its pid.
    if (Number(text) === process.pid || driverAlive(runDir) || (!text && young)) return false;
    rmSync(file, { force: true });
  }
  return false;
}

function releaseLock(runDir: string): void {
  const file = join(runDir, 'driver.pid');
  try {
    if (Number(readFileSync(file, 'utf8').trim()) === process.pid) rmSync(file);
  } catch {
    // Already gone.
  }
}

// ── What to do next ──

export function nextAction(run: Run, runDir: string): Action {
  if (run.state === 'ended') return run.report === 'written' || run.report === 'failed' ? STOP : REPORT;
  const i = run.steps.findIndex((s) => s.state !== 'done');
  if (i < 0) {
    if (run.state !== 'done') {
      run.state = 'done';
      run.reason = '';
      saveRun(runDir, run);
    }
    return run.report === 'written' || run.report === 'failed' ? STOP : REPORT;
  }
  const step = run.steps[i];
  if (step.state === 'pending' || (step.state === 'running' && !step.turns.length)) {
    try {
      const prompt = fillPrompt(configOf(runDir).steps[i].prompt, requestOf(runDir), run);
      return { kind: 'send', stepIndex: i, prompt, by: 'config' };
    } catch (error) {
      if (!(error instanceof MissingFile)) throw error;
      step.state = 'failed';
      step.reason = error.message;
      run.state = 'failed';
      run.reason = `${step.label} was not sent: ${error.message}`;
      saveRun(runDir, run);
      return waitOn(i);
    }
  }
  if (step.state === 'running') {
    const turn = step.turns[step.turns.length - 1];
    if (turn.ended !== null) return { kind: 'ended', stepIndex: i, prompt: '', by: turn.by };
    const events = lines(join(runDir, turn.log));
    const result = resultOf(events);
    if (result) {
      // It ended while no driver watched: the result line is the turn's own record of how.
      const exit = result.subtype === 'success' && !result.is_error ? 0 : 1;
      recordEnd(run, i, turn, events, exit, null);
      saveRun(runDir, run);
      return { kind: 'ended', stepIndex: i, prompt: '', by: turn.by };
    }
    // A driver killed mid-turn leaves the turn's claude running and writing to the same log: wait for it.
    if (turn.pid && aliveAs(turn.pid, 'claude -p')) return { kind: 'running', stepIndex: i, prompt: '', by: turn.by };
    // Retry resumes the session the cut-off turn started, as a turn that ended would have recorded it.
    const session = initOf(events).session_id;
    if (typeof session === 'string' && session) step.session = session;
    turn.ended = new Date().toISOString();
    step.state = 'failed';
    step.reason = 'cut off when the driver stopped';
    run.state = 'waiting';
    run.reason = `${step.label} was cut off when the driver stopped; retry it or end the run`;
    saveRun(runDir, run);
    return waitOn(i);
  }
  return waitOn(i);
}

export function fillPrompt(template: string, request: string, run: Run): string {
  // A function replacement, so a `$&` or `$1` in the request is sent as written.
  return template.replace(/\{request\}|\{file:([a-z0-9-]+)\}/g, (_, id: string | undefined) => {
    if (!id) return request.replace(/\n$/, '');
    const step = run.steps.find((s) => s.id === id);
    if (!step?.file) throw new MissingFile(id, step?.label ?? id);
    return step.file;
  });
}

// ── Judging a turn that ended ──

// Failed, finished, answered from the config at once, or waiting. Returns the turn to send now, or null.
function afterTurn(runDir: string, run: Run, config: Config, i: number, turn: Turn): Action | null {
  const step = run.steps[i];
  const sc = config.steps[i];
  const events = lines(join(runDir, turn.log));
  const result = resultOf(events);
  // The finish check reads the last reply; the questions come from every reply.
  const reply = replyOf(events);
  const replies = repliesOf(events);
  const [done, file] = finished(sc, reply, run.workdir, Date.parse(run.started));
  if (file) step.file = file;
  snapshot(runDir, run.workdir, step, turn);
  if (turn.exit !== 0 || !result || result.is_error) {
    const how = turn.exit !== 0 ? `exited with ${turn.exit}` : result ? 'ended with an error' : 'ended with no result';
    step.state = 'failed';
    step.reason = `turn ${turn.n} ${how}: ${lastWords(runDir, turn, events)}`;
    run.state = 'waiting';
    run.reason = `${step.label} failed; retry it or end the run`;
    saveRun(runDir, run);
    return null;
  }
  logDecisions(runDir, step, turn, replies, null, turn.by);
  const mode = readMode(runDir);
  if (!needsAnswer(sc, done, openQuestions(replies).length > 0, mode)) {
    step.state = 'done';
    step.reason = '';
    run.state = 'running';
    run.reason = '';
    saveRun(runDir, run);
    return null;
  }
  if (mode === 'autonomous') {
    const answer = nextConfigAnswer(step, sc);
    if (answer !== null) {
      logDecisions(runDir, step, turn, replies, answer, 'config');
      saveRun(runDir, run);
      return { kind: 'send', stepIndex: i, prompt: answer, by: 'config' };
    }
  }
  step.state = 'waiting';
  const k = sc.answers?.length ?? 0;
  if (mode === 'autonomous') {
    step.reason = done ? `its reply asks, and the config's ${plural(k, 'answer')} ran out`
      : `the config's ${plural(k, 'answer')} ran out without ${unmet(sc, run, reply)}`;
  } else {
    step.reason = done ? 'human approval: its reply asks' : `human approval: it has not left ${unmet(sc, run, reply)}`;
  }
  run.state = 'waiting';
  run.reason = `${step.label} is waiting on you`;
  saveRun(runDir, run);
  return null;
}

// What of the step's done the turn has not met, in words.
function unmet(sc: StepConfig, run: Run, reply: string): string {
  const missing: string[] = [];
  if (sc.done?.file && !newestMatch(run.workdir, sc.done.file, Date.parse(run.started))) missing.push(sc.done.file);
  if (sc.done?.says && !reply.includes(sc.done.says)) missing.push(`“${sc.done.says}” in its reply`);
  return missing.join(' and ');
}

// A failed turn's last line, for the step's reason.
function lastWords(runDir: string, turn: Turn, events: Event[]): string {
  const reply = replyOf(events).trim();
  if (reply) return clipText(reply.split('\n').pop()!, 200);
  try {
    const rows = readFileSync(join(runDir, turn.log), 'utf8').split('\n').map((r) => r.trim()).filter(Boolean);
    return rows.length ? clipText(rows[rows.length - 1], 200) : 'it printed nothing';
  } catch {
    return 'its log could not be read';
  }
}

// The workdir's diff after the turn, and the step's done file as it is now.
export function snapshot(runDir: string, workdir: string, step: Step, turn: Turn): void {
  const stem = basename(turn.log, '.jsonl');
  writeFileSync(join(runDir, 'snapshots', `${stem}.patch`), stdout(['git', '-C', workdir, 'diff']));
  // Plans and reports are often ignored by git, so the diff misses them: the done file is copied as it is now.
  if (step.file) {
    try {
      copyFileSync(join(workdir, step.file), join(runDir, 'snapshots', `${stem}-${basename(step.file)}`));
    } catch {
      // Gone since it was found.
    }
  }
}
