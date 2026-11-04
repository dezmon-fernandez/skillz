// node --no-warnings --test tests/run-workflow/watchdog.test.ts
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { loadRun, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { exitOf } from '../../skills/run-workflow/scripts/turn.ts';
import { PRIMED, bin, box, fourSteps, newRun, reply, sampleLines, until, useBox } from './helpers.ts';

useBox();

describe('the watchdog', { skip: process.platform !== 'darwin' && 'lsof and nc as on macOS' }, () => {
  async function freePort(): Promise<number> {
    const server = createServer();
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const { port } = server.address() as { port: number };
    await new Promise((done) => server.close(done));
    return port;
  }
  // A turn that leaves a dev server on the port, with the transcript the CLI would have written.
  async function leftRunning(transcript: string[]): Promise<{ dir: string; port: number; running: Promise<number> }> {
    const port = await freePort();
    reply(1, PRIMED);
    writeFileSync(join(box.fake, 'reply-1.hold'), String(port));
    writeFileSync(join(box.fake, 'reply-1.transcript'), transcript.join('\n') + '\n');
    const config = fourSteps({ ports: [port], watchdogWait: 1 });
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    // The session's transcript, where the CLI keeps it for this workdir.
    const path = join(process.env.CLAUDE_CONFIG_DIR!, 'projects', loadRun(dir)!.workdir.replace(/[^A-Za-z0-9]/g, '-'), 's-prime.jsonl');
    writeFileSync(join(box.fake, 'reply-1.transcript-path'), path);
    return { dir, port, running: drive(dir) };
  }
  const listening = (port: number) => spawnSync('lsof', ['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout.trim();

  it('a dev server left running is stopped once the turn is over and quiet', { timeout: 40_000 }, async () => {
    const { dir, port, running } = await leftRunning(sampleLines('transcript-tail.jsonl'));
    const t0 = Date.now();
    await running;
    assert.ok(Date.now() - t0 < 30_000);
    const pid = readFileSync(join(box.fake, 'reply-1.listener'), 'utf8').trim();
    const events = readFileSync(join(dir, 'events.log'), 'utf8');
    assert.match(events, new RegExp(`freed port ${port} \\(pid ${pid}\\) after the turn was over for 1 s`));
    assert.equal(listening(port), '');
    assert.equal(loadRun(dir)!.steps[0].state, 'done');
  });

  it('a dev server left by a turn whose driver stopped is stopped too', { timeout: 40_000 }, async () => {
    const port = await freePort();
    reply(1, PRIMED);
    writeFileSync(join(box.fake, 'reply-1.hold'), String(port));
    writeFileSync(join(box.fake, 'reply-1.transcript'), sampleLines('transcript-tail.jsonl').join('\n') + '\n');
    const config = fourSteps({ ports: [port], watchdogWait: 1 });
    config.steps = config.steps.slice(0, 1);
    const dir = newRun(config);
    const run = loadRun(dir)!;
    writeFileSync(join(box.fake, 'reply-1.transcript-path'),
      join(process.env.CLAUDE_CONFIG_DIR!, 'projects', run.workdir.replace(/[^A-Za-z0-9]/g, '-'), 's-prime.jsonl'));
    // The turn as a killed driver left it: running, its claude still holding the port.
    const log = 'steps/01-prime-0.jsonl';
    const fd = openSync(join(dir, log), 'w');
    const orphan = spawn(join(bin, 'claude'), ['-p', '--', '/prime'], { cwd: run.workdir, stdio: ['ignore', fd, fd] });
    const gone = exitOf(orphan);
    closeSync(fd);
    run.state = 'running';
    run.steps[0] = { ...run.steps[0], state: 'running', turns: [{ n: 0, prompt: '/prime', by: 'config', log, started: run.started,
      ended: null, seconds: null, exit: null, sessionCost: null, cost: null, watched: 'no', pid: orphan.pid }] };
    saveRun(dir, run);
    try {
      await drive(dir);
    } finally {
      orphan.kill();
      await gone;
    }
    assert.match(readFileSync(join(dir, 'events.log'), 'utf8'), new RegExp(`freed port ${port} `));
    assert.equal(listening(port), '');
    assert.equal(loadRun(dir)!.steps[0].state, 'done');
  });

  it('a turn still working is never touched', async () => {
    const { dir, port, running } = await leftRunning(sampleLines('transcript-tail.jsonl').slice(0, -3));
    await until(dir, () => listening(port) !== '');
    await new Promise((done) => setTimeout(done, 3000));
    assert.notEqual(listening(port), '');
    assert.equal(existsSync(join(dir, 'events.log')), false);
    process.kill(Number(readFileSync(join(box.fake, 'reply-1.listener'), 'utf8').trim()));
    await running;
  });
});
