// node --no-warnings --test tests/run-workflow/page.test.ts
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { readAnswer, readMode } from '../../skills/run-workflow/scripts/answers.ts';
import { serve } from '../../skills/run-workflow/scripts/page.ts';
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

  it('the mode switch writes the mode', async () => {
    const dir = aRun();
    const [status, , location] = await post('/mode', { run: idOf(dir), mode: 'slot-in' });
    assert.equal(status, 303);
    assert.equal(location, `/?run=${idOf(dir)}`);
    assert.equal(readMode(dir), 'slot-in');
    assert.equal((await post('/mode', { run: idOf(dir), mode: 'fast' }))[0], 400);
    assert.equal(readMode(dir), 'slot-in');
  });

  it('a post from another site is refused', async () => {
    const dir = aRun();
    const [status] = await post('/answer', { run: idOf(dir), step: 'plan', turn: '0', kind: 'reply', text: 'rm -rf' },
      { origin: 'https://example.com' });
    assert.equal(status, 403);
    assert.equal((await post('/mode', { run: idOf(dir), mode: 'slot-in' }, { 'sec-fetch-site': 'cross-site' }))[0], 403);
    assert.equal(readAnswer(dir, 'plan', 0), null);
    assert.equal(readMode(dir), 'speed');
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
