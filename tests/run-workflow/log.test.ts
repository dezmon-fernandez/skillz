// node --no-warnings --test tests/run-workflow/log.test.ts
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { initOf, lines, repliesOf, replyOf, resultOf, transcriptPath, turnOver } from '../../skills/run-workflow/scripts/log.ts';
import { openQuestions } from '../../skills/run-workflow/scripts/questions.ts';
import { seams } from '../../skills/run-workflow/scripts/launch.ts';
import { raw, removeTemps, sample, temp, variant } from './helpers.ts';

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

  it('the parse cache drops the least recently read log once it holds more than its size', () => {
    const before = seams.cacheBytes;
    const row = JSON.stringify({ type: 'system', subtype: 'init', session_id: 's' });
    const a = join(temp(), 'a.jsonl');
    const b = join(temp(), 'b.jsonl');
    writeFileSync(a, row + '\n');
    writeFileSync(b, row + '\n');
    // Room for one of the two files.
    seams.cacheBytes = row.length + 10;
    try {
      const first = lines(a);
      assert.equal(lines(a), first);
      lines(b);
      // a was dropped to make room for b, so it is parsed again.
      const again = lines(a);
      assert.notEqual(again, first);
      assert.deepEqual(again, first);
    } finally {
      seams.cacheBytes = before;
    }
  });
});

describe("a turn's replies", () => {
  it("a paused turn's five replies are all read, in order", () => {
    const replies = repliesOf(lines(sample('grill-paused.jsonl')));
    assert.equal(replies.length, 5);
    assert.deepEqual(replies.map((r) => (r.match(/❓/g) ?? []).length), [3, 0, 4, 0, 3]);
    const results = raw('grill-paused.jsonl').map((row) => JSON.parse(row)).filter((e) => e.type === 'result');
    assert.deepEqual(replies, results.map((e) => e.result));
  });

  it('a turn with one reply reads as it did', () => {
    const events = lines(sample('plan-asks.jsonl'));
    assert.deepEqual(repliesOf(events), [replyOf(events)]);
  });

  it('a turn with no result line has no reply and no open question', () => {
    const path = join(temp(), 'init-only.jsonl');
    writeFileSync(path, JSON.stringify({ type: 'system', subtype: 'init', session_id: 's' }) + '\n');
    const replies = repliesOf(lines(path));
    assert.deepEqual(replies, []);
    assert.deepEqual(openQuestions(replies), []);
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
