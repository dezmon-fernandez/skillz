// Where runs live: the registry of every run on this Mac, a run folder's run.json, and whether its driver is alive.
//
// A run folder is <config's runs>/<YYYYMMDD-HHMMSS>-<name>/. The driver is the only writer of run.json; the page
// writes only answers/ and mode (answers.ts). The registry is one absolute folder per line in home()/runs, appended
// by `run.ts start`.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { stdout } from './shell.ts';
import type { Run } from './types.ts';

export function home(): string {
  return process.env.RUN_WORKFLOW_HOME || join(homedir(), '.local', 'state', 'run-workflow');
}

export function port(): number {
  const given = Number(process.env.RUN_WORKFLOW_PORT);
  return Number.isInteger(given) && given > 0 ? given : 8790;
}

export function register(runDir: string): void {
  const folder = resolve(runDir);
  mkdirSync(home(), { recursive: true });
  const file = join(home(), 'runs');
  const known = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
  if (!known.includes(folder)) appendFileSync(file, folder + '\n');
}

export function registered(): string[] {
  let rows: string[];
  try {
    rows = readFileSync(join(home(), 'runs'), 'utf8').split('\n').filter(Boolean);
  } catch {
    return [];
  }
  const found = [...new Set(rows)].filter((dir) => existsSync(join(dir, 'run.json')));
  // A run.json that cannot be read still lists, last, so the page can say it could not read it.
  const started = new Map(found.map((dir) => [dir, loadRun(dir)?.started ?? '']));
  return found.sort((a, b) => started.get(b)!.localeCompare(started.get(a)!));
}

export function loadRun(runDir: string): Run | null {
  try {
    const run = JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8'));
    return run && typeof run === 'object' && Array.isArray(run.steps) ? (run as Run) : null;
  } catch {
    return null;
  }
}

export function saveRun(runDir: string, run: Run): void {
  writeAtomic(join(runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
}

// A reader never sees half a file: the text goes to a temp file in the same folder, and rename replaces the old
// one in a single step.
export function writeAtomic(file: string, text: string): void {
  const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(temp, text);
  renameSync(temp, file);
}

// Node has no flock, so the lock is a pid file and this check.
export function driverAlive(runDir: string): boolean {
  let pid: number;
  try {
    pid = Number(readFileSync(join(runDir, 'driver.pid'), 'utf8').trim());
  } catch {
    return false;
  }
  return aliveAs(pid, 'run.ts drive', resolve(runDir));
}

// Whether the process is alive and its command line holds every word given. A pid the system reused for another
// program fails the command check, so it reads as gone rather than alive.
export function aliveAs(pid: number, ...words: string[]): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EPERM') return false;
  }
  const command = stdout(['ps', '-o', 'command=', '-p', String(pid)]);
  return words.every((word) => command.includes(word));
}
