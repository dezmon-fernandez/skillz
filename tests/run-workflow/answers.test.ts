// node --no-warnings --test tests/run-workflow/answers.test.ts
import assert from 'node:assert/strict';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { readAnswer, readMode, saveAnswer, writeMode } from '../../skills/run-workflow/scripts/answers.ts';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { loadRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/seams.ts';
import {
  PRIMED, answered, decisions, exampleOne, flag, fourSteps, init, newRun, promptOf, removeTemps, reply, result, stepCalls,
  temp, until, useBox
} from './helpers.ts';

useBox();
after(removeTemps);

describe('the answer files and the mode', () => {
  it('saveAnswer creates once; a second save of the same turn returns false', () => {
    const dir = temp();
    assert.equal(saveAnswer(dir, 'plan', 1, { kind: 'reply', text: 'first', at: 'a' }), true);
    assert.equal(saveAnswer(dir, 'plan', 1, { kind: 'reply', text: 'second', at: 'b' }), false);
    assert.equal(readAnswer(dir, 'plan', 1)?.text, 'first');
    assert.deepEqual(readdirSync(join(dir, 'answers')), ['plan-1.json']);
  });

  it('an unknown or missing mode reads as speed', () => {
    const dir = temp();
    assert.equal(readMode(dir), 'speed');
    writeFileSync(join(dir, 'mode'), 'fast\n');
    assert.equal(readMode(dir), 'speed');
    writeMode(dir, 'slot-in');
    assert.equal(readMode(dir), 'slot-in');
  });
});

describe('the driver in speed mode', () => {
  it('every answer sent is logged with the questions it accepted', async () => {
    const dir = exampleOne();
    await drive(dir);
    const found = decisions(dir);
    const sent = answered(found);
    assert.deepEqual(sent.map((d) => [d.step, d.turn, d.answer, d.by]),
      [['plan', 0, 'take all reccs', 'config'], ['plan', 1, 'approve lets go', 'config'], ['plan', 2, 'take all reccs', 'config']]);
    assert.equal(sent[0].questions.length, 3);
    assert.equal(sent[0].questions[0][0], 'Where does the percent reach full colour?');
    assert.equal(sent[0].evidence, 'steps/02-plan-0.jsonl:30');
    const alone = found.filter((d) => d.kind === 'decided-alone' && d.step === 'plan' && d.turn === 1);
    assert.equal(alone.length, 3);
    assert.equal(alone[0].questions[0][0], 'Size');
  });

  it('answers used up leave the step waiting, with the reason', async () => {
    reply(1, 'plan-asks.jsonl');
    reply(2, 'plan-asks.jsonl');
    reply(3, PRIMED);
    const step = { id: 'plan', label: 'Plan', prompt: '/dk-generate-plan {request}', session: 'new',
      done: { file: '.agents/plans/*.md' }, answers: ['take all reccs'] };
    const dir = newRun(fourSteps({ steps: [step] }));
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].state, 'waiting');
    assert.equal(run.steps[0].reason, "the config's 1 answer ran out without .agents/plans/*.md");
    assert.equal(run.state, 'waiting');
    assert.equal(stepCalls().length, 2);
    assert.equal(run.driverPid, null);
    assert.equal(existsSync(join(dir, 'driver.pid')), false);
  });
});

describe('the developer slots in', () => {
  beforeEach(() => {
    seams.patience = 8000;
  });
  const planOnly = (over: Record<string, unknown> = {}) =>
    fourSteps({ steps: [{ ...fourSteps().steps[1], session: 'new', ...over }, { ...fourSteps().steps[2] }] });

  it("slotted in, a stop waits, and the developer's words go to the step exactly", async () => {
    reply(1, 'plan-asks.jsonl');
    reply(2, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    reply(3, [init('s-build'), result('Built.', 1, 's-build')], { touch: ['.agents/execution-reports/r.md'] });
    const dir = newRun(planOnly(), 'Drop the bar.', true);
    const running = drive(dir);
    const waiting = await until(dir, (r) => r.steps[0].state === 'waiting');
    assert.match(waiting.steps[0].reason, /^slotted in/);
    assert.equal(stepCalls().length, 1);
    const words = 'Top out at 90%.\nKeep 50–59% strong, “as now”.';
    saveAnswer(dir, 'plan', 0, { kind: 'reply', text: words, at: new Date().toISOString() });
    await running;
    assert.equal(promptOf(stepCalls()[1].args), words);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].turns[1].by, 'developer');
    const sent = answered(decisions(dir));
    assert.deepEqual(sent.map((d) => [d.turn, d.answer, d.by]), [[0, words, 'developer']]);
    assert.equal(sent[0].questions.length, 3);
    assert.equal(run.steps[0].state, 'done');
  });

  it('slotted in, a finished step that asks still waits', async () => {
    reply(1, 'requirements-stop.jsonl');
    const config = fourSteps();
    config.steps = config.steps.slice(0, 2);
    const dir = newRun(config, 'Drop the bar.', true);
    seams.patience = 400;
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].state, 'waiting');
    assert.equal(run.steps[0].reason, 'slotted in: its reply asks');
    assert.equal(stepCalls().length, 1);
  });

  it('switching to speed answers a stop already waiting', async () => {
    seams.pollMs = 2000;
    reply(1, 'plan-asks.jsonl');
    reply(2, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    reply(3, [init('s-build'), result('Built.', 1, 's-build')], { touch: ['.agents/execution-reports/r.md'] });
    const dir = newRun(planOnly(), 'Drop the bar.', true);
    const running = drive(dir);
    await until(dir, (r) => r.steps[0].state === 'waiting');
    await new Promise((done) => setTimeout(done, 300));
    assert.equal(stepCalls().length, 1);
    writeMode(dir, 'speed');
    const t0 = Date.now();
    await until(dir, (r) => r.steps[0].turns.length === 2, 4000);
    assert.ok(Date.now() - t0 < 4000);
    await running;
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].turns[1].prompt, 'take all reccs');
    assert.equal(run.steps[0].turns[1].by, 'config');
    assert.deepEqual(answered(decisions(dir)).map((d) => [d.answer, d.by]), [['take all reccs', 'config']]);
  });

  it('go on moves to the next step', async () => {
    reply(1, 'plan-asks.jsonl', { touch: ['.agents/plans/p.md'] });
    reply(2, [init('s-build'), result('Built.', 1, 's-build')], { touch: ['.agents/execution-reports/r.md'] });
    const dir = newRun(planOnly(), 'Drop the bar.', true);
    const running = drive(dir);
    await until(dir, (r) => r.steps[0].state === 'waiting');
    saveAnswer(dir, 'plan', 0, { kind: 'go-on', text: '', at: new Date().toISOString() });
    await running;
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].state, 'done');
    assert.equal(run.steps[0].reason, 'moved on by the developer');
    assert.equal(run.steps[0].turns.length, 1);
    assert.equal(run.steps[1].turns[0].prompt, '/dk-execute-plan .agents/plans/p.md');
    assert.equal(answered(decisions(dir)).length, 0);
  });

  it('retry resends a failed turn; end ends the run and starts the report', async () => {
    reply(1, [init('s-plan'), 'Error: overloaded'], { exit: 1 });
    reply(2, [init('s-plan'), 'Error: overloaded again'], { exit: 1 });
    const dir = newRun(planOnly());
    const running = drive(dir);
    await until(dir, (r) => r.steps[0].state === 'failed');
    saveAnswer(dir, 'plan', 0, { kind: 'retry', text: '', at: new Date().toISOString() });
    await until(dir, (r) => r.steps[0].turns.length === 2 && r.steps[0].state === 'failed');
    const [first, second] = stepCalls().map((c) => c.args);
    assert.equal(promptOf(second), promptOf(first));
    assert.equal(flag(first, '--resume'), undefined);
    assert.equal(flag(second, '--resume'), 's-plan');
    assert.equal(loadRun(dir)!.steps[0].turns[1].retryOf, 0);
    saveAnswer(dir, 'plan', 1, { kind: 'end', text: '', at: new Date().toISOString() });
    await running;
    const run = loadRun(dir)!;
    assert.equal(run.state, 'ended');
    assert.equal(stepCalls().length, 2);
    assert.equal(run.steps[1].turns.length, 0);
  });

  it('a retried answer uses none of the config\'s answers', async () => {
    reply(1, 'plan-asks.jsonl');
    reply(2, [init('d927ec62-fc1a-4016-9073-c3b01d3098bc'), 'Error: overloaded'], { exit: 1 });
    reply(3, 'plan-asks.jsonl');
    reply(4, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    reply(5, [init('s-build'), result('Built.', 1, 's-build')], { touch: ['.agents/execution-reports/r.md'] });
    const dir = newRun(planOnly());
    const running = drive(dir);
    await until(dir, (r) => r.steps[0].state === 'failed');
    saveAnswer(dir, 'plan', 1, { kind: 'retry', text: '', at: new Date().toISOString() });
    await running;
    assert.deepEqual(loadRun(dir)!.steps[0].turns.map((t) => t.prompt),
      ['/dk-generate-plan Drop the bar.', 'take all reccs', 'take all reccs', 'approve lets go']);
  });
});
