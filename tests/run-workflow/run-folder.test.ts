// node --no-warnings --test tests/run-workflow/run-folder.test.ts
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { driverAlive, loadRun, register, registered, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import type { Run } from '../../skills/run-workflow/scripts/types.ts';
import { removeTemps, temp } from './helpers.ts';

after(removeTemps);

function aRun(id: string, started: string): Run {
  const turn = (n: number) => ({
    n, prompt: `p${n}`, by: 'config' as const, log: `steps/02-plan-${n}.jsonl`, started, ended: started, seconds: 3,
    exit: 0, sessionCost: 0.5 + n, cost: 0.5, watched: 'noted' as const
  });
  return {
    id, name: 'demo', config: '/c.json', workdir: '/w', base: 'abc', started, state: 'running', reason: '',
    driverPid: null, report: 'none',
    steps: [
      { id: 'prime', label: 'Prime', state: 'done', reason: '', session: 's', file: null, turns: [turn(0)] },
      { id: 'plan', label: 'Plan', state: 'running', reason: '', session: 's', file: null, turns: [turn(0), turn(1)] }
    ]
  };
}

describe("the run's folder", () => {
  it('saveRun is atomic and loadRun round-trips', () => {
    const dir = temp();
    const run = aRun('r1', '2026-11-04T10:00:00Z');
    saveRun(dir, run);
    assert.deepEqual(loadRun(dir), run);
    assert.deepEqual(readdirSync(dir), ['run.json']);
  });

  it('registered skips a folder that is gone and lists newest first', () => {
    const before = process.env.RUN_WORKFLOW_HOME;
    process.env.RUN_WORKFLOW_HOME = temp();
    try {
      const dirs = ['2026-11-01T00:00:00Z', '2026-11-03T00:00:00Z', '2026-11-02T00:00:00Z'].map((started, i) => {
        const dir = temp();
        saveRun(dir, aRun(`r${i}`, started));
        register(dir);
        return resolve(dir);
      });
      register(dirs[0]);
      rmSync(dirs[2], { recursive: true });
      assert.deepEqual(registered(), [dirs[1], dirs[0]]);
    } finally {
      if (before === undefined) delete process.env.RUN_WORKFLOW_HOME;
      else process.env.RUN_WORKFLOW_HOME = before;
    }
  });

  it('driverAlive is false for a pid file whose process is gone or is not a driver', async () => {
    const dir = temp();
    const child = spawn('true');
    await new Promise((done) => child.on('exit', done));
    writeFileSync(join(dir, 'driver.pid'), `${child.pid}\n`);
    assert.equal(driverAlive(dir), false);
    writeFileSync(join(dir, 'driver.pid'), `${process.pid}\n`);
    assert.equal(driverAlive(dir), false);
  });

  it('driverAlive is true for a live driver of this folder', async () => {
    const dir = temp();
    mkdirSync(join(dir, 'x'));
    // A stand-in whose command line reads as this folder's driver.
    const child = spawn('bash', ['-c', 'sleep 30; :', 'run.ts drive', resolve(dir)], { stdio: 'ignore' });
    try {
      await new Promise((done) => setTimeout(done, 200));
      writeFileSync(join(dir, 'driver.pid'), `${child.pid}\n`);
      assert.equal(driverAlive(dir), true);
    } finally {
      child.kill();
    }
  });
});
