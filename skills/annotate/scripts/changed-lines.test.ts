// node --test .claude/skills/annotate/scripts/changed-lines.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { changedLines, diffLines } from './changed-lines.ts';

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

describe('diffLines removed', () => {
  it('places a deleted run before the line that now follows it', () => {
    assert.deepEqual(diffLines(['one', 'two', 'three', 'four'], ['one', 'four']).removed, [{ at: 1, lines: ['two', 'three'] }]);
  });

  it('places lines deleted from the start at 0 and from the end after the last line', () => {
    assert.deepEqual(diffLines(['zero', 'one', 'two', 'end'], ['one', 'two']).removed, [
      { at: 0, lines: ['zero'] },
      { at: 2, lines: ['end'] }
    ]);
  });

  it('reports a rewritten line as changed and its old text as removed', () => {
    assert.deepEqual(diffLines(['one', 'two', 'three'], ['one', 'TWO', 'three']), {
      changed: [1],
      removed: [{ at: 1, lines: ['two'] }]
    });
  });

  it('removes nothing when lines are only added', () => {
    assert.deepEqual(diffLines(['one', 'three'], ['one', 'two', 'three']).removed, []);
  });
});
