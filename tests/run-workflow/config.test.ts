// node --no-warnings --test tests/run-workflow/config.test.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { loadConfig, missingTools } from '../../skills/run-workflow/scripts/config.ts';
import { check } from '../../skills/run-workflow/scripts/run.ts';
import type { Config } from '../../skills/run-workflow/scripts/types.ts';
import { bin, box, goodConfig, useBox, writeConfig } from './helpers.ts';

useBox();

describe('check', () => {
  it('a complete config checks clean', () => {
    assert.equal(check(writeConfig(goodConfig())), 0);
    assert.deepEqual(box.printed, ['config ok']);
  });

  it('each broken config is named before anything is written', () => {
    const step = (over: Record<string, unknown>) => ({ id: 'prime', label: 'Prime', prompt: '/prime', session: 'new', ...over });
    const cases: [string, (c: Record<string, any>) => unknown, RegExp][] = [
      ['missing file', () => null, /cannot read the config/],
      ['not JSON', () => '{', /not JSON/],
      ['no steps', (c) => ({ ...c, steps: [] }), /steps/],
      ['workdir missing', (c) => ({ ...c, workdir: 'nowhere' }), /workdir .*does not exist/],
      ['workdir not a git checkout', (c) => (mkdirSync(join(box.root, 'plain')), { ...c, workdir: 'plain' }), /not a git checkout/],
      ['runs inside workdir', (c) => ({ ...c, runs: 'work/runs' }), /runs .*inside workdir/],
      ['bad step id', (c) => ({ ...c, steps: [step({ id: 'Plan!' })] }), /step id "Plan!"/],
      ['duplicate step id', (c) => ({ ...c, steps: [step({}), step({ session: 'continue' })] }), /duplicate step id "prime"/],
      ['first step continues', (c) => ({ ...c, steps: [step({ session: 'continue' })] }), /first step .*"new"/],
      ['{file:build} in the first step', (c) => ({ ...c, steps: [step({ prompt: '/x {file:build}' })] }), /\{file:build\}/],
      ['envFile missing', (c) => ({ ...c, envFile: 'nope.env' }), /envFile .*does not exist/],
      ['session fresh', (c) => ({ ...c, steps: [step({ session: 'fresh' })] }), /session "fresh"/]
    ];
    for (const [what, make, line] of cases) {
      box.printed = [];
      const made = make(goodConfig());
      const path = join(box.root, 'broken.json');
      if (made === null) spawnSync('rm', ['-f', path]);
      else writeFileSync(path, typeof made === 'string' ? made : JSON.stringify(made));
      assert.equal(check(path), 1, what);
      assert.ok(box.printed.some((p) => line.test(p)), `${what}: ${JSON.stringify(box.printed)}`);
      assert.ok(!box.printed.includes('config ok'), what);
    }
    assert.equal(existsSync(box.runs), false);
  });

  it('a missing tool is named', () => {
    // A PATH holding every tool the run needs but caffeinate.
    const tools = join(box.root, 'tools');
    mkdirSync(tools);
    for (const tool of ['git', 'lsof', 'bash', 'sh']) {
      const found = spawnSync('/bin/sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
      spawnSync('ln', ['-s', found, join(tools, tool)]);
    }
    spawnSync('ln', ['-s', join(bin, 'claude'), join(tools, 'claude')]);
    process.env.PATH = tools;
    assert.deepEqual(missingTools(), ['caffeinate']);
    assert.equal(check(writeConfig(goodConfig())), 1);
    assert.ok(box.printed.includes('missing: caffeinate'), JSON.stringify(box.printed));
  });

  it('loadConfig resolves paths against the config folder', () => {
    const { config, problems } = loadConfig(writeConfig({ ...goodConfig(), path: ['.'] }));
    assert.deepEqual(problems, []);
    assert.equal((config as Config).workdir, resolve(box.workdir));
    assert.deepEqual((config as Config).path, [resolve(box.root)]);
  });
});
