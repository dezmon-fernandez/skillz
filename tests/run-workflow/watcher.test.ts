// node --no-warnings --test tests/run-workflow/watcher.test.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { saveAnswer } from '../../skills/run-workflow/scripts/answers.ts';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { loadRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { readWatch } from '../../skills/run-workflow/scripts/watcher.ts';
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

  it("the watcher's stop line becomes the turn's stop, and the notes keep the rest", async () => {
    const note = '- Brief the agents with a model. Evidence: steps/02-grill-0.jsonl:12';
    writeFileSync(join(box.fake, 'watch.jsonl'), said(`Stop: Grill · asked 4 questions on scope\n${note}`));
    const dir = primeAndPlan();
    await drive(dir);
    const turn = loadRun(dir)!.steps[1].turns[0];
    assert.deepEqual(turn.stop, { part: 'Grill', why: 'asked 4 questions on scope' });
    const notes = readFileSync(join(dir, 'notes.md'), 'utf8');
    assert.ok(notes.includes(`## 02 Plan, turn 0\n\n${note}\n\n`), notes);
    assert.ok(!notes.includes('Stop:'), notes);
  });

  it("the watcher's answer line reaches the turn", async () => {
    const lines = 'Stop: Grill · asked 5 questions\nAnswer: took 3 of 4 recommendations · differed: Q2 Edge cases, Q5 Leaving mid-save';
    writeFileSync(join(box.fake, 'watch.jsonl'), said(`${lines}\n- A note.`));
    const dir = primeAndPlan();
    await drive(dir);
    assert.deepEqual(loadRun(dir)!.steps[1].turns[0].answered,
      { took: 3, of: 4, differed: ['Q2 Edge cases', 'Q5 Leaving mid-save'] });
  });

  it('a reply with no stop line leaves the turn without one, and the notes whole', async () => {
    writeFileSync(join(box.fake, 'watch.jsonl'), said('- A note. Evidence: "x"'));
    const dir = primeAndPlan();
    await drive(dir);
    const turn = loadRun(dir)!.steps[1].turns[0];
    assert.equal(turn.stop, undefined);
    assert.equal(turn.answered, undefined);
    assert.ok(readFileSync(join(dir, 'notes.md'), 'utf8').includes('## 02 Plan, turn 0\n\n- A note. Evidence: "x"\n'));
  });

  it('a failed watcher leaves no stop', async () => {
    writeFileSync(join(box.fake, 'watch.jsonl'), said('Stop: Grill · asked 4 questions on scope'));
    writeFileSync(join(box.fake, 'watch.exit'), '1');
    const dir = primeAndPlan();
    await drive(dir);
    const turn = loadRun(dir)!.steps[1].turns[0];
    assert.equal(turn.watched, 'failed');
    assert.equal(turn.stop, undefined);
    assert.equal(existsSync(join(dir, 'notes.md')) ? readFileSync(join(dir, 'notes.md'), 'utf8') : '', '');
  });
});

describe("the watcher's first lines", () => {
  it('a part off the list is unknown part', () => {
    assert.deepEqual(readWatch('Stop: Planning · asked 2 questions\n- A note.').stop, { part: 'unknown part', why: 'asked 2 questions' });
  });

  it("the answer line becomes the turn's answered", () => {
    const got = readWatch('Stop: Grill · asked 5 questions\nAnswer: took 3 of 4 recommendations · differed: Q2 Edge cases, Q5 Leaving mid-save\n- A note.');
    assert.deepEqual(got.answered, { took: 3, of: 4, differed: ['Q2 Edge cases', 'Q5 Leaving mid-save'] });
    assert.equal(got.notes, '- A note.');
  });

  it('an answer that took every recommendation differs on none', () => {
    assert.deepEqual(readWatch('Stop: Finished · finished\nAnswer: took 4 of 4 recommendations · differed: none\nNothing to note.').answered,
      { took: 4, of: 4, differed: [] });
  });

  it('a malformed answer line stays in the notes', () => {
    const got = readWatch('Stop: Design · asked 1 question\nAnswer: mostly\n- A note.');
    assert.equal(got.answered, null);
    assert.deepEqual(got.stop, { part: 'Design', why: 'asked 1 question' });
    assert.equal(got.notes, 'Answer: mostly\n- A note.');
  });
});
