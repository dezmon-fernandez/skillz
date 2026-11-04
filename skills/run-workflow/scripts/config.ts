// Reads a project's config and checks it, with the tools a run needs. Every problem is one plain line, so
// `run.ts check` and `run.ts start` can print them all before anything is written. references/config.md is the
// config's reference.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { stdout } from './shell.ts';
import type { Config } from './types.ts';

const MIN_NODE = [22, 18];
const TOP = new Set(['name', 'workdir', 'runs', 'steps', 'envFile', 'path', 'env', 'ports', 'watchdogWait', 'deny',
  'settings', 'note', 'model', 'permissionMode', 'watcher', 'reporter']);
const STEP = new Set(['id', 'label', 'prompt', 'session', 'effort', 'done', 'answers', 'answerIfAsks']);

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStrings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// The config with its paths made absolute, the missing tools and every problem in it.
export function problemsOf(configPath: string): { config: Config; problems: string[] } {
  const { config, problems } = loadConfig(configPath);
  return { config, problems: [...missingTools().map((t) => `missing: ${t}`), ...problems] };
}

export function missingTools(): string[] {
  const out: string[] = [];
  for (const tool of ['claude', 'git', 'caffeinate', 'lsof']) {
    const found = spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'sh', tool], { encoding: 'utf8', env: process.env });
    if (found.status !== 0 || !found.stdout.trim()) out.push(tool);
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1])) {
    out.push(`node 22.18 or later (this is ${process.versions.node})`);
  }
  return out;
}

export function loadConfig(path: string): { config: Config; problems: string[] } {
  const problems: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    problems.push(e.code ? `cannot read the config ${path} (${e.code})` : `the config ${path} is not JSON: ${e.message}`);
    return { config: raw as Config, problems };
  }
  if (!isObject(raw)) return { config: raw as Config, problems: [`the config ${path} is not a JSON object`] };
  const c = raw as Record<string, any>;
  const folder = dirname(resolve(path));
  const abs = (p: string) => (isAbsolute(p) ? p : resolve(folder, p));

  for (const key of Object.keys(c)) if (!TOP.has(key)) problems.push(`unknown field "${key}"`);
  if (typeof c.name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(c.name)) problems.push('name must be short kebab-case text, such as "my-feature"');
  for (const key of ['workdir', 'runs']) if (typeof c[key] !== 'string' || !c[key]) problems.push(`${key} is required: a folder path`);
  if (!Array.isArray(c.steps) || !c.steps.length) problems.push('steps is required: a list of at least one step');
  for (const key of ['envFile', 'note', 'model', 'permissionMode']) {
    if (c[key] !== undefined && typeof c[key] !== 'string') problems.push(`${key} must be text`);
  }
  for (const key of ['path', 'deny']) if (c[key] !== undefined && !isStrings(c[key])) problems.push(`${key} must be a list of text`);
  if (c.env !== undefined && !(isObject(c.env) && Object.values(c.env).every((v) => typeof v === 'string'))) {
    problems.push('env must map names to text');
  }
  if (c.ports !== undefined && !(Array.isArray(c.ports) && c.ports.every((p) => Number.isInteger(p) && p > 0))) {
    problems.push('ports must be a list of port numbers');
  }
  if (c.watchdogWait !== undefined && !(typeof c.watchdogWait === 'number' && c.watchdogWait >= 0)) {
    problems.push('watchdogWait must be a number of seconds');
  }
  if (c.settings !== undefined && !isObject(c.settings)) problems.push('settings must be an object');
  for (const key of ['watcher', 'reporter']) {
    if (c[key] !== undefined && !(isObject(c[key]) && typeof c[key].model === 'string' && typeof c[key].effort === 'string')) {
      problems.push(`${key} must be {"model": ..., "effort": ...}`);
    }
  }

  if (typeof c.workdir === 'string' && c.workdir) {
    c.workdir = abs(c.workdir);
    if (!isDir(c.workdir)) problems.push(`workdir ${c.workdir} does not exist`);
    else if (stdout(['git', '-C', c.workdir, 'rev-parse', '--is-inside-work-tree']).trim() !== 'true') {
      problems.push(`workdir ${c.workdir} is not a git checkout`);
    }
  }
  if (typeof c.runs === 'string' && c.runs) {
    c.runs = abs(c.runs);
    // A step could read the run's records, decisions and notes, or write over them.
    if (typeof c.workdir === 'string') {
      const w = real(c.workdir);
      const r = real(c.runs);
      if (r === w || r.startsWith(w + sep)) problems.push(`runs ${c.runs} is inside workdir; put the run records outside it`);
    }
  }
  if (typeof c.envFile === 'string') {
    c.envFile = abs(c.envFile);
    if (!existsSync(c.envFile)) problems.push(`envFile ${c.envFile} does not exist`);
  }
  if (isStrings(c.path)) {
    c.path = c.path.map(abs);
    for (const p of c.path) if (!isDir(p)) problems.push(`path folder ${p} does not exist`);
  }

  const seen = new Set<string>();
  (Array.isArray(c.steps) ? c.steps : []).forEach((s: any, i: number) => {
    const at = `step ${i + 1}`;
    if (!isObject(s)) {
      problems.push(`${at} must be an object`);
      return;
    }
    for (const key of Object.keys(s)) if (!STEP.has(key)) problems.push(`${at}: unknown field "${key}"`);
    if (typeof s.id !== 'string' || !/^[a-z0-9-]+$/.test(s.id)) problems.push(`${at}: step id ${JSON.stringify(s.id)} must be [a-z0-9-]+`);
    else if (seen.has(s.id)) problems.push(`${at}: duplicate step id "${s.id}"`);
    if (typeof s.id === 'string') seen.add(s.id);
    if (typeof s.label !== 'string' || !s.label) problems.push(`${at}: label is required`);
    if (typeof s.prompt !== 'string' || !s.prompt) problems.push(`${at}: prompt is required`);
    if (s.session !== 'new' && s.session !== 'continue') problems.push(`${at}: session ${JSON.stringify(s.session)} must be "new" or "continue"`);
    else if (i === 0 && s.session !== 'new') problems.push('the first step must start a session: session "new"');
    if (s.effort !== undefined && !(isObject(s.effort) && Object.values(s.effort).every((v) => typeof v === 'string'))) {
      problems.push(`${at}: effort must map model ids to effort levels`);
    }
    if (s.done !== undefined) {
      if (!isObject(s.done) || Object.keys(s.done).some((k) => k !== 'file' && k !== 'says')
        || (s.done.file !== undefined && typeof s.done.file !== 'string') || (s.done.says !== undefined && typeof s.done.says !== 'string')) {
        problems.push(`${at}: done must be {"file": <glob>, "says": <text>}, either or both`);
      }
    }
    if (s.answers !== undefined && !isStrings(s.answers)) problems.push(`${at}: answers must be a list of text`);
    if (s.answerIfAsks !== undefined && typeof s.answerIfAsks !== 'boolean') problems.push(`${at}: answerIfAsks must be true or false`);
    if (typeof s.prompt === 'string') {
      for (const m of s.prompt.matchAll(/\{file:([^}]*)\}/g)) {
        if (!seen.has(m[1]) || m[1] === s.id) problems.push(`${at}: {file:${m[1]}} must name an earlier step`);
      }
    }
  });
  return { config: c as Config, problems };
}

// The real path of a folder, or of its nearest existing parent with the rest joined on, so a runs folder that does
// not exist yet still compares with the workdir it might sit inside.
function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    const parent = dirname(p);
    return parent === p ? p : join(real(parent), p.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
  }
}
