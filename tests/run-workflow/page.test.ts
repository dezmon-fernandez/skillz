// node --no-warnings --test tests/run-workflow/page.test.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { readAnswer, readMode } from '../../skills/run-workflow/scripts/answers.ts';
import { serve } from '../../skills/run-workflow/scripts/page.ts';
import { loadRun, saveRun } from '../../skills/run-workflow/scripts/run-folder.ts';
import { aRun, base, get, idOf, server, turn, usePage } from './page-helpers.ts';

usePage();

async function post(path: string, fields: Record<string, string>, headers: Record<string, string> = {}): Promise<[number, string, string | null]> {
  const res = await fetch(base + path, {
    method: 'POST', body: new URLSearchParams(fields), redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }
  });
  return [res.status, await res.text(), res.headers.get('location')];
}

describe('the page server', () => {
  it('/whoami names the app', async () => {
    const res = await fetch(base + '/whoami');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { app: 'run-workflow' });
  });

  it('an answer to a waiting step is saved exactly, CRLF made LF', async () => {
    const dir = aRun();
    const [status, , location] = await post('/answer', { run: idOf(dir), step: 'plan', turn: '0', kind: 'reply', text: 'a\r\n“b”\r\n  c' });
    assert.equal(status, 303);
    assert.equal(location, `/?run=${idOf(dir)}`);
    assert.equal(readAnswer(dir, 'plan', 0)!.text, 'a\n“b”\n  c');
    assert.equal(readAnswer(dir, 'plan', 0)!.kind, 'reply');
    // Nothing at the edges is trimmed either.
    const other = aRun('edges');
    assert.equal((await post('/answer', { run: idOf(other), step: 'plan', turn: '0', kind: 'reply', text: '  a\r\n\r\n' }))[0], 303);
    assert.equal(readAnswer(other, 'plan', 0)!.text, '  a\n\n');
  });

  it('an empty answer is refused', async () => {
    const dir = aRun();
    for (const text of ['', '  \r\n ']) {
      assert.deepEqual((await post('/answer', { run: idOf(dir), step: 'plan', turn: '0', kind: 'reply', text })).slice(0, 2), [400, 'empty answer']);
    }
    assert.equal(existsSync(join(dir, 'answers', 'plan-0.json')), false);
  });

  it('a second send is refused', async () => {
    const dir = aRun();
    const fields = { run: idOf(dir), step: 'plan', turn: '0', kind: 'reply', text: 'first' };
    assert.equal((await post('/answer', fields))[0], 303);
    assert.deepEqual((await post('/answer', { ...fields, text: 'second' })).slice(0, 2), [409, 'already sent']);
    assert.equal(readAnswer(dir, 'plan', 0)!.text, 'first');
  });

  it('an answer to a step that is not waiting is refused with its state', async () => {
    const running = aRun('first-run', { state: 'running' });
    assert.deepEqual((await post('/answer', { run: idOf(running), step: 'plan', turn: '0', kind: 'reply', text: 'x' })).slice(0, 2),
      [409, 'plan is not waiting at turn 0; it is running']);
    const later = aRun('later', { turns: [turn(0, '02-plan-0', 'p'), turn(1, '02-plan-1', 'take the recommendations')] });
    const [status, text] = await post('/answer', { run: idOf(later), step: 'plan', turn: '0', kind: 'reply', text: 'x' });
    assert.equal(status, 409);
    assert.equal(text, 'plan is not waiting at turn 0; it is waiting at turn 1');
    assert.equal(readdirSync(join(running, 'answers')).length + readdirSync(join(later, 'answers')).length, 0);
    assert.deepEqual((await post('/answer', { run: 'nope', step: 'plan', turn: '0', kind: 'reply', text: 'x' })).slice(0, 2), [404, 'no such run']);
  });

  it('a failed step takes only Retry or End', async () => {
    const dir = aRun('first-run', { state: 'failed', reason: 'turn 0 exited with 1' });
    assert.equal((await post('/answer', { run: idOf(dir), step: 'plan', turn: '0', kind: 'reply', text: 'x' }))[0], 400);
    assert.equal((await post('/answer', { run: idOf(dir), step: 'plan', turn: '0', kind: 'retry', text: '' }))[0], 303);
    assert.equal(readAnswer(dir, 'plan', 0)!.kind, 'retry');
  });

  it('the switch reads Autonomous and Human approval, and switches the run', async () => {
    const dir = aRun();
    const visible = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(visible((await get(`/?run=${idOf(dir)}`))[1]), /Autonomous Human approval/);
    const [status, , location] = await post('/mode', { run: idOf(dir), mode: 'human-approval' });
    assert.equal(status, 303);
    assert.equal(location, `/?run=${idOf(dir)}`);
    assert.equal(readMode(dir), 'human-approval');
    assert.match((await get(`/?run=${idOf(dir)}`))[1], /<input type="radio" name="mode" value="human-approval" checked/);
    assert.equal((await post('/mode', { run: idOf(dir), mode: 'fast' }))[0], 400);
    assert.equal(readMode(dir), 'human-approval');
  });

  it('a mode posted in the old words is refused', async () => {
    const dir = aRun();
    assert.deepEqual((await post('/mode', { run: idOf(dir), mode: 'slot-in' })).slice(0, 2), [400, 'mode must be autonomous or human-approval']);
    assert.equal(readFileSync(join(dir, 'mode'), 'utf8'), 'autonomous\n');
  });

  it('a post from another site is refused', async () => {
    const dir = aRun();
    const [status] = await post('/answer', { run: idOf(dir), step: 'plan', turn: '0', kind: 'reply', text: 'rm -rf' },
      { origin: 'https://example.com' });
    assert.equal(status, 403);
    assert.equal((await post('/mode', { run: idOf(dir), mode: 'human-approval' }, { 'sec-fetch-site': 'cross-site' }))[0], 403);
    assert.equal(readAnswer(dir, 'plan', 0), null);
    assert.equal(readMode(dir), 'autonomous');
  });

  it('a request addressed to another name is refused, reads included', async () => {
    const dir = aRun();
    const port = (server.address() as { port: number }).port;
    // fetch() will not set Host, so the request is made by hand, as a rebound name would make it.
    const as = (host: string, path: string) => new Promise<[number, string]>((done, fail) => {
      request({ host: '127.0.0.1', port, path, headers: { host } }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => done([res.statusCode!, body]));
      }).on('error', fail).end();
    });
    for (const path of ['/', `/live?run=${idOf(dir)}`, `/report?run=${idOf(dir)}`, '/whoami']) {
      const [status, body] = await as(`rebound.example:${port}`, path);
      assert.equal(status, 403, path);
      assert.doesNotMatch(body, /Drop the progress bar|Plan/, path);
    }
    assert.equal((await as(`localhost:${port}`, `/live?run=${idOf(dir)}`))[0], 200);
  });

  it('reading the page changes nothing', async () => {
    const dir = aRun();
    writeFileSync(join(dir, 'report.md'), '# first-run: done\n');
    const snapshot = () => {
      const out: Record<string, number> = {};
      const walk = (d: string) => {
        for (const name of readdirSync(d)) {
          const p = join(d, name);
          const st = statSync(p);
          if (st.isDirectory()) walk(p);
          else out[relative(dir, p)] = st.mtimeMs;
        }
      };
      walk(dir);
      return out;
    };
    const before = snapshot();
    for (let k = 0; k < 10; k++) {
      for (const path of ['/', `/?run=${idOf(dir)}`, `/live?run=${idOf(dir)}`, `/report?run=${idOf(dir)}`]) assert.equal((await get(path))[0], 200, path);
    }
    assert.deepEqual(snapshot(), before);
  });

  it('a second page on a held port is refused with one line', async () => {
    const port = (server.address() as { port: number }).port;
    await assert.rejects(serve(port), { message: `port ${port} is in use` });
  });
});

describe('runs side by side', () => {
  const visible = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  // Each column's HTML, in order.
  const columnsOf = (html: string) => (html.includes('</main>') ? html.slice(0, html.indexOf('</main>')) : html)
    .split('<section class="column"').slice(1).map((c) => c.slice(c.indexOf('>') + 1));
  // A run's view as the page draws it alone: what follows the run list.
  const alone = async (dir: string) => {
    const html = (await get(`/live?run=${idOf(dir)}`))[1];
    return html.slice(html.indexOf('</nav>') + '</nav>'.length);
  };
  const both = (a: string, b: string) => `/?runs=${idOf(a)}&runs=${idOf(b)}`;

  it('two runs open side by side, each as it looks alone', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    const [status, html] = await get(both(a, b));
    assert.equal(status, 200);
    const columns = columnsOf(html);
    assert.equal(columns.length, 2);
    assert.match(visible(columns[0]), /^arm-a · started/);
    assert.match(visible(columns[1]), /^arm-b · started/);
    assert.equal(visible(columns[0]), visible(await alone(a)));
    assert.equal(visible(columns[1]), visible(await alone(b)));
  });

  it('two runs with a plan step never share a name on the page', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    const html = (await get(both(a, b)))[1];
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids, [...new Set(ids)], 'an id appears twice');
    const boxes = [...html.matchAll(/<textarea id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(boxes.length, 2);
    for (const id of boxes) assert.match(html, new RegExp(`<label for="${id}">`));
    assert.ok(boxes[0].includes(idOf(a)) && boxes[1].includes(idOf(b)), JSON.stringify(boxes));
    const keys = [...html.matchAll(/data-key="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(keys, [...new Set(keys)], 'a data-key appears twice');
  });

  it('an answer from the side-by-side view returns to it, and touches only its run', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    assert.match((await get(both(a, b)))[1], new RegExp(`name="view" value="${idOf(a)},${idOf(b)}"`));
    const [status, , location] = await post('/answer', { run: idOf(a), step: 'plan', turn: '0', kind: 'reply', text: 'take recommendation', view: `${idOf(a)},${idOf(b)}` });
    assert.equal(status, 303);
    assert.equal(location, both(a, b));
    assert.equal(readAnswer(a, 'plan', 0)!.text, 'take recommendation');
    assert.deepEqual(readdirSync(join(b, 'answers')), []);
  });

  it('the mode switch from the side-by-side view returns to it', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    // Each column's switch carries the runs on screen, so it returns to them.
    const forms = [...(await get(both(a, b)))[1].matchAll(/<form class="mode"[^]*?<\/form>/g)].map((m) => m[0]);
    assert.equal(forms.length, 2);
    for (const form of forms) assert.match(form, new RegExp(`name="view" value="${idOf(a)},${idOf(b)}"`));
    const [status, , location] = await post('/mode', { run: idOf(b), mode: 'human-approval', view: `${idOf(a)},${idOf(b)}` });
    assert.equal(status, 303);
    assert.equal(location, both(a, b));
    assert.equal(readMode(b), 'human-approval');
    assert.equal(readMode(a), 'autonomous');
  });

  it('a run in the address that is not registered shows one problem line in its column', async () => {
    const a = aRun('arm-a');
    const [status, html] = await get(`/?runs=${idOf(a)}&runs=gone`);
    assert.equal(status, 200);
    const columns = columnsOf(html);
    assert.equal(columns.length, 2);
    assert.equal(visible(columns[0]), visible(await alone(a)));
    assert.equal(visible(columns[1]), 'no run gone on this Mac');
  });

  it('an unreadable run.json in one column leaves the other showing', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    const address = both(a, b);
    writeFileSync(join(b, 'run.json'), '{');
    const columns = columnsOf((await get(address))[1]);
    assert.equal(visible(columns[0]), visible(await alone(a)));
    assert.equal(visible(columns[1]), `could not read ${join(b, 'run.json')}`);
  });

  it('one run named in the list shows as it does alone', async () => {
    const a = aRun('arm-a');
    aRun('arm-b');
    const drop = (html: string) => html.replace(/<div class="updated">[^<]*<\/div>/, '');
    assert.equal(drop((await get(`/live?runs=${idOf(a)}`))[1]), drop((await get(`/live?run=${idOf(a)}`))[1]));
    // Alone means no columns: one run fills the page as it always has.
    assert.doesNotMatch((await get(`/live?runs=${idOf(a)}`))[1], /class="columns"/);
    assert.equal(drop((await get(`/?runs=${idOf(a)}`))[1]), drop((await get(`/?run=${idOf(a)}`))[1]));
  });

  it('a run started later joins the view when chosen', async () => {
    const a = aRun('arm-a', { state: 'done', reason: '' }, '2026-11-04T10:00:00Z');
    const doneRun = loadRun(a)!;
    doneRun.state = 'done';
    saveRun(a, doneRun);
    const b = aRun('arm-b', { state: 'running', reason: '' }, '2026-11-04T10:01:00Z');
    const running = loadRun(b)!;
    running.state = 'running';
    saveRun(b, running);
    const columns = columnsOf((await get(both(a, b)))[1]);
    assert.equal(columns.length, 2);
    assert.match(visible(columns[0]), /^arm-a · started \d\d:\d\d · [^ ]+ [^ ]+ · \$[\d.]+ done/);
    assert.match(visible(columns[1]), /^arm-b · started \d\d:\d\d · [^ ]+ [^ ]+ · \$[\d.]+ running/);
  });

  it("the run list's boxes open the chosen runs side by side", async () => {
    const a = aRun('arm-a', {}, '2026-11-04T10:00:00Z');
    const b = aRun('arm-b', {}, '2026-11-04T10:01:00Z');
    const html = (await get('/'))[1];
    const list = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'));
    assert.match(list, /<form[^>]*method="get"[^>]*action="\/"|<form[^>]*action="\/"[^>]*method="get"/);
    const boxes = [...list.matchAll(/<input type="checkbox" name="runs" value="([^"]+)"([^>]*)>/g)];
    assert.deepEqual(boxes.map((m) => m[1]), [idOf(b), idOf(a)]);
    // The newest is the one open, so its box is checked.
    assert.deepEqual(boxes.map((m) => / checked/.test(m[2])), [true, false]);
    assert.match(list, /<button type="submit">Side by side<\/button>/);
    const chosen = (await get(both(a, b)))[1];
    const ticked = [...chosen.matchAll(/<input type="checkbox" name="runs" value="([^"]+)"([^>]*)>/g)].filter((m) => / checked/.test(m[2]));
    assert.equal(ticked.length, 2);
  });

  it('the refresh returns every named run', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    const [status, html] = await get(`/live?runs=${idOf(a)}&runs=${idOf(b)}`);
    assert.equal(status, 200);
    const columns = columnsOf(html);
    assert.equal(columns.length, 2);
    assert.equal(visible(columns[0]), visible(await alone(a)));
    assert.equal(visible(columns[1]), visible(await alone(b)));
    // The page refreshes with its own address, so the refresh asks for the same runs.
    assert.match((await get(both(a, b)))[1], new RegExp(`data-query="runs=${idOf(a)}&amp;runs=${idOf(b)}"`));
  });

  it('opening and reloading the side-by-side view never changes a run', async () => {
    const a = aRun('arm-a');
    const b = aRun('arm-b');
    const record = (dir: string) => [readFileSync(join(dir, 'run.json'), 'utf8'), readFileSync(join(dir, 'mode'), 'utf8'), readdirSync(join(dir, 'answers')).join(',')];
    const before = [record(a), record(b)];
    for (let k = 0; k < 3; k++) assert.equal((await get(both(a, b)))[0], 200);
    assert.deepEqual([record(a), record(b)], before);
  });
});
