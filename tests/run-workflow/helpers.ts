// What the driver's tests share. useBox() gives every test its own temp folders: the workdir (a git checkout), the
// runs, the stand-in's files ($FAKE_CLAUDE_DIR), the registry ($RUN_WORKFLOW_HOME) and the transcripts
// ($CLAUDE_CONFIG_DIR). The driver runs in the test's process, against the claude and caffeinate stand-ins in
// tests/run-workflow/bin, which replay the samples.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach } from 'node:test';
import { readDecisions } from '../../skills/run-workflow/scripts/answers.ts';
import { loadConfig } from '../../skills/run-workflow/scripts/config.ts';
import { loadRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { makeRun } from '../../skills/run-workflow/scripts/start.ts';
import type { Decision, Run } from '../../skills/run-workflow/scripts/types.ts';

export const bin = resolve(import.meta.dirname, 'bin');
export const samples = resolve(import.meta.dirname, 'samples');
const realPath = process.env.PATH!;
export const git = (cwd: string, ...args: string[]) => spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).stdout.trim();

interface Box { root: string; workdir: string; runs: string; fake: string; printed: string[]; spawned: { script: string; args: string[] }[] }
export let box: Box;
export const saved = { ...seams };

export function useBox(): void {
  beforeEach(() => {
    const root = mkdtempSync(join(tmpdir(), 'rw-run-'));
    const workdir = join(root, 'work');
    mkdirSync(workdir);
    git(workdir, 'init', '-q');
    writeFileSync(join(workdir, 'README.md'), 'hello\n');
    git(workdir, 'add', '.');
    git(workdir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'start');
    box = { root, workdir, runs: join(root, 'runs'), fake: join(root, 'fake'), printed: [], spawned: [] };
    mkdirSync(box.fake);
    process.env.PATH = `${bin}:${realPath}`;
    process.env.FAKE_CLAUDE_DIR = box.fake;
    process.env.RUN_WORKFLOW_HOME = join(root, 'home');
    process.env.CLAUDE_CONFIG_DIR = join(root, 'claude');
    delete process.env.RUN_WORKFLOW_PORT;
    // The temp folder may itself sit inside a git checkout; git looks no higher than the test's root.
    process.env.GIT_CEILING_DIRECTORIES = root;
    // The skills the tests' configs name, installed as personal skills so start finds them.
    for (const name of STAND_IN_SKILLS) installSkill(join(root, 'claude', 'skills'), name);
    seams.print = (line: string) => void box.printed.push(line);
    seams.spawnDetached = (script: string, args: string[]) => {
      box.spawned.push({ script, args });
      return 99999;
    };
    seams.ensurePage = async () => 'http://127.0.0.1:8790/';
    // A wait the test does not answer ends the driver soon, leaving the run as a stopped driver would.
    seams.patience = 400;
    seams.pollMs = 50;
    seams.tickMs = 50;
  });

  afterEach(() => {
    Object.assign(seams, saved);
    process.env.PATH = realPath;
    rmSync(box.root, { recursive: true, force: true });
  });
}

// ── Configs and runs ──

export const STAND_IN_SKILLS = ['prime', 'plan', 'dk-plan', 'dk-execute-plan', 'dk-review-code'];
export function installSkill(skills: string, name: string): void {
  mkdirSync(join(skills, name), { recursive: true });
  writeFileSync(join(skills, name, 'SKILL.md'), `---\nname: ${name}\n---\n`);
}

export function writeConfig(config: Record<string, unknown>, name = 'config.json'): string {
  const path = join(box.root, name);
  writeFileSync(path, JSON.stringify(config, null, 2));
  return path;
}

export const goodConfig = (): Record<string, unknown> => ({
  name: 'demo', workdir: 'work', runs: 'runs',
  steps: [
    { id: 'prime', label: 'Prime', prompt: '/prime', session: 'new' },
    { id: 'plan', label: 'Plan', prompt: '/plan {request}', session: 'continue' }
  ]
});

// The terminal's four steps, as Example 1 runs them.
export function fourSteps(over: Record<string, unknown> = {}): Record<string, any> {
  return {
    name: 'first-run', workdir: 'work', runs: 'runs',
    steps: [
      { id: 'prime', label: 'Prime', prompt: '/prime', session: 'new' },
      { id: 'plan', label: 'Plan', prompt: '/dk-plan {request}', session: 'continue',
        done: { file: '.agents/plans/*.md', says: '/dk-execute-plan' },
        answers: ['take the recommendations', 'approved, go ahead', 'take the recommendations'] },
      { id: 'build', label: 'Build', prompt: '/dk-execute-plan {file:plan}', session: 'new',
        done: { file: '.agents/execution-reports/*.md' } },
      { id: 'review', label: 'Review', prompt: '/dk-review-code {file:build}', session: 'new',
        done: { file: '.agents/code-reviews/*.md' }, answerIfAsks: true, answers: ['take the recommendations'] }
    ],
    ...over
  };
}

export function newRun(config: Record<string, unknown>, request = 'Drop the progress bar.', humanApproval = false): string {
  const { config: loaded, problems } = loadConfig(writeConfig(humanApproval ? { ...config, mode: 'human-approval' } : config));
  assert.deepEqual(problems, []);
  return makeRun(loaded, join(box.root, 'config.json'), request);
}

// Example 1's run, with the stand-in's replies for all four steps.
export function exampleOne(): string {
  reply(1, PRIMED);
  reply(2, 'plan-asks.jsonl');
  reply(3, 'requirements-stop.jsonl', { touch: ['.agents/plans/p.md'] });
  reply(4, 'requirements-stop.jsonl');
  reply(5, 'plan-finished.jsonl');
  reply(6, [init('s-build'), result('Built.', 2, 's-build')], { touch: ['.agents/execution-reports/p-report.md'] });
  reply(7, 'review-no-questions.jsonl', { touch: ['.agents/code-reviews/p-review.md'] });
  return newRun(fourSteps());
}

export const decisions = (dir: string) => readDecisions(dir);
export const answered = (d: Decision[]) => d.filter((x) => x.kind === 'answered');

// Polls until the run reaches a state, as the page would see it.
export async function until(dir: string, ok: (run: Run) => boolean, ms = 5000): Promise<Run> {
  const end = Date.now() + ms;
  for (;;) {
    const run = loadRun(dir);
    if (run && ok(run)) return run;
    if (Date.now() > end) throw new Error(`timed out; run is ${JSON.stringify(run?.steps.map((s) => [s.id, s.state, s.reason]))}`);
    await new Promise((done) => setTimeout(done, 25));
  }
}

// ── The claude stand-in ──

export const init = (session: string) => JSON.stringify({ type: 'system', subtype: 'init', session_id: session, cwd: '/w', tools: [] });
export const result = (text: string, total: number, session: string) =>
  JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: text, total_cost_usd: total, session_id: session });
export const sampleLines = (name: string) => readFileSync(join(samples, name), 'utf8').split('\n').filter(Boolean);
export const PRIMED = [init('s-prime'), result('Primed. Ready.', 0.71, 's-prime')];

// The stand-in's step reply n: a sample's lines or lines of its own, and what the turn does.
export function reply(n: number, from: string | string[], opts: { touch?: string[]; exit?: number; sleep?: number } = {}): void {
  const rows = typeof from === 'string' ? sampleLines(from) : from;
  writeFileSync(join(box.fake, `reply-${n}.jsonl`), rows.join('\n') + '\n');
  if (opts.touch) writeFileSync(join(box.fake, `reply-${n}.touch`), opts.touch.join('\n') + '\n');
  if (opts.exit !== undefined) writeFileSync(join(box.fake, `reply-${n}.exit`), String(opts.exit));
  if (opts.sleep !== undefined) writeFileSync(join(box.fake, `reply-${n}.sleep`), String(opts.sleep));
}

// Every call the stand-in saw, in order, as its argument list and its environment.
export function calls(): { args: string[]; env: Record<string, string> }[] {
  const out = [];
  for (let k = 1; existsSync(join(box.fake, `call-${k}.args`)); k++) {
    const args = readFileSync(join(box.fake, `call-${k}.args`), 'utf8').split('\0').slice(0, -1);
    const env = Object.fromEntries(readFileSync(join(box.fake, `call-${k}.env`), 'utf8').split('\n')
      .map((row) => [row.slice(0, row.indexOf('=')), row.slice(row.indexOf('=') + 1)]));
    out.push({ args, env });
  }
  return out;
}
// The prompt is the word after `--`, as the real CLI reads it.
export const promptOf = (args: string[]) => args[args.indexOf('--') + 1];
export const stepCalls = () => calls().filter((c) => !/^(watch|report) /.test(promptOf(c.args)));
export const flag = (args: string[], name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

// ── The log readers' samples ──

const made: string[] = [];
export const sample = (name: string) => join(samples, name);
export const raw = (name: string) => readFileSync(sample(name), 'utf8').split('\n').filter(Boolean);

// A temp folder of the test's own, removed by removeTemps().
export const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'rw-record-'));
  made.push(dir);
  return dir;
};
export const removeTemps = () => made.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));

// An agent's files in a session's subagents folder, as the CLI writes them: its meta file and, unless `noTranscript`,
// a transcript of `calls` Read calls over `minutes`, ending on its own text when `ended`, on a tool call otherwise.
export function writeAgent(folder: string, id: string, opts: { type?: string; description?: string; model?: string; calls?: number;
  minutes?: number; ended?: boolean; finished?: boolean; noTranscript?: boolean } = {}): void {
  const { type = 'Explore', description = 'Inventory forms', model = 'claude-opus-5-5', calls = 3, minutes = 2, ended = true } = opts;
  mkdirSync(folder, { recursive: true });
  const meta: Record<string, unknown> = { agentType: type, description, toolUseId: id };
  if (opts.finished !== undefined) meta.finished = opts.finished;
  writeFileSync(join(folder, `agent-${id}.meta.json`), JSON.stringify(meta));
  if (opts.noTranscript) return;
  const t0 = Date.parse('2026-11-04T10:00:00Z');
  const at = (k: number) => new Date(t0 + (k / (calls + 1)) * minutes * 60000).toISOString();
  const rows: unknown[] = [{ type: 'user', timestamp: at(0), message: { role: 'user', content: 'the brief' } }];
  for (let k = 1; k <= calls; k++) {
    const last = k === calls && !ended;
    rows.push({ type: 'assistant', timestamp: last ? at(calls + 1) : at(k), message: { model, stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: `${id}-${k}`, name: 'Read', input: { file_path: `/w/file-${k}.ts` } }] } });
    if (!last) rows.push({ type: 'user', timestamp: at(k), message: { content: [{ type: 'tool_result', tool_use_id: `${id}-${k}`, content: 'ok' }] } });
  }
  if (ended) rows.push({ type: 'assistant', timestamp: at(calls + 1), message: { model, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done.' }] } });
  writeFileSync(join(folder, `agent-${id}.jsonl`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

// A turn's own assistant event that starts the agents named.
export const startsAgents = (...ids: string[]) => ({
  type: 'assistant', message: { content: ids.map((id) => ({ type: 'tool_use', id, name: 'Agent', input: { subagent_type: 'Explore', description: 'x' } })) }
});

// A copy of a sample with its lines changed, so lines() reads a file of its own.
export function variant(name: string, change: (rows: string[]) => string[]): string {
  const path = join(temp(), name);
  writeFileSync(path, change(raw(name)).join('\n') + '\n');
  return path;
}
