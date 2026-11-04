// node --no-warnings --test tests/run-workflow/questions.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, repliesOf, replyOf } from '../../skills/run-workflow/scripts/log.ts';
import { decided, openQuestions, questions } from '../../skills/run-workflow/scripts/questions.ts';
import { sample } from './helpers.ts';

const repliesIn = (name: string) => repliesOf(lines(sample(name)));

describe("a grill's questions", () => {
  it("a turn's open questions are its last reply's that asks", () => {
    const replies = repliesIn('grill-paused.jsonl');
    const open = openQuestions(replies);
    assert.equal(open.length, 3);
    assert.deepEqual(open.map(([q]) => q.split(/[?:]/)[0]),
      ['Table Entry panel draft order rule part', 'Change item form list page note', 'Note step field value table']);
    assert.deepEqual(open, questions(replies[4]));
    assert.equal(open[1][1], 'Rule. Part case check: save view label group-option detail, change item form list page.');
  });

  it('a question in the first reply survives later replies of findings', () => {
    const open = openQuestions(repliesIn('grill-findings-last.jsonl'));
    assert.equal(open.length, 1);
    assert.ok(open[0][0].startsWith('Order rule part case check save? View label group option'), open[0][0]);
    assert.ok(!open[0][0].includes('?:'), open[0][0]);
    assert.ok(open[0][1].startsWith('Order rule part case check (save) view (label): group option detail'), open[0][1]);
  });

  it('a grill round is read with each recommendation', () => {
    const found = questions(repliesIn('grill-round.jsonl')[0]);
    assert.equal(found.length, 5);
    assert.deepEqual(found[0], ['Note step field value: Q1 table entry panel:',
      'View label, group option detail change item. Form list page note, step field value table entry.']);
    assert.equal(found[3][0], 'Panel draft-order');
    for (const [q, rec] of found) assert.ok(q && rec, `${q} / ${rec}`);
  });

  it('a grill question with no recommendation before the next keeps an empty one', () => {
    const reply = repliesIn('grill-round.jsonl')[0];
    const rows = reply.split('\n');
    const second = rows.filter((r) => r.startsWith('➡️'))[1];
    const found = questions(rows.filter((r) => r !== second).join('\n'));
    assert.equal(found.length, 5);
    assert.equal(found[1][1], '');
    assert.equal(found[0][1], questions(reply)[0][1]);
    assert.equal(found[2][1], questions(reply)[2][1]);
    assert.ok(found[0][1] && found[2][1]);
  });

  it("a ❓ that is not grilling's shape leaves the reply read as before", () => {
    const reply = '- **❓:** a note on scope\n\n1. Which reports are in scope?\n2. Plain item.\n';
    assert.deepEqual(questions(reply), [['Which reports are in scope?', '']]);
  });

  it("dk's replies read as they did", () => {
    assert.deepEqual(['plan-asks.jsonl', 'requirements-stop.jsonl', 'plan-finished.jsonl'].map((name) => questions(replyOf(lines(sample(name)))).length),
      [3, 3, 0]);
    assert.deepEqual(openQuestions(repliesIn('plan-asks.jsonl')), questions(replyOf(lines(sample('plan-asks.jsonl')))));
  });
});

describe('what a reply asks and decided alone', () => {
  it('reads three questions from the live plan stop', () => {
    const found = questions(replyOf(lines(sample('plan-asks.jsonl'))));
    assert.equal(found.length, 3);
    assert.equal(found[0][0], 'Where does the percent reach full colour?');
  });

  it("reads the requirements stop's questions and its three decisions taken alone", () => {
    const reply = replyOf(lines(sample('requirements-stop.jsonl')));
    assert.equal(questions(reply).length, 3);
    assert.equal(decided(reply).length, 3);
  });

  it('a finished plan, a review and an offer-ending build ask nothing', () => {
    for (const name of ['plan-finished.jsonl', 'review-no-questions.jsonl', 'build-offer.jsonl']) {
      assert.deepEqual(questions(replyOf(lines(sample(name)))), [], name);
    }
    assert.match(replyOf(lines(sample('plan-finished.jsonl'))), /\/dk-execute-plan/);
  });
});
