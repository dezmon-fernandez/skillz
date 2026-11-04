// node --no-warnings --test tests/run-workflow/start.test.ts
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { readMode } from '../../skills/run-workflow/scripts/answers.ts';
import { loadRun, registered, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { resume, start } from '../../skills/run-workflow/scripts/start.ts';
import { main } from '../../skills/run-workflow/scripts/run.ts';
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
    assert.equal(await start(writeConfig(goodConfig()), requestFile()), 0);
    const dir = runFolder();
    assert.equal(readFileSync(join(dir, 'request.md'), 'utf8'), request);
    const run = loadRun(dir)!;
    assert.deepEqual(run.steps.map((s) => s.state), ['pending', 'pending']);
    assert.equal(run.base, git(box.workdir, 'rev-parse', 'HEAD'));
    assert.equal(run.workdir, resolve(box.workdir));
    assert.equal(readMode(dir), 'autonomous');
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')).steps.map((s: any) => s.id), ['prime', 'plan']);
    assert.deepEqual(registered(), [resolve(dir)]);
    assert.equal(box.spawned.length, 1);
    assert.match(box.spawned[0].script, /run\.ts$/);
    assert.deepEqual(box.spawned[0].args, ['drive', resolve(dir)]);
    assert.deepEqual(box.printed, [`run: ${resolve(dir)}`, 'page: http://127.0.0.1:8790/']);

    const config = { ...goodConfig(), runs: 'runs-2', mode: 'human-approval' };
    assert.equal(await start(writeConfig(config), requestFile()), 0);
    const other = join(box.root, 'runs-2', readdirSync(join(box.root, 'runs-2'))[0]);
    assert.equal(readMode(other), 'human-approval');
  });

  it('a config with no mode starts autonomous', async () => {
    assert.equal(await start(writeConfig(goodConfig()), requestFile()), 0);
    assert.equal(readFileSync(join(runFolder(), 'mode'), 'utf8'), 'autonomous\n');
  });

  it('a mode that is neither is one problem line', async () => {
    assert.equal(await start(writeConfig({ ...goodConfig(), mode: 'speed' }), requestFile()), 1);
    assert.deepEqual(box.printed, ['mode must be "autonomous" or "human-approval"']);
    assert.equal(existsSync(box.runs), false);
  });

  it('start refuses the old flag and says where the mode lives', async () => {
    assert.equal(await main(['start', writeConfig(goodConfig()), '--request-file', requestFile(), '--slot-in']), 1);
    assert.deepEqual(box.printed, ['start takes no mode flag: set "mode" in the config, or switch on the page']);
    assert.equal(existsSync(box.runs), false);
  });

  it('start refuses the mode names as flags too, and any flag it does not take', async () => {
    for (const flag of ['--human-approval', '--autonomous']) {
      box.printed = [];
      assert.equal(await main(['start', writeConfig(goodConfig()), '--request-file', requestFile(), flag]), 1);
      assert.deepEqual(box.printed, ['start takes no mode flag: set "mode" in the config, or switch on the page']);
    }
    box.printed = [];
    assert.equal(await main(['start', writeConfig(goodConfig()), '--request-file', requestFile(), '--fast']), 1);
    assert.match(box.printed.join('\n'), /^usage: /);
    assert.equal(existsSync(box.runs), false);
  });

  it('a config with no workdir prints its problem line', async () => {
    const config = goodConfig();
    delete config.workdir;
    assert.equal(await start(writeConfig(config), requestFile()), 1);
    assert.ok(box.printed.includes('workdir is required: a folder path'), JSON.stringify(box.printed));
    assert.equal(existsSync(box.runs), false);
  });

  it('a broken config writes nothing and spawns nothing', async () => {
    const config = goodConfig();
    config.steps = [];
    assert.equal(await start(writeConfig(config), requestFile()), 1);
    assert.equal(existsSync(box.runs), false);
    assert.deepEqual(box.spawned, []);
    assert.deepEqual(registered(), []);
  });

  it('a missing git hook stops start and resume, and names where it goes', async () => {
    await start(writeConfig(goodConfig()), requestFile());
    const dir = runFolder();
    box.spawned = [];
    box.printed = [];
    seams.gitHookPlaces = [join(box.root, 'no-hooks', 'deny-git-writes.ts')];
    assert.equal(await start(writeConfig(goodConfig()), requestFile()), 1);
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
      assert.equal(await start(writeConfig(goodConfig()), requestFile()), 0);
      assert.ok(box.printed.some((p) => p.startsWith(`page: port ${port} is held by another program`)), JSON.stringify(box.printed));
      assert.equal(box.spawned.filter((s) => s.script.endsWith('page.ts')).length, 0);
      assert.equal(box.spawned.filter((s) => s.args[0] === 'drive').length, 1);
    } finally {
      server.close();
    }
  });

  it('resume spawns no second driver while one is alive', async () => {
    await start(writeConfig(goodConfig()), requestFile());
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

  // A second git working folder in the box, for a run that holds none of the first's.
  const otherWorkdir = () => {
    const dir = join(box.root, 'work-2');
    mkdirSync(dir);
    git(dir, 'init', '-q');
    return dir;
  };
  // The run start just made, its driver made alive by a stand-in whose command line reads as that driver's.
  async function goingRun(over: Record<string, unknown> = {}): Promise<{ dir: string; id: string; stop: () => void }> {
    assert.equal(await start(writeConfig({ ...goodConfig(), ...over }), requestFile()), 0);
    const dir = runFolder();
    // `; :` keeps the shell from replacing itself with sleep, which would drop the words from its command line.
    const child = spawn('/bin/sh', ['-c', 'sleep 30; :', 'run.ts drive', resolve(dir)], { stdio: 'ignore' });
    writeFileSync(join(dir, 'driver.pid'), `${child.pid}\n`);
    await new Promise((done) => setTimeout(done, 100));
    box.printed = [];
    return { dir, id: loadRun(dir)!.id, stop: () => child.kill() };
  }
  const startsIn = (runs: string) => existsSync(join(box.root, runs)) ? readdirSync(join(box.root, runs)).length : 0;

  it('a run is refused while a going run holds its worktree, naming that run', async () => {
    const going = await goingRun();
    try {
      assert.equal(await start(writeConfig({ ...goodConfig(), runs: 'runs-2' }, 'second.json'), requestFile()), 1);
      assert.deepEqual(box.printed, [`${resolve(box.workdir)} is in use by run ${going.id}`]);
      assert.equal(startsIn('runs-2'), 0);
    } finally {
      going.stop();
    }
  });

  it('a shared port is refused, naming the run', async () => {
    const going = await goingRun({ ports: [5174] });
    try {
      const second = { ...goodConfig(), runs: 'runs-2', workdir: otherWorkdir(), ports: [5174] };
      assert.equal(await start(writeConfig(second, 'second.json'), requestFile()), 1);
      assert.deepEqual(box.printed, [`port 5174 is in use by run ${going.id}`]);
      assert.equal(startsIn('runs-2'), 0);
    } finally {
      going.stop();
    }
  });

  it('a waiting run whose driver is alive still holds its worktree', async () => {
    const going = await goingRun();
    try {
      const run = loadRun(going.dir)!;
      run.state = 'waiting';
      run.steps[1].state = 'waiting';
      saveRun(going.dir, run);
      assert.equal(await start(writeConfig({ ...goodConfig(), runs: 'runs-2' }, 'second.json'), requestFile()), 1);
      assert.deepEqual(box.printed, [`${resolve(box.workdir)} is in use by run ${going.id}`]);
    } finally {
      going.stop();
    }
  });

  it('a run whose driver is gone holds nothing', async () => {
    const going = await goingRun({ ports: [5174] });
    going.stop();
    await new Promise((done) => setTimeout(done, 100));
    assert.equal(await start(writeConfig({ ...goodConfig(), runs: 'runs-2', ports: [5174] }, 'second.json'), requestFile()), 0);
    assert.equal(startsIn('runs-2'), 1);
  });

  // A stand-in whose command line reads as a turn's claude, put on the run's first step as a turn that has not ended.
  function claudeOn(dir: string): () => void {
    const child = spawn('/bin/sh', ['-c', 'sleep 30; :', 'claude -p'], { stdio: 'ignore' });
    const run = loadRun(dir)!;
    run.steps[0].turns.push({
      n: 0, prompt: '/prime', by: 'config', log: 'steps/01-prime-0.jsonl', started: new Date().toISOString(),
      ended: null, seconds: null, exit: null, sessionCost: null, cost: null, watched: 'no', pid: child.pid,
    });
    saveRun(dir, run);
    return () => child.kill();
  }

  it("a run whose driver stopped while its turn's claude runs still holds its worktree", async () => {
    const going = await goingRun();
    going.stop();
    const stopClaude = claudeOn(going.dir);
    try {
      await new Promise((done) => setTimeout(done, 100));
      assert.equal(await start(writeConfig({ ...goodConfig(), runs: 'runs-2' }, 'second.json'), requestFile()), 1);
      assert.deepEqual(box.printed, [`${resolve(box.workdir)} is in use by run ${going.id}`]);
    } finally {
      stopClaude();
    }
  });

  it('resume is refused while a run started since holds its worktree', async () => {
    const stopped = await goingRun();
    stopped.stop();
    await new Promise((done) => setTimeout(done, 100));
    assert.equal(await start(writeConfig({ ...goodConfig(), runs: 'runs-2' }, 'second.json'), requestFile()), 0);
    const later = join(box.root, 'runs-2', readdirSync(join(box.root, 'runs-2'))[0]);
    const stopClaude = claudeOn(later);
    box.spawned = [];
    box.printed = [];
    try {
      assert.equal(await resume(stopped.dir), 1);
      assert.deepEqual(box.printed, [`${resolve(box.workdir)} is in use by run ${loadRun(later)!.id}`]);
      assert.deepEqual(box.spawned, []);
    } finally {
      stopClaude();
    }
  });

  it('two configs with their own worktrees and ports both start', async () => {
    const going = await goingRun({ ports: [5174] });
    try {
      const second = { ...goodConfig(), runs: 'runs-2', workdir: otherWorkdir(), ports: [5175] };
      assert.equal(await start(writeConfig(second, 'second.json'), requestFile()), 0);
      assert.equal(startsIn('runs-2'), 1);
      assert.equal(registered().length, 2);
    } finally {
      going.stop();
    }
  });
});
