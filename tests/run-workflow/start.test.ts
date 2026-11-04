// node --no-warnings --test tests/run-workflow/start.test.ts
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { readMode } from '../../skills/run-workflow/scripts/answers.ts';
import { loadRun, registered } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { resume, start } from '../../skills/run-workflow/scripts/start.ts';
import { box, git, goodConfig, saved, useBox, writeConfig } from './helpers.ts';

useBox();

describe('start', () => {
  const request = 'line one\n“quoted” line two\n';
  const requestFile = () => {
    const path = join(box.root, 'request.txt');
    writeFileSync(path, request);
    return path;
  };
  const runFolder = () => {
    const found = readdirSync(box.runs);
    assert.equal(found.length, 1);
    return join(box.runs, found[0]);
  };

  it('start writes the run, registers it, and spawns the page and the driver', async () => {
    assert.equal(await start(writeConfig(goodConfig()), requestFile(), false), 0);
    const dir = runFolder();
    assert.equal(readFileSync(join(dir, 'request.md'), 'utf8'), request);
    const run = loadRun(dir)!;
    assert.deepEqual(run.steps.map((s) => s.state), ['pending', 'pending']);
    assert.equal(run.base, git(box.workdir, 'rev-parse', 'HEAD'));
    assert.equal(run.workdir, resolve(box.workdir));
    assert.equal(readMode(dir), 'speed');
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')).steps.map((s: any) => s.id), ['prime', 'plan']);
    assert.deepEqual(registered(), [resolve(dir)]);
    assert.equal(box.spawned.length, 1);
    assert.match(box.spawned[0].script, /run\.ts$/);
    assert.deepEqual(box.spawned[0].args, ['drive', resolve(dir)]);
    assert.deepEqual(box.printed, [`run: ${resolve(dir)}`, 'page: http://127.0.0.1:8790/']);

    const config = goodConfig();
    config.runs = 'runs-2';
    assert.equal(await start(writeConfig(config), requestFile(), true), 0);
    const second = join(box.root, 'runs-2', readdirSync(join(box.root, 'runs-2'))[0]);
    assert.equal(readMode(second), 'slot-in');
  });

  it('a broken config writes nothing and spawns nothing', async () => {
    const config = goodConfig();
    config.steps = [];
    assert.equal(await start(writeConfig(config), requestFile(), false), 1);
    assert.equal(existsSync(box.runs), false);
    assert.deepEqual(box.spawned, []);
    assert.deepEqual(registered(), []);
  });

  it('a missing git hook stops start and resume, and names where it goes', async () => {
    await start(writeConfig(goodConfig()), requestFile(), false);
    const dir = runFolder();
    box.spawned = [];
    box.printed = [];
    seams.gitHookPlaces = [join(box.root, 'no-hooks', 'deny-git-writes.ts')];
    assert.equal(await start(writeConfig(goodConfig()), requestFile(), false), 1);
    assert.ok(box.printed.includes(`missing: the deny-git-writes hook: copy it to ${seams.gitHookPlaces[0]}`), JSON.stringify(box.printed));
    assert.equal(readdirSync(box.runs).length, 1);
    assert.equal(await resume(dir), 1);
    assert.deepEqual(box.spawned, []);
  });

  it('a held port is named, and the run still starts', async () => {
    seams.ensurePage = saved.ensurePage;
    const server: Server = createServer((_, res) => res.writeHead(404).end('not the page'));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const port = (server.address() as { port: number }).port;
    process.env.RUN_WORKFLOW_PORT = String(port);
    try {
      assert.equal(await start(writeConfig(goodConfig()), requestFile(), false), 0);
      assert.ok(box.printed.some((p) => p.startsWith(`page: port ${port} is held by another program`)), JSON.stringify(box.printed));
      assert.equal(box.spawned.filter((s) => s.script.endsWith('page.ts')).length, 0);
      assert.equal(box.spawned.filter((s) => s.args[0] === 'drive').length, 1);
    } finally {
      server.close();
    }
  });

  it('resume spawns no second driver while one is alive', async () => {
    await start(writeConfig(goodConfig()), requestFile(), false);
    const dir = runFolder();
    box.spawned = [];
    box.printed = [];
    // A stand-in whose command line reads as this folder's driver.
    const child = spawn('bash', ['-c', 'sleep 30; :', 'run.ts drive', resolve(dir)], { stdio: 'ignore' });
    try {
      await new Promise((done) => setTimeout(done, 200));
      writeFileSync(join(dir, 'driver.pid'), `${child.pid}\n`);
      assert.equal(await resume(dir), 0);
      assert.deepEqual(box.spawned, []);
      assert.ok(box.printed.includes('page: http://127.0.0.1:8790/'), JSON.stringify(box.printed));
    } finally {
      child.kill();
    }
    // With the driver gone, resume starts one.
    await new Promise((done) => setTimeout(done, 100));
    assert.equal(await resume(dir), 0);
    assert.deepEqual(box.spawned.map((s) => s.args), [['drive', resolve(dir)]]);
  });
});
