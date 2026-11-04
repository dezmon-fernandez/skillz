// node --no-warnings --test tests/run-workflow/log.test.ts
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { initOf, lines, resultOf, transcriptPath, turnOver } from '../../skills/run-workflow/scripts/log.ts';
import { raw, removeTemps, sample, variant } from './helpers.ts';

after(removeTemps);

describe('the step log readers', () => {
  it('resultOf is null for a turn cut off before its result', () => {
    const events = lines(variant('plan-asks.jsonl', (rows) => rows.slice(0, -1)));
    assert.equal(resultOf(events), null);
    assert.equal(initOf(events).session_id, 'd927ec62-fc1a-4016-9073-c3b01d3098bc');
  });

  it('a malformed line is skipped, never thrown', () => {
    const path = variant('plan-asks.jsonl', (rows) => {
      const last = rows[rows.length - 1];
      return [rows[0], '{not json', ...rows.slice(1, -1), last.slice(0, last.length / 2)];
    });
    const events = lines(path);
    assert.equal(events.length, raw('plan-asks.jsonl').length - 1);
    assert.equal(resultOf(events), null);
  });
});

describe('the transcript readers', () => {
  it('the turn is over when the last message line is stop_hook_summary, past bookkeeping lines', () => {
    assert.equal(turnOver(lines(sample('transcript-tail.jsonl'))), true);
    assert.equal(turnOver(lines(variant('transcript-tail.jsonl', (rows) => rows.slice(0, -3)))), false);
  });

  it('the transcript path is built as the CLI builds it', () => {
    const before = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = '/tmp/x';
    try {
      assert.equal(transcriptPath('/Users/a/b-c', 's1'), '/tmp/x/projects/-Users-a-b-c/s1.jsonl');
      // Every character but letters and digits, not only the slashes.
      assert.equal(transcriptPath('/Users/a/b.c_d', 's1'), '/tmp/x/projects/-Users-a-b-c-d/s1.jsonl');
    } finally {
      if (before === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = before;
    }
  });
});
