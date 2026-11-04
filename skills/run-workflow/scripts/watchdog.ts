// The dev-server watchdog. `claude -p` waits for every background shell before it exits, and a dev server a step
// left running never exits, so the step hangs. Once the turn is over in its transcript and nothing there, agents
// included, has been written for the config's wait, what listens on the config's ports is stopped (R15).
//
// The Ticker that calls it each interval also measures time the Mac spent asleep, which a step's time leaves out.

import { appendFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { initOf, lines, transcriptPath, turnOver } from './log.ts';
import { stdout } from './shell.ts';
import type { Config, Run, Turn } from './types.ts';

const waitWords = (seconds: number) => (seconds < 60 ? `${seconds} s` : `${+(seconds / 60).toFixed(1)} min`);

// One per turn, stopped when the turn ends. A gap between ticks longer than the interval plus 2 s is time the
// process was suspended, which on a Mac means asleep (R16).
export class Ticker {
  asleep: number;
  #timer: ReturnType<typeof setInterval>;
  #last: number;
  constructor(opts: { every: number; now?: () => number; onTick: () => void }) {
    const now = opts.now ?? Date.now;
    this.asleep = 0;
    this.#last = now();
    this.#timer = setInterval(() => {
      const t = now();
      const gap = t - this.#last;
      if (gap > opts.every + 2000) this.asleep += gap - opts.every;
      this.#last = t;
      opts.onTick();
    }, opts.every);
  }
  stop(): void {
    clearInterval(this.#timer);
  }
}

export function watchdog(runDir: string, run: Run, config: Config, stepIndex: number, turn: Turn): void {
  if (!config.ports?.length) return;
  const step = run.steps[stepIndex];
  const session = step.session || initOf(lines(join(runDir, turn.log))).session_id;
  if (!session) return;
  const transcript = transcriptPath(run.workdir, session);
  if (!turnOver(lines(transcript))) return;
  const wait = config.watchdogWait ?? 120;
  if (Date.now() - lastWrite(transcript) < wait * 1000) return;
  for (const port of config.ports) {
    for (const pid of freePorts([port])) {
      appendFileSync(join(runDir, 'events.log'),
        `${new Date().toISOString()} ${step.id} turn ${turn.n}: freed port ${port} (pid ${pid}) after the turn was over for ${waitWords(wait)}\n`);
    }
  }
}

// Sends SIGTERM to whatever listens on each port, this process aside. Returns the pids it signalled.
export function freePorts(ports: number[]): number[] {
  const freed: number[] = [];
  for (const port of ports) {
    for (const row of stdout(['lsof', '-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN']).split('\n')) {
      const pid = Number(row.trim());
      if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
      try {
        process.kill(pid, 'SIGTERM');
        freed.push(pid);
      } catch {
        // Gone already.
      }
    }
  }
  return freed;
}

// The newest write under the session's transcript and its agents' transcripts, in ms; 0 when none exists.
function lastWrite(transcript: string): number {
  let newest = 0;
  const files = [transcript];
  const agentsDir = join(transcript.replace(/\.jsonl$/, ''), 'subagents');
  try {
    for (const name of readdirSync(agentsDir)) if (name.endsWith('.jsonl')) files.push(join(agentsDir, name));
  } catch {
    // No agents.
  }
  for (const file of files) {
    try {
      newest = Math.max(newest, statSync(file).mtimeMs);
    } catch {
      // Not written yet.
    }
  }
  return newest;
}
