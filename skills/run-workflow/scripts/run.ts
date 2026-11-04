#!/usr/bin/env node
// Runs a project's workflow end to end: each step the project's config names, in its own `claude -p` session,
// answered from the config in speed mode or by the developer on the page in slot-in mode, with a read-only
// watcher session after every turn and a read-only reporter session at the end.
//
//   node --no-warnings <skill>/scripts/run.ts check <config>
//   node --no-warnings <skill>/scripts/run.ts start <config> --request-file <file> [--slot-in]
//   node --no-warnings <skill>/scripts/run.ts resume <run folder>
//   node --no-warnings <skill>/scripts/run.ts drive <run folder>      (the detached driver; start and resume spawn it)
//
// check reads the config and the tools and writes nothing (config.ts). start and resume are in start.ts, the
// driver in driver.ts. The driver is the only writer of run.json, decisions.jsonl, notes.md and events.log; it reads
// answers/ and mode, which the page writes. The env file the config names is sourced by bash for each step and
// never read here, so no key it holds reaches the run's folder.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemsOf } from './config.ts';
import { drive } from './driver.ts';
import { seams } from './seams.ts';
import { resume, start } from './start.ts';

const USAGE = 'usage: run.ts check <config> | start <config> --request-file <file> [--slot-in] | resume <run> | drive <run>';

export async function main(argv: string[]): Promise<number> {
  const [command, target, ...rest] = argv;
  if (command === 'check' && target) return check(target);
  if (command === 'start' && target) {
    const at = rest.indexOf('--request-file');
    if (at < 0 || !rest[at + 1]) {
      seams.print(USAGE);
      return 1;
    }
    return start(target, rest[at + 1], rest.includes('--slot-in'));
  }
  if (command === 'resume' && target) return resume(target);
  if (command === 'drive' && target) return drive(resolve(target));
  seams.print(USAGE);
  return 1;
}

export function check(configPath: string): number {
  const { problems } = problemsOf(configPath);
  if (!problems.length) {
    seams.print('config ok');
    return 0;
  }
  problems.forEach((p) => seams.print(p));
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
