// The run's two read-only sessions: a watcher after every turn, whose notes go to notes.md, and the reporter at
// the end, which writes report.md. Their instructions are agents/watcher.md and agents/reporter.md. Neither can
// change the run it reports on, and a watcher that fails never holds the run.

import { spawn } from 'node:child_process';
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { lines, replyOf, resultOf, transcriptPath } from './log.ts';
import { loadRun, saveRun } from './run-folder.ts';
import { exitOf } from './turn.ts';
import type { AgentConfig, Config, Run, Turn } from './types.ts';

const WATCHER: AgentConfig = { model: 'claude-sonnet-5-5', effort: 'medium' };
const REPORTER: AgentConfig = { model: 'claude-opus-5-5', effort: 'high' };
const WATCHER_WAIT = 10 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

export function startWatcher(runDir: string, run: Run, config: Config, stepIndex: number, turn: Turn): Promise<void> {
  const step = run.steps[stepIndex];
  const stem = basename(turn.log, '.jsonl');
  turn.watched = 'watching';
  saveRun(runDir, run);
  return (async () => {
    try {
      const [reply, exit] = await runAgent(runDir, 'watcher', `watch run=${runDir} step=${step.id} turn=${turn.n}`,
        config.watcher ?? WATCHER, `watch/${stem}.jsonl`);
      if (exit !== 0 || !reply.trim()) throw new Error(`exit ${exit}`);
      appendFileSync(join(runDir, 'notes.md'), `## ${pad(stepIndex + 1)} ${step.label}, turn ${turn.n}\n\n${reply.trim()}\n\n`);
      turn.watched = 'noted';
    } catch {
      // A watcher that fails never holds the run; the report names it.
      turn.watched = 'failed';
    }
    saveRun(runDir, run);
  })();
}

export async function writeReport(runDir: string, run: Run, config: Config, watchers: Promise<void>[]): Promise<void> {
  run.report = 'writing';
  saveRun(runDir, run);
  // Each watcher gets 10 minutes; one still going after that is named as failed.
  await Promise.all(watchers.map((w) => Promise.race([w, new Promise((done) => setTimeout(done, WATCHER_WAIT).unref())])));
  for (const turn of run.steps.flatMap((s) => s.turns)) if (turn.watched === 'watching') turn.watched = 'failed';
  saveRun(runDir, run);
  const [reply, exit] = await runAgent(runDir, 'reporter', `report run=${runDir}`, config.reporter ?? REPORTER, 'report.jsonl');
  if (exit === 0 && reply.trim()) {
    writeFileSync(join(runDir, 'report.md'), reply);
    run.report = 'written';
  } else {
    writeFileSync(join(runDir, 'report.md'),
      `# The report was not written\n\nThe reporter failed (exit ${exit}${reply.trim() ? '' : ', no reply'}). Its log is report.jsonl in this folder.\n`);
    run.report = 'failed';
  }
  saveRun(runDir, run);
}

// A session that can only read: it cannot change the run it reports on. Its cwd is the run folder; the session
// transcripts the watcher reads sit outside it, so their folder is added. Returns [its reply, its exit].
export async function runAgent(runDir: string, agent: 'watcher' | 'reporter', brief: string, ac: AgentConfig, log: string): Promise<[string, number]> {
  const run = loadRun(runDir);
  const extra = run ? ['--add-dir', dirname(transcriptPath(run.workdir, 'x'))] : [];
  const args = ['-p', brief, '--model', ac.model, '--settings', JSON.stringify({ modelSettings: { [ac.model]: { effortLevel: ac.effort } } }),
    '--append-system-prompt', agentText(agent), '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk',
    ...extra, '--allowedTools', 'Read', 'Grep', 'Glob'];
  const file = join(runDir, log);
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, 'w');
  let exit: number;
  try {
    const child = spawn('claude', args, { cwd: runDir, env: { ...process.env, TMPDIR: join(runDir, 'tmp') }, stdio: ['ignore', fd, fd] });
    exit = await exitOf(child);
  } finally {
    closeSync(fd);
  }
  const events = lines(file);
  return [resultOf(events) && !resultOf(events)!.is_error ? replyOf(events) : '', exit];
}

// An agent file's instructions: its text after the front matter.
function agentText(agent: 'watcher' | 'reporter'): string {
  return readFileSync(join(import.meta.dirname, '..', 'agents', `${agent}.md`), 'utf8').replace(/^---\n[\s\S]*?\n---\n+/, '');
}
