// Sends one turn of a step: builds the `claude -p` command with the run's guards, runs it in the workdir with its
// output going straight to the step's log, and records how it ended, what it cost and the effort it ran at.

import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { constants as osConstants } from 'node:os';
import { join } from 'node:path';
import { initOf, lines, resultOf, transcriptPath } from './log.ts';
import { saveRun } from './run-folder.ts';
import { seams } from './seams.ts';
import { Ticker, watchdog } from './watchdog.ts';
import type { By, Config, Event, Run, StepConfig, Turn } from './types.ts';

// The env file is sourced here, by bash, with its own output thrown away, then the command replaces bash, so the
// CLI's exit status is the turn's. Node never reads the file (R20).
const ENV_LINE = 'if [ -n "$RUN_WORKFLOW_ENV_FILE" ]; then set -a; . "$RUN_WORKFLOW_ENV_FILE" >/dev/null 2>&1; set +a; fi; exec "$@"';

const pad = (n: number) => String(n).padStart(2, '0');
const shellQuote = (word: string) => (/^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`);

// A child's exit status, as a shell would give it: 128 plus the signal that ended it, 127 when it never started.
export function exitOf(child: ChildProcess): Promise<number> {
  return new Promise<number>((done) => {
    child.on('error', () => done(127));
    child.on('exit', (code, signal) => done(code ?? (signal ? 128 + (osConstants.signals[signal] ?? 0) : 1)));
  });
}

export async function runTurn(runDir: string, run: Run, config: Config, stepIndex: number, prompt: string,
  by: By, retryOf?: number): Promise<Turn> {
  const step = run.steps[stepIndex];
  const sc = config.steps[stepIndex];
  const n = step.turns.length;
  const stem = `${pad(stepIndex + 1)}-${step.id}-${n}`;
  let session = step.session;
  if (n === 0) {
    session = sc.session === 'continue' ? previousSession(run, stepIndex) : null;
    step.session = session;
  }
  const turn: Turn = {
    n, prompt, by, log: `steps/${stem}.jsonl`, started: new Date().toISOString(), ended: null, seconds: null,
    exit: null, sessionCost: null, cost: null, watched: 'no'
  };
  if (retryOf !== undefined) turn.retryOf = retryOf;
  step.turns.push(turn);
  step.state = 'running';
  step.reason = '';
  run.state = 'running';
  run.reason = '';
  saveRun(runDir, run);

  const cmd = buildCommand(config, sc, prompt, session);
  writeFileSync(join(runDir, 'steps', `${stem}.cmd.txt`),
    `step: ${step.id}  turn: ${n}  by: ${by}  started: ${turn.started}  dir: ${run.workdir}\nprompt: ${prompt}\n` +
    `command: ${cmd.map(shellQuote).join(' ')}\n`);

  // The log's descriptor goes straight to the child, so a long turn's output never sits in this process.
  const fd = openSync(join(runDir, turn.log), 'w');
  const began = seams.now();
  let exit: number;
  let ticker: Ticker | null = null;
  try {
    const child = spawn(cmd[0], cmd.slice(1), { cwd: run.workdir, env: stepEnv(config, runDir), stdio: ['ignore', fd, fd] });
    ticker = new Ticker({ every: seams.tickMs, now: seams.now, onTick: () => watchdog(runDir, run, config, stepIndex, turn) });
    exit = await exitOf(child);
  } finally {
    ticker?.stop();
    closeSync(fd);
  }
  const seconds = (seams.now() - began - (ticker?.asleep ?? 0)) / 1000;
  recordEnd(run, stepIndex, turn, lines(join(runDir, turn.log)), exit, seconds);
  writeEffort(runDir, run, stem, step.session);
  saveRun(runDir, run);
  return turn;
}

// Records how a turn ended from its log: the session it ran in, its time, its exit and its cost.
export function recordEnd(run: Run, i: number, turn: Turn, events: Event[], exit: number, seconds: number | null): void {
  const step = run.steps[i];
  const session = initOf(events).session_id;
  if (typeof session === 'string' && session) step.session = session;
  const result = resultOf(events);
  turn.ended = new Date().toISOString();
  turn.seconds = seconds ?? (typeof result?.duration_ms === 'number' ? result.duration_ms / 1000 : null);
  turn.exit = exit;
  turn.sessionCost = typeof result?.total_cost_usd === 'number' ? result.total_cost_usd : null;
  // A resumed session's total_cost_usd is the whole conversation's; the turn's own is the difference (R18).
  turn.cost = turn.sessionCost === null ? null : turn.sessionCost - totalBefore(run, i, turn);
}

// The session a continued step resumes: the nearest earlier step that has one.
function previousSession(run: Run, i: number): string | null {
  for (let j = i - 1; j >= 0; j--) if (run.steps[j].session) return run.steps[j].session;
  return null;
}

// The session's running total before this turn, from the last earlier turn in the same session.
function totalBefore(run: Run, i: number, turn: Turn): number {
  const session = run.steps[i].session;
  let total = 0;
  for (let j = 0; j <= i; j++) {
    if (run.steps[j].session !== session) continue;
    for (const t of run.steps[j].turns) {
      if (t === turn) return total;
      if (t.sessionCost !== null) total = t.sessionCost;
    }
  }
  return total;
}

// ── The command and its environment ──

export function buildCommand(config: Config, step: StepConfig, prompt: string, session: string | null): string[] {
  const cmd = ['bash', '-c', ENV_LINE, 'bash', 'caffeinate', '-dims', 'claude', '-p', prompt];
  if (session) cmd.push('--resume', session);
  cmd.push('--model', config.model || 'claude-opus-5-5', '--settings', JSON.stringify(settingsFor(config, step)));
  // A resumed session ignores a system prompt it is given, so the note goes only to a new one.
  if (config.note && !session) cmd.push('--append-system-prompt', config.note);
  // --settings and --permission-mode are not restored on resume, so every turn carries them.
  cmd.push('--output-format', 'stream-json', '--verbose', '--permission-mode', config.permissionMode || 'bypassPermissions');
  if (config.deny?.length) cmd.push('--disallowedTools', ...config.deny);
  return cmd;
}

export function settingsFor(config: Config, step: StepConfig): Record<string, unknown> {
  const own = (config.settings ?? {}) as Record<string, any>;
  const hooks = (own.hooks ?? {}) as Record<string, any>;
  const gitHook = {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: `"${process.execPath}" --no-warnings "${join(import.meta.dirname, 'deny-git-writes.ts')}"`, timeout: 10 }]
  };
  const out: Record<string, unknown> = { ...own, hooks: { ...hooks, PreToolUse: [gitHook, ...(hooks.PreToolUse ?? [])] } };
  if (step.effort) {
    out.modelSettings = Object.fromEntries(Object.entries(step.effort).map(([model, level]) => [model, { effortLevel: level }]));
  }
  return out;
}

export function stepEnv(config: Config, runDir: string): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>), ...(config.env ?? {}) };
  env.PATH = [...(config.path ?? []), process.env.PATH ?? ''].join(':');
  // Each run gets its own temp folder: in an eval round two sessions shared /tmp and one found another's script.
  env.TMPDIR = join(runDir, 'tmp');
  // `claude -p` stops a background agent still running 10 minutes after the last turn; 0 waits for it.
  env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS = '0';
  env.RUN_WORKFLOW_ENV_FILE = config.envFile ?? '';
  return env;
}

// The effort each turn of the session ran at, from its transcript: the stream does not record it.
function writeEffort(runDir: string, run: Run, stem: string, session: string | null): void {
  if (!session) return;
  const count = (file: string) => {
    const found: Record<string, number> = {};
    try {
      for (const m of readFileSync(file, 'utf8').matchAll(/"perTurnEffort":"([a-z]*)"/g)) found[m[1]] = (found[m[1]] || 0) + 1;
    } catch {
      // No transcript: nothing to count.
    }
    return Object.entries(found).map(([level, k]) => `  ${k} ${level}`).join('\n');
  };
  const transcript = transcriptPath(run.workdir, session);
  const rows = ['main:', count(transcript)];
  const agentsDir = join(transcript.replace(/\.jsonl$/, ''), 'subagents');
  try {
    for (const name of readdirSync(agentsDir).filter((f) => f.endsWith('.jsonl')).sort()) rows.push(`agent ${name}:`, count(join(agentsDir, name)));
  } catch {
    // No agents.
  }
  writeFileSync(join(runDir, 'steps', `${stem}.effort.txt`), rows.filter(Boolean).join('\n') + '\n');
}
