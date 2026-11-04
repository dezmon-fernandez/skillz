// node --no-warnings --test tests/run-workflow/tasks.test.ts
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { planInPrompt, planTasks } from '../../skills/run-workflow/scripts/tasks.ts';

describe("a build step's plan", () => {
  const plan = resolve(import.meta.dirname, '../../.agents/plans/workflow-runner-claude-code.md');
  it("planInPrompt finds this plan's tasks", { skip: !existsSync(plan) && 'the plan is not committed' }, () => {
    const root = resolve(import.meta.dirname, '../..');
    const found = planInPrompt('/dk-execute-plan .agents/plans/workflow-runner-claude-code.md', root);
    assert.equal(found, plan);
    assert.equal(planTasks(found!)[0][0], '1');
  });
});
