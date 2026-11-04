// node --no-warnings --test tests/run-workflow/finished.test.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { newestMatch } from '../../skills/run-workflow/scripts/finished.ts';
import { box, useBox } from './helpers.ts';

useBox();

describe("a step's done file", () => {
  it('newestMatch reads only the glob\'s folder and only files written since the run began', () => {
    const at = (p: string) => join(box.workdir, p);
    mkdirSync(at('.agents/plans/sub'), { recursive: true });
    for (const p of ['.agents/plans/old.md', '.agents/plans/new.md', 'a.md', '.agents/plans/sub/deeper.md', '.agents/plans/new.txt']) writeFileSync(at(p), 'x');
    const since = Date.now() - 10_000;
    spawnSync('touch', ['-t', '202001010000', at('.agents/plans/old.md')]);
    spawnSync('touch', ['-t', '203001010000', at('.agents/plans/sub/deeper.md')]);
    spawnSync('touch', ['-t', '202901010000', at('a.md')]);
    assert.equal(newestMatch(box.workdir, '.agents/plans/*.md', since), '.agents/plans/new.md');
    assert.equal(newestMatch(box.workdir, '.agents/**/*.md', since), '.agents/plans/sub/deeper.md');
    assert.equal(newestMatch(box.workdir, '.agents/plans/*.md', Date.now() + 10_000), null);
  });
});
