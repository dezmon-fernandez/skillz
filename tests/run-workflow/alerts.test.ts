// node --no-warnings --test tests/run-workflow/alerts.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lines } from '../../skills/run-workflow/scripts/log.ts';
import { alertsIn } from '../../skills/run-workflow/scripts/view.ts';
import { sample } from './helpers.ts';

describe("what a step's rules stopped", () => {
  it('a permission_denied event becomes a denied alert, named by its call', () => {
    const found = alertsIn(lines(sample('denied.jsonl')), 'Build');
    assert.equal(found.length, 1);
    assert.equal(found[0].kind, 'denied');
    assert.equal(found[0].text, 'Bash Unstage, format, show remaining lint issues');
  });

  it("the git hook's block becomes a blocked alert with the hook's reason", () => {
    const reason = 'deny-git-writes: blocked git push: not a git command this hook recognizes as read-only; only git commands that read run here';
    const events = [
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'git push', description: 'Push the branch' } }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true,
        content: `PreToolUse:Bash hook error: [node --no-warnings /x/deny-git-writes.ts]: ${reason}` }] } }
    ];
    const found = alertsIn(events, 'Build');
    assert.equal(found.length, 1);
    assert.equal(found[0].kind, 'blocked');
    assert.ok(found[0].text.includes(reason), found[0].text);
  });
});
