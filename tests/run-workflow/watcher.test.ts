// node --no-warnings --test tests/run-workflow/watcher.test.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { saveAnswer } from '../../skills/run-workflow/scripts/answers.ts';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { loadRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { PRIMED, box, calls, flag, fourSteps, init, newRun, promptOf, reply, result, until, useBox } from './helpers.ts';

useBox();

describe('the watcher and the reporter', () => {
  const NOTE = "- Quote the request's numbers. Evidence: steps/02-plan-0.jsonl:30";
  const said = (text: string) => [init('s-agent'), result(text, 0.1, 's-agent')].join('\n') + '\n';
  const watchCalls = () => calls().filter((c) => promptOf(c.args).startsWith('watch '));
  const reportCalls = () => calls().filter((c) => promptOf(c.args).startsWith('report '));
  function primeAndPlan(): string {
    reply(1, PRIMED);
    reply(2, 'plan-asks.jsonl');
    reply(3, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    const config = fourSteps();
    config.steps = config.steps.slice(0, 2);
    return newRun(config);
  }

  it('each ended turn gets a watcher whose reply lands in notes.md', async () => {
    writeFileSync(join(box.fake, 'watch.jsonl'), said(NOTE));
    const dir = primeAndPlan();
    await drive(dir);
    const notes = readFileSync(join(dir, 'notes.md'), 'utf8');
    assert.ok(notes.includes(`## 02 Plan, turn 0\n\n${NOTE}\n`), notes);
    assert.ok(notes.includes('## 01 Prime, turn 0\n'));
    assert.ok(notes.includes('## 02 Plan, turn 1\n'));
    const run = loadRun(dir)!;
    assert.deepEqual(run.steps.flatMap((s) => s.turns.map((t) => t.watched)), ['noted', 'noted', 'noted']);
    assert.deepEqual(watchCalls().map((c) => promptOf(c.args)),
      ['prime 0', 'plan 0', 'plan 1'].map((s) => `watch run=${dir} step=${s.split(' ')[0]} turn=${s.split(' ')[1]}`));
    const args = watchCalls()[0].args;
    assert.equal(flag(args, '--model'), 'claude-sonnet-5-5');
    assert.deepEqual(JSON.parse(flag(args, '--settings')!), { modelSettings: { 'claude-sonnet-5-5': { effortLevel: 'medium' } } });
    assert.match(flag(args, '--append-system-prompt')!, /^# Watch one turn of a run/);
    assert.ok(existsSync(join(dir, 'watch', '02-plan-0.jsonl')));
  });

  it('a failed watcher never holds the run', async () => {
    writeFileSync(join(box.fake, 'watch.jsonl'), init('s-agent') + '\n');
    writeFileSync(join(box.fake, 'watch.exit'), '1');
    const dir = primeAndPlan();
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[1].turns.length, 2);
    assert.equal(run.steps[1].state, 'done');
    assert.deepEqual(run.steps.flatMap((s) => s.turns.map((t) => t.watched)), ['failed', 'failed', 'failed']);
  });

  it('the report is written after every watcher, from a read-only session', async () => {
    writeFileSync(join(box.fake, 'watch.jsonl'), said(NOTE));
    writeFileSync(join(box.fake, 'watch.sleep'), '0.5');
    writeFileSync(join(box.fake, 'report.jsonl'), said('# first-run: done\n\n## The run in numbers\n'));
    const dir = primeAndPlan();
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(readFileSync(join(dir, 'report.md'), 'utf8'), '# first-run: done\n\n## The run in numbers\n');
    assert.equal(run.report, 'written');
    assert.equal(reportCalls().length, 1);
    const args = reportCalls()[0].args;
    assert.equal(promptOf(args), `report run=${dir}`);
    assert.equal(flag(args, '--permission-mode'), 'dontAsk');
    assert.deepEqual(args.slice(args.indexOf('--allowedTools') + 1, args.indexOf('--allowedTools') + 4), ['Read', 'Grep', 'Glob']);
    assert.equal(flag(args, '--model'), 'claude-opus-5-5');
    assert.match(flag(args, '--append-system-prompt')!, /^# Report on one run/);
    // Every watcher had written its note before the reporter read the notes.
    const saw = readFileSync(join(box.fake, 'report-saw-notes.md'), 'utf8');
    assert.equal(saw.split('## ').length - 1, 3);
    assert.equal(run.driverPid, null);
  });

  it('a run ended early gets its report', async () => {
    seams.patience = 8000;
    writeFileSync(join(box.fake, 'report.jsonl'), said('# first-run: ended early\n'));
    reply(1, 'plan-asks.jsonl');
    const dir = newRun(fourSteps({ steps: [{ ...fourSteps().steps[1], session: 'new' }] }), 'Drop the progress bar.', true);
    const running = drive(dir);
    await until(dir, (r) => r.steps[0].state === 'waiting');
    saveAnswer(dir, 'plan', 0, { kind: 'end', text: '', at: new Date().toISOString() });
    await running;
    assert.equal(readFileSync(join(dir, 'report.md'), 'utf8'), '# first-run: ended early\n');
    assert.equal(loadRun(dir)!.state, 'ended');
    assert.equal(reportCalls().length, 1);
  });

  it('a failed reporter says so', async () => {
    writeFileSync(join(box.fake, 'report.exit'), '1');
    reply(1, PRIMED);
    const config = fourSteps();
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    await drive(dir);
    assert.equal(loadRun(dir)!.report, 'failed');
    const text = readFileSync(join(dir, 'report.md'), 'utf8');
    assert.match(text, /reporter failed/);
    assert.match(text, /report\.jsonl/);
  });
});
