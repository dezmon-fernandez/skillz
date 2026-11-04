// node --no-warnings --test tests/run-workflow/render.test.ts
//
// What the page shows of a run, read through the page server as the browser reads it.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { appendDecision, saveAnswer } from '../../skills/run-workflow/scripts/answers.ts';
import { loadRun, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { aRun, get, idOf, samples, turn, usePage } from './page-helpers.ts';

usePage();

// The part of the page under one step: from its row to the next step's.
function under(html: string, step: string): string {
  const start = html.indexOf(`id="step-${step}"`);
  assert.ok(start >= 0, `no step ${step} on the page`);
  const next = html.indexOf('id="step-', start + 1);
  return html.slice(start, next < 0 ? undefined : next);
}
const live = async (dir: string) => {
  const [status, html] = await get(`/live?run=${idOf(dir)}`);
  assert.equal(status, 200);
  return html;
};
const visible = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

describe("the run's view", () => {
  it('a step waiting on you shows its reply and an answer box', async () => {
    const html = under(await live(aRun()), 'plan');
    assert.match(visible(html), /waiting on you/);
    for (const q of ['Where does the percent reach full colour?', 'What happens to 50–59%?', 'Does the under side ramp the same?']) {
      assert.ok(visible(html).includes(q), q);
    }
    assert.match(html, /<textarea[^>]*name="text"/);
    assert.match(html, /<button[^>]*value="reply"[^>]*>Send<\/button>/);
    assert.match(html, /<button[^>]*value="go-on"[^>]*>Go on<\/button>/);
    assert.match(html, /name="turn" value="0"/);
    // The whole last reply is open, not folded away behind a closed <details>.
    const at = html.indexOf('I&#39;ll stop here') >= 0 ? html.indexOf('I&#39;ll stop here') : html.indexOf("I'll stop here");
    assert.ok(at >= 0);
    const opened = html.lastIndexOf('<details', at);
    assert.ok(opened < 0 || html.lastIndexOf('</details>', at) > opened || /^<details[^>]*\bopen\b/.test(html.slice(opened)), 'the reply is folded');
  });

  it('a speed answer shows as answered for you, with its questions', async () => {
    const dir = aRun('cleared', { state: 'done', reason: '', turns: [turn(0, '02-plan-0', 'p'), turn(1, '02-plan-1', 'take all reccs')] });
    appendDecision(dir, {
      at: '2026-11-04T10:02:00Z', step: 'plan', turn: 0, kind: 'answered', answer: 'take all reccs', by: 'config',
      questions: [['Where does the percent reach full colour?', ''], ['What happens to 50–59%?', '']], evidence: 'steps/02-plan-0.jsonl:30'
    });
    const html = visible(under(await live(dir), 'plan'));
    assert.ok(html.includes('answered for you: take all reccs'), html);
    assert.ok(html.includes('Where does the percent reach full colour?'));
    assert.doesNotMatch(under(await live(dir), 'plan'), /<textarea/);
    assert.ok(!visible(under(await live(dir), 'prime')).includes('answered for you'));
  });

  it('a failed step shows its last words and Retry and End run', async () => {
    const dir = aRun('cleared', { state: 'failed', reason: 'turn 0 exited with 1: Error: the model is overloaded' });
    const html = under(await live(dir), 'plan');
    assert.match(visible(html), /failed/);
    assert.ok(visible(html).includes('turn 0 exited with 1: Error: the model is overloaded'));
    assert.match(html, /<button[^>]*value="retry"[^>]*>Retry<\/button>/);
    assert.match(html, /<button[^>]*value="end"[^>]*>End run<\/button>/);
    assert.doesNotMatch(html, /value="go-on"/);
  });

  it('the run list holds every registered run, newest first', async () => {
    const older = aRun('story-e', {}, '2026-11-03T10:13:00Z');
    aRun('cleared', {}, '2026-11-04T22:04:00Z');
    const [, html] = await get('/');
    const list = html.slice(html.indexOf('class="runs"'), html.indexOf('</nav>'));
    assert.ok(list.indexOf('cleared') >= 0 && list.indexOf('story-e') > list.indexOf('cleared'), list);
    // The newest is the one open, unless another is asked for.
    assert.match(visible(html), /cleared · started/);
    assert.match(visible((await get(`/?run=${idOf(older)}`))[1]), /story-e · started/);
  });

  it('notes and the report show once written', async () => {
    const dir = aRun();
    assert.match(visible(await live(dir)), /Report: not yet/);
    writeFileSync(join(dir, 'notes.md'), "## 02 Plan, turn 0\n\n- Quote the request's numbers. Evidence: steps/02-plan-0.jsonl:30\n\n");
    writeFileSync(join(dir, 'report.md'), '# cleared: done\n\n## What went well\n\n- **Fast**: 3 turns\n');
    const html = await live(dir);
    assert.ok(visible(under(html, 'plan')).includes("Quote the request's numbers. Evidence: steps/02-plan-0.jsonl:30"));
    assert.ok(html.includes(`href="/report?run=${idOf(dir)}"`));
    const [status, report] = await get(`/report?run=${idOf(dir)}`);
    assert.equal(status, 200);
    assert.match(report, /<h5>What went well<\/h5>/);
    assert.match(report, /<strong>Fast<\/strong>/);
  });

  it('a dead driver is named', async () => {
    const dir = aRun();
    const run = loadRun(dir)!;
    run.state = 'running';
    saveRun(dir, run);
    writeFileSync(join(dir, 'driver.pid'), '999999\n');
    assert.match(visible(await live(dir)), /driver not running/);
    run.state = 'done';
    run.report = 'written';
    saveRun(dir, run);
    assert.doesNotMatch(visible(await live(dir)), /driver not running/);
  });

  it('a malformed log and an unreadable run.json never blank the page', async () => {
    const good = aRun();
    const rows = readFileSync(join(samples, 'plan-asks.jsonl'), 'utf8').split('\n').filter(Boolean);
    writeFileSync(join(good, 'steps', '02-plan-0.jsonl'), [rows[0], '{not json', ...rows.slice(1, -1), rows.at(-1)!.slice(0, 500)].join('\n'));
    const broken = aRun('broken');
    writeFileSync(join(broken, 'run.json'), '{"id": ');
    const [status, html] = await get(`/?run=${idOf(good)}`);
    assert.equal(status, 200);
    assert.ok(html.includes('id="step-prime"') && html.includes('id="step-plan"'));
    assert.ok(visible(html).includes(`could not read ${join(broken, 'run.json')}`), visible(html));
    const [status2, other] = await get(`/live?run=${broken.split('/').pop()}`);
    assert.equal(status2, 200);
    assert.ok(visible(other).includes(`could not read ${join(broken, 'run.json')}`));
  });

  it('a freed port shows under its step', async () => {
    const dir = aRun('cleared', { state: 'done' });
    const run = loadRun(dir)!;
    run.steps[2] = { ...run.steps[2], state: 'running', turns: [turn(0, '03-build-0', '/dk-execute-plan p.md')] };
    saveRun(dir, run);
    writeFileSync(join(dir, 'events.log'), '2026-11-04T22:40:00.000Z build turn 0: freed port 5194 (pid 4242) after the turn was over for 2 min\n');
    const html = await live(dir);
    assert.ok(visible(under(html, 'build')).includes('freed port 5194 (pid 4242) after the turn was over for 2 min'));
    assert.ok(!visible(under(html, 'plan')).includes('freed port'));
  });

  it('a denied call shows as an alert', async () => {
    const dir = aRun('cleared', { state: 'done' });
    const run = loadRun(dir)!;
    run.steps[2] = { ...run.steps[2], state: 'done', turns: [turn(0, '03-build-0', '/dk-execute-plan p.md')] };
    saveRun(dir, run);
    writeFileSync(join(dir, 'steps', '03-build-0.jsonl'), readFileSync(join(samples, 'denied.jsonl')));
    const html = visible(under(await live(dir), 'build'));
    assert.ok(html.includes('Denied'), html);
    assert.ok(html.includes('Bash Unstage, format, show remaining biome issues'));
  });

  it('an answer saved but not yet sent leaves the step showing waiting', async () => {
    const dir = aRun();
    saveAnswer(dir, 'plan', 0, { kind: 'reply', text: 'go', at: '2026-11-04T10:03:00Z' });
    assert.match(visible(under(await live(dir), 'plan')), /waiting on you/);
  });

  it('the header carries the mode switch, the state, the time and the cost', async () => {
    const dir = aRun();
    const [, html] = await get(`/?run=${idOf(dir)}`);
    assert.match(html, /<form[^>]*action="\/mode"/);
    assert.match(html, /<input type="radio" name="mode" value="speed" checked/);
    assert.match(html, /<input type="radio" name="mode" value="slot-in"(?! checked)/);
    assert.match(visible(html), /\$1\.00/);
    assert.match(visible(html), /waiting/);
  });
});
