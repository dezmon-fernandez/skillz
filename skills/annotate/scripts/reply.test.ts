// node --test .claude/skills/annotate/scripts/reply.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseReply } from './reply.ts';

describe('parseReply', () => {
  it('reads one item per comment, with its document, lines and status', () => {
    const reply = parseReply('## skills/plan/SKILL.md\n- Lines 25-26: Done. Cut the line.\n- Line 116: Question. Drop the cap?\n');
    assert.deepEqual(reply.items, [
      { document: 'skills/plan/SKILL.md', start: 25, end: 26, status: 'done', text: 'Cut the line.' },
      { document: 'skills/plan/SKILL.md', start: 116, end: 116, status: 'question', text: 'Drop the cap?' }
    ]);
    assert.deepEqual(reply.notes, []);
  });

  it('reads Not done, and the overall comment with no lines', () => {
    assert.deepEqual(parseReply('## notes.md\n- Overall: Not done: the outline is yours to set.').items, [
      { document: 'notes.md', start: null, end: null, status: 'not done', text: 'the outline is yours to set.' }
    ]);
  });

  it('reads an item that copied the Send line, quote and all', () => {
    const [item] = parseReply('## a.md\n- Lines 3-4 ("Four steps: define, (research)"): Done. Cut.').items;
    assert.equal(item.start, 3);
    assert.equal(item.text, 'Cut.');
  });

  it('drops [reviewed] from the heading, so it names the document the Send named', () => {
    assert.equal(parseReply('## a.md [reviewed]\n- Line 1: Done. Fixed.').items[0].document, 'a.md');
  });

  it('keeps an item with no status word, and does not read a status from a word with no stop', () => {
    assert.deepEqual(parseReply('## a.md\n- Line 2: Done with the intro, see line 3.').items[0], {
      document: 'a.md', start: 2, end: 2, status: null, text: 'Done with the intro, see line 3.'
    });
  });

  it('joins an indented line to the item above it', () => {
    assert.equal(parseReply('## a.md\n- Line 9: Question. Keep it\n  or drop it?').items[0].text, 'Keep it or drop it?');
  });

  it('keeps every other line as a note, including a bullet before any heading', () => {
    const reply = parseReply('All three are done.\n- Ran the tests.\n\n## a.md\n- Line 1: Done. Fixed.\nThanks.');
    assert.deepEqual(reply.notes, ['All three are done.', '- Ran the tests.', 'Thanks.']);
    assert.equal(reply.items.length, 1);
  });
});
