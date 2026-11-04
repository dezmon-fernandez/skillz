// node --no-warnings --test tests/run-workflow/launch.test.ts
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ensurePage } from '../../skills/run-workflow/scripts/launch.ts';
import { serve } from '../../skills/run-workflow/scripts/page.ts';

// A port nothing listens on: the system picks one, and it is let go at once.
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const { port } = probe.address() as { port: number };
  await new Promise((done) => probe.close(done));
  return port;
}

describe('the page is started once per Mac', () => {
  let root: string;
  let port: number;
  let pages: Server[];
  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'rw-launch-'));
    process.env.RUN_WORKFLOW_HOME = join(root, 'home');
    port = await freePort();
    process.env.RUN_WORKFLOW_PORT = String(port);
    pages = [];
  });
  afterEach(() => {
    pages.forEach((page) => page.close());
    delete process.env.RUN_WORKFLOW_PORT;
    rmSync(root, { recursive: true, force: true });
  });

  // The spawner records each call and serves the page in this process, as the spawned page.ts would.
  const spawns: { script: string; args: string[] }[] = [];
  const spawner = (script: string, args: string[]) => {
    spawns.push({ script, args });
    // A port already held fails here, as page.ts would exit; ensurePage then reports no page.
    serve(Number(args[args.indexOf('--port') + 1])).then((page) => pages.push(page), () => {});
    return 1;
  };

  it('with no page up, the page is spawned once and its address returned once it answers', async () => {
    spawns.length = 0;
    assert.equal(await ensurePage(spawner), `http://127.0.0.1:${port}/`);
    assert.equal(spawns.length, 1);
    assert.match(spawns[0].script, /page\.ts$/);
    assert.deepEqual(spawns[0].args, ['--port', String(port)]);
  });

  it('a page already up gets no second', async () => {
    spawns.length = 0;
    pages.push(await serve(port));
    assert.equal(await ensurePage(spawner), `http://127.0.0.1:${port}/`);
    assert.equal(spawns.length, 0);
  });
});
