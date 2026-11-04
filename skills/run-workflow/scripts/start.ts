// Starts a run and resumes one. start writes the run's folder under the config's `runs` and appends it to the
// registry, starts the page unless it is up, and spawns the driver; both outlive the session that ran start.
// resume picks up a run whose driver stopped.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { problemsOf } from './config.ts';
import { driverAlive, loadRun, register, saveRun } from './run-folder.ts';
import { seams } from './seams.ts';
import { stdout } from './shell.ts';
import type { Config, Run, StepConfig } from './types.ts';

// A checkout with no commit yet is measured against git's empty tree, so every file reads as added.
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const DRIVER = join(import.meta.dirname, 'run.ts');
const pad = (n: number) => String(n).padStart(2, '0');

export async function start(configPath: string, requestFile: string, slotIn: boolean): Promise<number> {
  const { config, problems } = problemsOf(configPath);
  let request = '';
  try {
    request = readFileSync(requestFile, 'utf8');
    if (!request.trim()) problems.push(`the request file ${requestFile} is empty`);
  } catch {
    problems.push(`cannot read the request file ${requestFile}`);
  }
  if (problems.length) {
    problems.forEach((p) => seams.print(p));
    return 1;
  }
  const dir = makeRun(config, configPath, request, slotIn);
  register(dir);
  const page = await seams.ensurePage();
  seams.spawnDetached(DRIVER, ['drive', dir], join(dir, 'driver.log'));
  seams.print(`run: ${dir}`);
  seams.print(`page: ${page}`);
  return 0;
}

export async function resume(runDir: string): Promise<number> {
  const dir = resolve(runDir);
  if (!loadRun(dir)) {
    seams.print(`no run in ${dir}: run.json is missing or unreadable`);
    return 1;
  }
  register(dir);
  const page = await seams.ensurePage();
  if (driverAlive(dir)) seams.print('driver: already running');
  else seams.spawnDetached(DRIVER, ['drive', dir], join(dir, 'driver.log'));
  seams.print(`page: ${page}`);
  return 0;
}

// Writes a new run's folder and returns its path.
export function makeRun(config: Config, configPath: string, request: string, slotIn: boolean): string {
  const now = new Date();
  const stampText = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  mkdirSync(config.runs, { recursive: true });
  // Two runs of one config in the same second get their own folders.
  let id = `${stampText}-${config.name}`;
  for (let k = 2; existsSync(join(config.runs, id)); k++) id = `${stampText}-${config.name}-${k}`;
  const dir = resolve(config.runs, id);
  for (const sub of ['', 'steps', 'answers', 'snapshots', 'tmp', 'watch']) mkdirSync(join(dir, sub), { recursive: true });
  writeFileSync(join(dir, 'request.md'), request);
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
  writeFileSync(join(dir, 'mode'), (slotIn ? 'slot-in' : 'speed') + '\n');
  const base = stdout(['git', '-C', config.workdir, 'rev-parse', 'HEAD']).trim() || EMPTY_TREE;
  const run: Run = {
    id, name: config.name, config: resolve(configPath), workdir: resolve(config.workdir), base,
    started: now.toISOString(), state: 'running', reason: '', driverPid: null, report: 'none',
    steps: config.steps.map((s: StepConfig) => ({ id: s.id, label: s.label, state: 'pending', reason: '', session: null, file: null, turns: [] }))
  };
  saveRun(dir, run);
  return dir;
}
