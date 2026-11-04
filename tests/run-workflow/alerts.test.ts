// node --no-warnings --test tests/run-workflow/alerts.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alertsIn } from '../../skills/run-workflow/scripts/alerts.ts';
import { lines } from '../../skills/run-workflow/scripts/log.ts';
import { sample } from './helpers.ts';

describe("what a step's rules stopped", () => {
  it('a permission_denied event becomes a denied alert, named by its call', () => {
    const found = alertsIn(lines(sample('denied.jsonl')), 'Build');
    assert.equal(found.length, 1);
    assert.equal(found[0].kind, 'denied');
    assert.equal(found[0].text, 'Bash Unstage, format, show remaining biome issues');
  });
});
