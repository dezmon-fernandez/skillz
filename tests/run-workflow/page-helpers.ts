// What the page's tests share. usePage() serves the page in the test's process on a port the system picks; its
// runs are made with makeRun and registered in a temp $RUN_WORKFLOW_HOME, with their step logs copied from the
// samples.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, afterEach, before, beforeEach } from 'node:test';
import { loadConfig } from '../../skills/run-workflow/scripts/config.ts';
import { serve } from '../../skills/run-workflow/scripts/page.ts';
import { loadRun, register, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { makeRun } from '../../skills/run-workflow/scripts/start.ts';
import type { Run, Turn } from '../../skills/run-workflow/scripts/types.ts';

export const samples = resolve(import.meta.dirname, 'samples');
export let root: string;
export let server: Server;
export let base: string;

export function usePage(): void {
  before(async () => {
    server = await serve(0);
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  after(() => server.close());

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'rw-page-'));
    process.env.RUN_WORKFLOW_HOME = join(root, 'home');
    process.env.CLAUDE_CONFIG_DIR = join(root, 'claude');
    process.env.GIT_CEILING_DIRECTORIES = root;
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
}

// A registered run of a prime and a plan step, its plan step at the state given.
export function aRun(name = 'cleared', plan: Partial<Run['steps'][number]> = {}, started?: string): string {
  const workdir = join(root, `work-${name}`);
  mkdirSync(workdir, { recursive: true });
  spawnSync('git', ['-C', workdir, 'init', '-q']);
  const configPath = join(root, `${name}.json`);
  writeFileSync(configPath, JSON.stringify({
    name, workdir, runs: join(root, 'runs'),
    steps: [
      { id: 'prime', label: 'Prime', prompt: '/prime', session: 'new' },
      { id: 'plan', label: 'Plan', prompt: '/dk-generate-plan {request}', session: 'continue', answers: ['take all reccs'] },
      { id: 'build', label: 'Build', prompt: '/dk-execute-plan {file:plan}', session: 'new' }
    ]
  }));
  const { config, problems } = loadConfig(configPath);
  assert.deepEqual(problems, []);
  const dir = makeRun(config, configPath, 'Drop the bar.', false);
  register(dir);
  const run = loadRun(dir)!;
  if (started) run.started = started;
  run.steps[0] = { ...run.steps[0], state: 'done', session: 's', turns: [turn(0, '01-prime-0', '/prime')] };
  run.steps[1] = { ...run.steps[1], state: 'waiting', reason: 'slotted in: its reply asks', session: 's',
    turns: [turn(0, '02-plan-0', '/dk-generate-plan Drop the bar.')], ...plan };
  run.state = 'waiting';
  saveRun(dir, run);
  writeFileSync(join(dir, 'steps', '02-plan-0.jsonl'), readFileSync(join(samples, 'plan-asks.jsonl')));
  return dir;
}
export function turn(n: number, stem: string, prompt: string): Turn {
  return { n, prompt, by: 'config', log: `steps/${stem}.jsonl`, started: '2026-11-04T10:00:00Z', ended: '2026-11-04T10:01:00Z',
    seconds: 60, exit: 0, sessionCost: 0.5, cost: 0.5, watched: 'noted' };
}
export const idOf = (dir: string) => loadRun(dir)!.id;

export const get = async (path: string): Promise<[number, string]> => {
  const res = await fetch(base + path);
  return [res.status, await res.text()];
};
