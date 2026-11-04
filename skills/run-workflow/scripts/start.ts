// Starts a run and resumes one. start refuses a workdir or port another going run holds, writes the run's folder
// under the config's `runs` and appends it to the registry, starts the page unless it is up, and spawns the driver;
// both outlive the session that ran start. resume picks up a run whose driver stopped.

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { missingTools, problemsOf } from './config.ts';
import { seams } from './launch.ts';
import { aliveAs, driverAlive, loadRun, register, registered, saveRun, stdout } from './run-folder.ts';
import type { Config, Run, StepConfig } from './types.ts';

// A checkout with no commit yet is measured against git's empty tree, so every file reads as added.
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const DRIVER = join(import.meta.dirname, 'run.ts');
const pad = (n: number) => String(n).padStart(2, '0');

export async function start(configPath: string, requestFile: string): Promise<number> {
  const { config, problems } = problemsOf(configPath);
  let request = '';
  try {
    request = readFileSync(requestFile, 'utf8');
    if (!request.trim()) problems.push(`the request file ${requestFile} is empty`);
  } catch {
    problems.push(`cannot read the request file ${requestFile}`);
  }
  // Only a config that passed its checks has a workdir and ports to compare.
  if (!problems.length) problems.push(...clashes(config));
  if (problems.length) {
    problems.forEach((p) => seams.print(p));
    return 1;
  }
  const dir = makeRun(config, configPath, request);
  register(dir);
  const page = await seams.ensurePage();
  seams.spawnDetached(DRIVER, ['drive', dir], join(dir, 'driver.log'));
  seams.print(`run: ${dir}`);
  seams.print(`page: ${page}`);
  return 0;
}

// One line per registered run that is going and holds this config's workdir or one of its ports. A run is going
// while its driver is alive, waiting runs included, or while the claude of a turn its stopped driver left is still
// running. Two runs in one workdir write over each other's files, and two dev servers cannot share a port. `self`
// is the run being resumed, which never clashes with itself.
export function clashes(config: Config, self?: string): string[] {
  const out: string[] = [];
  const mine = realOr(config.workdir);
  for (const dir of registered()) {
    if (self && resolve(dir) === resolve(self)) continue;
    if (!going(dir)) continue;
    let other: Config;
    try {
      other = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
    } catch {
      continue;
    }
    const id = loadRun(dir)?.id ?? basename(dir);
    if (typeof other.workdir === 'string' && realOr(other.workdir) === mine) out.push(`${config.workdir} is in use by run ${id}`);
    for (const p of config.ports ?? []) if ((other.ports ?? []).includes(p)) out.push(`port ${p} is in use by run ${id}`);
  }
  return out;
}

const going = (dir: string) =>
  driverAlive(dir) || !!loadRun(dir)?.steps.some((s) => s.turns.some((t) => !t.ended && !!t.pid && aliveAs(t.pid, 'claude -p')));

const realOr = (p: string) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};

export async function resume(runDir: string): Promise<number> {
  const dir = resolve(runDir);
  if (!loadRun(dir)) {
    seams.print(`no run in ${dir}: run.json is missing or unreadable`);
    return 1;
  }
  const missing = missingTools();
  if (missing.length) {
    missing.forEach((t) => seams.print(`missing: ${t}`));
    return 1;
  }
  // A run started on this workdir after this one's driver stopped holds it now.
  let config: Config | null = null;
  try {
    config = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  } catch {
    // The driver reports a config it cannot read.
  }
  const held = config && typeof config.workdir === 'string' && !driverAlive(dir) ? clashes(config, dir) : [];
  if (held.length) {
    held.forEach((p) => seams.print(p));
    return 1;
  }
  register(dir);
  const page = await seams.ensurePage();
  if (driverAlive(dir)) seams.print('driver: already running');
  else seams.spawnDetached(DRIVER, ['drive', dir], join(dir, 'driver.log'));
  seams.print(`page: ${page}`);
  return 0;
}

// Writes a new run's folder and returns its path. The run starts in the config's mode; the page switches it.
export function makeRun(config: Config, configPath: string, request: string): string {
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
  writeFileSync(join(dir, 'mode'), (config.mode ?? 'autonomous') + '\n');
  const base = stdout(['git', '-C', config.workdir, 'rev-parse', 'HEAD']).trim() || EMPTY_TREE;
  const run: Run = {
    id, name: config.name, config: resolve(configPath), workdir: resolve(config.workdir), base,
    started: now.toISOString(), state: 'running', reason: '', driverPid: null, report: 'none',
    steps: config.steps.map((s: StepConfig) => ({ id: s.id, label: s.label, state: 'pending', reason: '', session: null, file: null, turns: [] }))
  };
  saveRun(dir, run);
  return dir;
}
