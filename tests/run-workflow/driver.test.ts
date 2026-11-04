// node --no-warnings --test tests/run-workflow/driver.test.ts
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { saveAnswer } from '../../skills/run-workflow/scripts/answers.ts';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { exitOf } from '../../skills/run-workflow/scripts/turn.ts';
import { aliveAs, loadRun, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import {
  PRIMED, answered, bin, box, decisions, exampleOne, flag, fourSteps, init, newRun, promptOf, reply, sampleLines, stepCalls,
  until, useBox
} from './helpers.ts';

useBox();

describe('the driver in speed mode', () => {
  it("speed answers the plan's stops from the config and moves on when it finishes", async () => {
    const dir = exampleOne();
    await drive(dir);
    const run = loadRun(dir)!;
    const plan = run.steps[1];
    assert.deepEqual(plan.turns.map((t) => t.prompt), ['/dk-generate-plan Drop the progress bar.', 'take the recommendations', 'approved, go ahead', 'take the recommendations']);
    assert.deepEqual(plan.turns.map((t) => t.by), ['config', 'config', 'config', 'config']);
    assert.equal(plan.state, 'done');
    assert.equal(plan.file, '.agents/plans/p.md');
    assert.equal(run.steps[2].turns[0].prompt, '/dk-execute-plan .agents/plans/p.md');
    assert.equal(run.steps[3].turns.length, 1);
    assert.deepEqual(run.steps.map((s) => s.state), ['done', 'done', 'done', 'done']);
    assert.equal(run.state, 'done');
  });

  it('a step with no done has finished when its first turn ends', async () => {
    reply(1, 'requirements-stop.jsonl');
    reply(2, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    const config = fourSteps();
    config.steps = config.steps.slice(0, 2);
    const dir = newRun(config);
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].turns.length, 1);
    assert.equal(run.steps[0].state, 'done');
    assert.equal(run.steps[1].turns[0].prompt, '/dk-generate-plan Drop the progress bar.');
    const found = decisions(dir).filter((d) => d.step === 'prime');
    assert.equal(found.filter((d) => d.kind === 'decided-alone').length, 3);
    assert.equal(answered(found).length, 0);
  });

  it('a review that asks nothing is not answered', async () => {
    reply(1, 'review-no-questions.jsonl', { touch: ['.agents/code-reviews/r.md'] });
    const dir = newRun(fourSteps({ steps: [{ ...fourSteps().steps[3], session: 'new', prompt: '/dk-review-code' }] }));
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].turns.length, 1);
    assert.equal(run.steps[0].state, 'done');
    assert.equal(answered(decisions(dir)).length, 0);
  });

  it('a failed turn stops the run and waits', async () => {
    reply(1, [init('s-1'), 'Error: the model is overloaded'], { exit: 1 });
    reply(2, PRIMED);
    const config = fourSteps();
    config.steps = config.steps.slice(0, 2);
    const dir = newRun(config);
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].state, 'failed');
    assert.match(run.steps[0].reason, /exited with 1/);
    assert.match(run.steps[0].reason, /the model is overloaded/);
    assert.equal(run.state, 'waiting');
    assert.equal(stepCalls().length, 1);

    // Killed after its result line was written: the exit status still fails it.
    rmSync(box.fake, { recursive: true });
    mkdirSync(box.fake);
    reply(1, PRIMED, { exit: 143 });
    const killed = newRun({ ...config, runs: 'runs-2' });
    await drive(killed);
    assert.equal(loadRun(killed)!.steps[0].state, 'failed');
    assert.match(loadRun(killed)!.steps[0].reason, /exited with 143/);
  });

  // A run whose plan step is at turn 1, as a driver that stopped there left it.
  function stoppedAt(logLines: string[]): string {
    const step = { ...fourSteps().steps[1], session: 'new', done: { file: '.agents/plans/*.md' } };
    const dir = newRun(fourSteps({ steps: [step] }));
    const run = loadRun(dir)!;
    const turn = (n: number, prompt: string, ended: boolean) => ({
      n, prompt, by: 'config' as const, log: `steps/01-plan-${n}.jsonl`, started: run.started, ended: ended ? run.started : null,
      seconds: ended ? 1 : null, exit: ended ? 0 : null, sessionCost: ended ? 0.5 : null, cost: ended ? 0.5 : null, watched: 'noted' as const
    });
    run.steps[0] = { ...run.steps[0], state: 'running', session: 'd927ec62-fc1a-4016-9073-c3b01d3098bc',
      turns: [turn(0, '/dk-generate-plan Drop the progress bar.', true), turn(1, 'take the recommendations', false)] };
    saveRun(dir, run);
    writeFileSync(join(dir, 'steps/01-plan-0.jsonl'), sampleLines('plan-asks.jsonl').join('\n') + '\n');
    writeFileSync(join(dir, 'steps/01-plan-1.jsonl'), logLines.join('\n') + '\n');
    return dir;
  }

  it('a restarted driver sends no ended turn again', async () => {
    reply(1, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    const ended = stoppedAt(sampleLines('plan-asks.jsonl'));
    await drive(ended);
    let run = loadRun(ended)!;
    assert.deepEqual(stepCalls().map((c) => promptOf(c.args)), ['approved, go ahead']);
    assert.deepEqual(run.steps[0].turns.map((t) => t.prompt), ['/dk-generate-plan Drop the progress bar.', 'take the recommendations', 'approved, go ahead']);
    assert.equal(run.steps[0].turns[1].exit, 0);
    assert.equal(run.steps[0].turns[1].sessionCost, 0.9228997999999999);
    assert.equal(run.steps[0].state, 'done');

    const cut = stoppedAt(sampleLines('plan-asks.jsonl').slice(0, -1));
    await drive(cut);
    run = loadRun(cut)!;
    assert.equal(run.steps[0].state, 'failed');
    assert.equal(run.steps[0].reason, 'cut off when the driver stopped');
    assert.equal(run.steps[0].turns.length, 2);
    assert.equal(stepCalls().length, 1);
  });

  it('a turn whose claude outlived its driver is waited for, not cut off', async () => {
    reply(1, 'plan-asks.jsonl', { sleep: 0.6 });
    reply(2, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    const dir = stoppedAt([]);
    // The turn's claude, still working after its driver was killed, writing to the turn's log.
    const fd = openSync(join(dir, 'steps/01-plan-1.jsonl'), 'w');
    const orphan = spawn(join(bin, 'claude'), ['-p', '--', 'take the recommendations'], { cwd: box.workdir, stdio: ['ignore', fd, fd] });
    const gone = exitOf(orphan);
    closeSync(fd);
    const run = loadRun(dir)!;
    run.steps[0].turns[1].pid = orphan.pid;
    saveRun(dir, run);
    try {
      await drive(dir);
    } finally {
      orphan.kill();
      await gone;
    }
    const after = loadRun(dir)!;
    assert.equal(after.steps[0].turns[1].exit, 0);
    assert.deepEqual(stepCalls().map((c) => promptOf(c.args)), ['take the recommendations', 'approved, go ahead']);
    assert.equal(after.steps[0].state, 'done');
  });

  it('a running turn records its process, and drops it once it ends', async () => {
    reply(1, PRIMED, { sleep: 0.6 });
    const config = fourSteps();
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    const running = drive(dir);
    const during = await until(dir, (r) => r.steps[0].turns[0]?.pid !== undefined);
    assert.ok(aliveAs(during.steps[0].turns[0].pid!, 'claude -p'));
    await running;
    assert.equal(loadRun(dir)!.steps[0].turns[0].pid, undefined);
  });

  it('a cut-off turn is retried in the session it started', async () => {
    reply(1, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    const dir = stoppedAt(sampleLines('plan-asks.jsonl').slice(0, -1));
    // The turn started the step's session: none was recorded before it was cut off.
    const run = loadRun(dir)!;
    run.steps[0].session = null;
    saveRun(dir, run);
    await drive(dir);
    assert.equal(loadRun(dir)!.steps[0].state, 'failed');
    saveAnswer(dir, 'plan', 1, { kind: 'retry', text: '', at: new Date().toISOString() });
    await drive(dir);
    assert.equal(flag(stepCalls()[0].args, '--resume'), 'd927ec62-fc1a-4016-9073-c3b01d3098bc');
    assert.equal(loadRun(dir)!.steps[0].state, 'done');
  });

  it('a second driver exits while the first is alive', async () => {
    reply(1, PRIMED, { sleep: 0.8 });
    const config = fourSteps();
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    const first = drive(dir);
    await new Promise((done) => setTimeout(done, 200));
    const t0 = Date.now();
    assert.equal(await drive(dir), 0);
    assert.ok(Date.now() - t0 < 300);
    await first;
    assert.equal(stepCalls().length, 1);
    assert.equal(loadRun(dir)!.steps[0].state, 'done');
  });

  it('{file:plan} with no plan file stops before the build', async () => {
    reply(1, 'plan-finished.jsonl');
    const config = fourSteps();
    config.steps = config.steps.slice(1, 3);
    config.steps[0] = { ...config.steps[0], session: 'new', done: { says: '/dk-execute-plan' } };
    const dir = newRun(config);
    await drive(dir);
    const run = loadRun(dir)!;
    assert.equal(run.steps[0].state, 'done');
    assert.equal(run.state, 'failed');
    assert.match(run.reason, /\{file:plan\}/);
    assert.match(run.reason, /Plan/);
    assert.equal(run.steps[1].turns.length, 0);
    assert.equal(stepCalls().length, 1);
  });

  it('snapshots keep the plan as it was after each turn', async () => {
    const dir = exampleOne();
    await drive(dir);
    const shots = readdirSync(join(dir, 'snapshots'));
    for (const n of [1, 2, 3]) assert.ok(shots.includes(`02-plan-${n}-p.md`), JSON.stringify(shots));
    assert.ok(!shots.includes('02-plan-0-p.md'));
    assert.ok(shots.includes('02-plan-0.patch'));
  });
});
