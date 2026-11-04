// node --no-warnings --test tests/run-workflow/turn.test.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { loadRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { Ticker } from '../../skills/run-workflow/scripts/watchdog.ts';
import { PRIMED, box, flag, fourSteps, init, newRun, promptOf, reply, result, stepCalls, useBox } from './helpers.ts';

useBox();

describe('a turn', () => {
  it('the prompt and an answer reach claude exactly', async () => {
    reply(1, 'plan-asks.jsonl');
    reply(2, 'plan-asks.jsonl');
    reply(3, 'plan-asks.jsonl');
    reply(4, 'plan-finished.jsonl', { touch: ['.agents/plans/p.md'] });
    const request = 'a “quoted” line\nand a second line $& $1 \\n \'single\'';
    // An answer that starts with "-" is a bulleted list to the developer and an option to the CLI.
    const answers = ['take "the" recommendations\n  — and “this”', '- Top out at 90%\n- Keep 50–59% strong', '--help'];
    const step = { ...fourSteps().steps[1], session: 'new', answers };
    const dir = newRun(fourSteps({ steps: [step] }), request);
    await drive(dir);
    const sent = stepCalls().map((c) => promptOf(c.args));
    assert.deepEqual(sent, [`/dk-generate-plan ${request}`, ...answers]);
    // The prompt is the last word, after every option.
    for (const { args } of stepCalls()) assert.deepEqual(args.slice(-2), ['--', promptOf(args)]);
  });

  it('every turn carries the guards, resumed or not', async () => {
    reply(1, [init('s-1'), result('Primed.', 0.5, 's-1')]);
    reply(2, [init('s-1'), result('Planned. /dk-execute-plan', 0.9, 's-1')], { touch: ['.agents/plans/p.md'] });
    const config = fourSteps({
      deny: ['Read(//elsewhere/**)', 'Bash(ssh:*)'], note: 'Your dev server runs on port 4000.', permissionMode: 'acceptEdits',
      settings: { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'own-hook', timeout: 5 }]}]}, env: { A: '1' } }
    });
    config.steps = config.steps.slice(0, 2);
    config.steps[0].effort = { 'claude-opus-5-5': 'xhigh' };
    config.steps[1].effort = { 'claude-opus-5-5': 'high', 'claude-sonnet-5-5': 'medium' };
    const dir = newRun(config);
    await drive(dir);
    const log = readFileSync(join(box.fake, 'caffeinate.log'), 'utf8').split('\n').filter((l) => l.startsWith('caffeinate -dims claude -p'));
    assert.equal(log.length, 2);
    const [first, second] = stepCalls().map((c) => c.args);
    for (const [args, effort] of [[first, { 'claude-opus-5-5': { effortLevel: 'xhigh' } }],
      [second, { 'claude-opus-5-5': { effortLevel: 'high' }, 'claude-sonnet-5-5': { effortLevel: 'medium' } }]] as const) {
      const settings = JSON.parse(flag(args, '--settings')!);
      assert.match(settings.hooks.PreToolUse[0].hooks[0].command, /deny-git-writes\.ts"$/);
      assert.equal(settings.hooks.PreToolUse[0].matcher, 'Bash');
      assert.equal(settings.hooks.PreToolUse[1].hooks[0].command, 'own-hook');
      assert.deepEqual(settings.modelSettings, effort);
      assert.deepEqual(settings.env, { A: '1' });
      assert.equal(flag(args, '--permission-mode'), 'acceptEdits');
      assert.equal(flag(args, '--model'), 'claude-opus-5-5');
      assert.equal(flag(args, '--output-format'), 'stream-json');
      assert.ok(args.includes('--verbose'));
      assert.deepEqual(args.slice(args.indexOf('--disallowedTools') + 1, args.indexOf('--')), ['Read(//elsewhere/**)', 'Bash(ssh:*)']);
    }
    assert.equal(flag(first, '--resume'), undefined);
    assert.equal(flag(second, '--resume'), 's-1');
    assert.equal(flag(first, '--append-system-prompt'), 'Your dev server runs on port 4000.');
    assert.equal(flag(second, '--append-system-prompt'), undefined);
  });

  it("the project's own wrappers come first on the step's PATH", async () => {
    mkdirSync(join(box.root, 'bin'));
    writeFileSync(join(box.root, 'bin', 'agent-browser'), '#!/bin/sh\n', { mode: 0o755 });
    reply(1, PRIMED);
    const config = fourSteps({ path: ['bin'] });
    config.steps = config.steps.slice(0, 1);
    await drive(newRun(config));
    assert.ok(stepCalls()[0].env.PATH.startsWith(resolve(box.root, 'bin') + ':'), stepCalls()[0].env.PATH);
  });

  it('the env file is sourced for the step and never written down', async () => {
    writeFileSync(join(box.root, 'secrets.env'), 'SECRET_FOR_TEST=k3y-value\necho printed-by-the-env-file\n');
    reply(1, PRIMED);
    const config = fourSteps({ envFile: 'secrets.env' });
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    await drive(dir);
    assert.equal(stepCalls()[0].env.SECRET_FOR_TEST, 'k3y-value');
    const leaked = spawnSync('grep', ['-r', '-l', '-e', 'k3y-value', '-e', 'printed-by-the-env-file', dir], { encoding: 'utf8' }).stdout;
    assert.equal(leaked, '');
    assert.equal(loadRun(dir)!.steps[0].state, 'done');
  });

  it('each run has its own TMPDIR', async () => {
    reply(1, PRIMED);
    const config = fourSteps();
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    await drive(dir);
    assert.equal(stepCalls()[0].env.TMPDIR, join(dir, 'tmp'));
    assert.equal(stepCalls()[0].env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS, '0');
  });

  it("a turn's cost is its own", async () => {
    reply(1, [init('s-1'), result('Primed.', 0.71, 's-1')]);
    reply(2, [init('s-1'), result('Planned. /dk-execute-plan', 0.9229, 's-1')], { touch: ['.agents/plans/p.md'] });
    const config = fourSteps();
    config.steps = config.steps.slice(0, 2);
    const dir = newRun(config);
    await drive(dir);
    const run = loadRun(dir)!;
    assert.deepEqual([run.steps[0].turns[0].cost, run.steps[1].turns[0].cost].map((c) => c!.toFixed(4)), ['0.7100', '0.2129']);
    assert.deepEqual([run.steps[0].turns[0].sessionCost, run.steps[1].turns[0].sessionCost], [0.71, 0.9229]);
  });

  it('a gap the Ticker sees is left out of the step\'s time', async () => {
    let jumped = false;
    let ticks = 0;
    const fake = () => Date.now() + (jumped ? 3_600_000 : 0);
    const ticker = new Ticker({ every: 100, now: fake, onTick: () => void (++ticks === 2 && (jumped = true)) });
    await new Promise((done) => setTimeout(done, 450));
    ticker.stop();
    // The gap less one interval: the hour, give or take a tick's lateness.
    assert.ok(Math.abs(ticker.asleep - 3_600_000) < 150, String(ticker.asleep));

    // The same jump inside a turn: its time leaves the hour out.
    let calls = 0;
    seams.tickMs = 100;
    seams.now = () => Date.now() + (++calls > 3 ? 3_600_000 : 0);
    reply(1, PRIMED, { sleep: 0.6 });
    const config = fourSteps();
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    await drive(dir);
    const seconds = loadRun(dir)!.steps[0].turns[0].seconds!;
    assert.ok(seconds < 5 && seconds > 0.3, String(seconds));
  });
});
