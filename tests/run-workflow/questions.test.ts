// node --no-warnings --test tests/run-workflow/questions.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines, replyOf } from '../../skills/run-workflow/scripts/log.ts';
import { decided, questions } from '../../skills/run-workflow/scripts/questions.ts';
import { sample } from './helpers.ts';

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
