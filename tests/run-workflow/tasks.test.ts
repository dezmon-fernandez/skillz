// node --no-warnings --test tests/run-workflow/tasks.test.ts
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { agents, planInPrompt, planTasks } from '../../skills/run-workflow/scripts/tasks.ts';
import { removeTemps, startsAgents, temp, writeAgent } from './helpers.ts';

after(removeTemps);

describe("a build step's plan", () => {
  const plan = resolve(import.meta.dirname, '../../.agents/plans/workflow-runner-claude-code.md');
  it("planInPrompt finds this plan's tasks", { skip: !existsSync(plan) && 'the plan is not committed' }, () => {
    const root = resolve(import.meta.dirname, '../..');
    const found = planInPrompt('/dk-execute-plan .agents/plans/workflow-runner-claude-code.md', root);
    assert.equal(found, plan);
    assert.equal(planTasks(found!)[0][0], '1');
  });
});

describe("a turn's agents", () => {
  const folder = () => join(temp(), 'subagents');

  it('an agent whose transcript ended its turn reads as finished', () => {
    const dir = folder();
    writeAgent(dir, 'toolu_1', { ended: true });
    const [row] = agents(dir, [startsAgents('toolu_1')]);
    assert.equal(row.done, true);
  });

  it('an agent still working reads as running', () => {
    const dir = folder();
    writeAgent(dir, 'toolu_1', { ended: false });
    const [row] = agents(dir, [startsAgents('toolu_1')]);
    assert.equal(row.done, false);
  });

  it("an older CLI's finished flag still counts", () => {
    const dir = folder();
    writeAgent(dir, 'toolu_1', { ended: false, finished: true });
    assert.equal(agents(dir, [startsAgents('toolu_1')])[0].done, true);
  });

  it('an agent shows under the turn that started it, not a later one', () => {
    const dir = folder();
    writeAgent(dir, 'toolu_1');
    const turn1 = [startsAgents('toolu_1')];
    const turn2 = [
      { type: 'system', subtype: 'task_notification', tool_use_id: 'toolu_1', summary: 'done' },
      { type: 'user', message: { content: [{ type: 'text', text: '<task-notification> toolu_1 completed' }] } }
    ];
    assert.deepEqual(agents(dir, turn1).map((a) => a.name), ['Explore "Inventory forms"']);
    assert.deepEqual(agents(dir, turn2), []);
  });

  it('an agent with no transcript yet still lists, with no calls', () => {
    const dir = folder();
    writeAgent(dir, 'toolu_1', { noTranscript: true });
    const found = agents(dir, [startsAgents('toolu_1')]);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0].calls, {});
    assert.equal(found[0].done, false);
  });
});
