// node --no-warnings --test tests/run-workflow/render.test.ts
//
// What the page shows of a run, read through the page server as the browser reads it.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { appendDecision, saveAnswer } from '../../skills/run-workflow/scripts/answers.ts';
import { drive } from '../../skills/run-workflow/scripts/driver.ts';
import { lines, repliesOf, subagentsOf, transcriptPath } from '../../skills/run-workflow/scripts/log.ts';
import { md } from '../../skills/run-workflow/scripts/markdown.ts';
import { openQuestions } from '../../skills/run-workflow/scripts/questions.ts';
import { loadRun, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { startsAgents, writeAgent } from './helpers.ts';
import { aRun, get, idOf, samples, turn, usePage } from './page-helpers.ts';

usePage();

// The part of the page under one step: from its row to the next step's.
function under(html: string, step: string): string {
  const start = html.search(new RegExp(`id="step-[^"]*-${step}"`));
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
    for (const q of ['Where does the percent reach full colour?', 'What happens to 50–59%?', 'Does the overdue column ramp the same?']) {
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

  it('an autonomous answer shows as answered for you, with its questions', async () => {
    const dir = aRun('first-run', { state: 'done', reason: '', turns: [turn(0, '02-plan-0', 'p'), turn(1, '02-plan-1', 'take the recommendations')] });
    appendDecision(dir, {
      at: '2026-11-04T10:02:00Z', step: 'plan', turn: 0, kind: 'answered', answer: 'take the recommendations', by: 'config',
      questions: [['Where does the percent reach full colour?', ''], ['What happens to 50–59%?', '']], evidence: 'steps/02-plan-0.jsonl:30'
    });
    const html = visible(under(await live(dir), 'plan'));
    assert.ok(html.includes('answered for you: take the recommendations'), html);
    assert.ok(html.includes('Where does the percent reach full colour?'));
    assert.doesNotMatch(under(await live(dir), 'plan'), /<textarea/);
    assert.ok(!visible(under(await live(dir), 'prime')).includes('answered for you'));
  });

  it('a paused turn shows every reply in order on the page', async () => {
    const dir = aRun();
    writeFileSync(join(dir, 'steps', '02-plan-0.jsonl'), readFileSync(join(samples, 'grill-paused.jsonl')));
    const html = under(await live(dir), 'plan');
    const replies = repliesOf(lines(join(dir, 'steps', '02-plan-0.jsonl')));
    assert.equal(replies.length, 5);
    const at = replies.map((r) => html.indexOf(md(r)));
    assert.ok(at.every((k) => k >= 0), JSON.stringify(at));
    assert.deepEqual([...at].sort((a, b) => a - b), at);
    // The last reply, the one the step waits on, is open; the earlier ones are folded above it.
    assert.match(html.slice(html.lastIndexOf('<div', at[4])), /^<div class="reply open-reply">/);
  });

  // A plan turn whose log starts the agents named, their files beside the session's transcript.
  function withAgents(dir: string, ids: string[], ended: boolean): string {
    const run = loadRun(dir)!;
    const events = [JSON.stringify({ type: 'system', subtype: 'init', session_id: 's' }), JSON.stringify(startsAgents(...ids))];
    if (ended) events.push(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'Here is what I found.', total_cost_usd: 1 }));
    writeFileSync(join(dir, 'steps', '02-plan-0.jsonl'), events.join('\n') + '\n');
    if (!ended) {
      run.steps[1] = { ...run.steps[1], state: 'running', reason: '', turns: [{ ...run.steps[1].turns[0], ended: null, seconds: null }] };
      run.state = 'running';
      saveRun(dir, run);
    }
    return subagentsOf(transcriptPath(run.workdir, 's'));
  }

  it('an ended turn lists every agent with its type, task, model, time and calls', async () => {
    const dir = aRun();
    const folder = withAgents(dir, ['toolu_1', 'toolu_2'], true);
    writeAgent(folder, 'toolu_1', { description: 'Inventory forms', calls: 3, minutes: 2 });
    writeAgent(folder, 'toolu_2', { description: 'Trace the save', calls: 5, minutes: 1.5 });
    const html = visible(under(await live(dir), 'plan'));
    assert.ok(html.includes('Explore "Inventory forms" · opus-5-5 · 2.0 min · 3 calls · finished'), html);
    assert.ok(html.includes('Explore "Trace the save" · opus-5-5 · 1.5 min · 5 calls · finished'), html);
  });

  it('an agent cut off when its turn ended says it did not finish', async () => {
    const dir = aRun();
    writeAgent(withAgents(dir, ['toolu_1'], true), 'toolu_1', { ended: false });
    assert.match(visible(under(await live(dir), 'plan')), /Explore "Inventory forms" · opus-5-5 · 2\.0 min · 3 calls · did not finish/);
  });

  it('a running turn shows its agents live, as before', async () => {
    const dir = aRun();
    writeAgent(withAgents(dir, ['toolu_1'], false), 'toolu_1', { ended: false, calls: 2 });
    const html = under(await live(dir), 'plan');
    assert.match(html, /<div class="agent"><strong>Explore &quot;Inventory forms&quot;<\/strong> <span class="agent-meta">opus-5-5, [^,]+, 2 calls<\/span>/);
    assert.ok(html.includes('<code>Read file-2.ts</code>'), html);
    assert.doesNotMatch(visible(html), /did not finish/);
  });

  // The head of a step's turn n: from its "turn n" to its prompt.
  const headOf = (html: string, n: number) => {
    const start = html.indexOf(`turn ${n}`);
    assert.ok(start >= 0, `no turn ${n}`);
    return html.slice(start, html.indexOf('class="prompt"', start));
  };

  it("a stopped turn's head shows its part and why", async () => {
    const waiting = { ...turn(0, '02-plan-0', '/grill-me Drop the progress bar.'), stop: { part: 'Grill' as const, why: 'asked 4 questions on scope' } };
    const dir = aRun('first-run', { turns: [waiting] });
    assert.match(visible(headOf(under(await live(dir), 'plan'), 0)), /Grill · stopped: asked 4 questions on scope/);
  });

  it('a turn that finished shows no stop tag', async () => {
    const finished = { ...turn(0, '02-plan-0', '/dk-plan x'), stop: { part: 'Finished' as const, why: 'finished' } };
    const dir = aRun('first-run', { state: 'done', reason: '', turns: [finished] });
    assert.doesNotMatch(visible(under(await live(dir), 'plan')), /stopped:/);
  });

  it("a turn not watched yet shows the runner's reason only", async () => {
    const dir = aRun('first-run', { turns: [{ ...turn(0, '02-plan-0', '/grill-me x'), watched: 'watching' }] });
    const html = visible(under(await live(dir), 'plan'));
    assert.ok(html.includes('human approval: its reply asks'), html);
    assert.doesNotMatch(html, /stopped:/);
  });

  it('an answer turn shows how many recommendations it took and where it differed', async () => {
    const asked = { ...turn(0, '02-plan-0', '/grill-me x'), stop: { part: 'Grill' as const, why: 'asked 4 questions' } };
    const answer = { ...turn(1, '02-plan-1', 'take recommendation'), answered: { took: 3, of: 4, differed: ['Q2 Edge cases'] } };
    const dir = aRun('first-run', { turns: [asked, answer] });
    const html = visible(under(await live(dir), 'plan'));
    assert.ok(html.includes('took 3 of 4 recommendations · differed on Q2 Edge cases'), html);
    // Turn 0 has an answer after it, so it stopped.
    assert.match(visible(headOf(under(await live(dir), 'plan'), 0)), /Grill · stopped: asked 4 questions/);
  });

  it('an answered turn lists the questions read from its log, though its decision logged none', async () => {
    const dir = aRun('first-run', { turns: [turn(0, '02-plan-0', '/grill-me x'), turn(1, '02-plan-1', 'take recommendation')] });
    writeFileSync(join(dir, 'steps', '02-plan-0.jsonl'), readFileSync(join(samples, 'grill-paused.jsonl')));
    appendDecision(dir, {
      at: '2026-11-04T10:02:00Z', step: 'plan', turn: 0, kind: 'answered', answer: 'take recommendation', by: 'config',
      questions: [], evidence: 'steps/02-plan-0.jsonl:604'
    });
    const html = visible(under(await live(dir), 'plan'));
    const open = openQuestions(repliesOf(lines(join(dir, 'steps', '02-plan-0.jsonl'))));
    assert.equal(open.length, 3);
    assert.match(html, /asked 3 answered for you: take recommendation/);
    for (const [q, rec] of open) assert.ok(html.includes(q) && html.includes(rec.slice(0, 60)), q);
    assert.doesNotMatch(html, /No question found/);
  });

  it('a failed step shows its last words and Retry and End run', async () => {
    const dir = aRun('first-run', { state: 'failed', reason: 'turn 0 exited with 1: Error: the model is overloaded' });
    const html = under(await live(dir), 'plan');
    assert.match(visible(html), /failed/);
    assert.ok(visible(html).includes('turn 0 exited with 1: Error: the model is overloaded'));
    assert.match(html, /<button[^>]*value="retry"[^>]*>Retry<\/button>/);
    assert.match(html, /<button[^>]*value="end"[^>]*>End run<\/button>/);
    assert.doesNotMatch(html, /value="go-on"/);
  });

  it('the run list holds every registered run, newest first', async () => {
    const older = aRun('second-run', {}, '2026-11-03T10:13:00Z');
    aRun('first-run', {}, '2026-11-04T22:04:00Z');
    const [, html] = await get('/');
    const list = html.slice(html.indexOf('class="runs"'), html.indexOf('</nav>'));
    assert.ok(list.indexOf('first-run') >= 0 && list.indexOf('second-run') > list.indexOf('first-run'), list);
    // The newest is the one open, unless another is asked for.
    assert.match(visible(html), /first-run · started/);
    assert.match(visible((await get(`/?run=${idOf(older)}`))[1]), /second-run · started/);
  });

  it('notes and the report show once written', async () => {
    const dir = aRun();
    assert.match(visible(await live(dir)), /Report: not yet/);
    writeFileSync(join(dir, 'notes.md'), "## 02 Plan, turn 0\n\n- Quote the request's numbers. Evidence: steps/02-plan-0.jsonl:30\n\n");
    writeFileSync(join(dir, 'report.md'), '# first-run: done\n\n## What went well\n\n- **Fast**: 3 turns\n');
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

  it('a driver that failed says why', async () => {
    const dir = aRun();
    writeFileSync(join(dir, 'config.json'), '{ not json');
    // The driver prints the stack for driver.log; the test keeps it out of its output.
    const print = console.error;
    console.error = () => {};
    try {
      assert.equal(await drive(dir), 0);
    } finally {
      console.error = print;
    }
    const page = visible(await live(dir));
    assert.match(page, /driver not running the driver failed: [^.]*JSON[^]*; see driver\.log\. Restart it with/);
  });

  it('a malformed log and an unreadable run.json never blank the page', async () => {
    const good = aRun();
    const rows = readFileSync(join(samples, 'plan-asks.jsonl'), 'utf8').split('\n').filter(Boolean);
    writeFileSync(join(good, 'steps', '02-plan-0.jsonl'), [rows[0], '{not json', ...rows.slice(1, -1), rows.at(-1)!.slice(0, 500)].join('\n'));
    const broken = aRun('broken');
    writeFileSync(join(broken, 'run.json'), '{"id": ');
    const [status, html] = await get(`/?run=${idOf(good)}`);
    assert.equal(status, 200);
    assert.ok(html.includes(`id="step-${idOf(good)}-prime"`) && html.includes(`id="step-${idOf(good)}-plan"`));
    assert.ok(visible(html).includes(`could not read ${join(broken, 'run.json')}`), visible(html));
    const [status2, other] = await get(`/live?run=${broken.split('/').pop()}`);
    assert.equal(status2, 200);
    assert.ok(visible(other).includes(`could not read ${join(broken, 'run.json')}`));
  });

  it('a freed port shows under its step', async () => {
    const dir = aRun('first-run', { state: 'done' });
    const run = loadRun(dir)!;
    run.steps[2] = { ...run.steps[2], state: 'running', turns: [turn(0, '03-build-0', '/dk-execute-plan p.md')] };
    saveRun(dir, run);
    writeFileSync(join(dir, 'events.log'), '2026-11-04T22:40:00.000Z build turn 0: freed port 5194 (pid 4242) after the turn was over for 2 min\n');
    const html = await live(dir);
    assert.ok(visible(under(html, 'build')).includes('freed port 5194 (pid 4242) after the turn was over for 2 min'));
    assert.ok(!visible(under(html, 'plan')).includes('freed port'));
  });

  it('a denied call shows as an alert', async () => {
    const dir = aRun('first-run', { state: 'done' });
    const run = loadRun(dir)!;
    run.steps[2] = { ...run.steps[2], state: 'done', turns: [turn(0, '03-build-0', '/dk-execute-plan p.md')] };
    saveRun(dir, run);
    writeFileSync(join(dir, 'steps', '03-build-0.jsonl'), readFileSync(join(samples, 'denied.jsonl')));
    const html = visible(under(await live(dir), 'build'));
    assert.ok(html.includes('Denied'), html);
    assert.ok(html.includes('Bash Unstage, format, show remaining lint issues'));
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
    assert.match(html, /<input type="radio" name="mode" value="autonomous" checked/);
    assert.match(html, /<input type="radio" name="mode" value="human-approval"(?! checked)/);
    assert.match(visible(html), /\$1\.00/);
    assert.match(visible(html), /waiting/);
  });
});
