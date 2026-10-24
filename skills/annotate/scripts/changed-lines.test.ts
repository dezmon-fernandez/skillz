// node --test .claude/skills/annotate/scripts/changed-lines.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { changedLines } from './changed-lines.ts';

describe('changedLines', () => {
  it('marks nothing when the text is the same', () => {
    assert.deepEqual(changedLines(['one', 'two'], ['one', 'two']), []);
  });

  it('marks an inserted line', () => {
    assert.deepEqual(changedLines(['one', 'three'], ['one', 'two', 'three']), [1]);
  });

  it('marks a rewritten line', () => {
    assert.deepEqual(changedLines(['one', 'two', 'three'], ['one', 'TWO', 'three']), [1]);
  });

  it('marks nothing for a deleted line, since it is no longer on the page', () => {
    assert.deepEqual(changedLines(['one', 'two', 'three'], ['one', 'three']), []);
  });

  it('marks every line of a document it has never seen', () => {
    assert.deepEqual(changedLines([], ['one', 'two']), [0, 1]);
  });

  it('keeps a repeated blank line matched to its own place', () => {
    assert.deepEqual(changedLines(['# Title', '', 'Body', '', 'End'], ['# Title', '', 'Body', 'More', '', 'End']), [3]);
  });
});
