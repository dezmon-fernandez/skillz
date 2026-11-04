#!/usr/bin/env node
// The one status page for every workflow run on this Mac: the run list, newest first, and the open run's steps,
// decisions, notes and report. A step waiting on the developer shows an answer box, and the header carries the
// Speed / Slot in switch. view.ts reads a run and render.ts draws it; this file serves it.
//
//   node --no-warnings <skill>/scripts/page.ts [--port 8790]
//
// `run.ts start` starts it, detached, when nothing answers /whoami on the port. It reads the registry and the run
// folders it lists. It writes only a run's answers/ (an answer, created once) and its mode file; reading the page
// never changes a run. It listens on 127.0.0.1 only, and refuses a form posted from any other site, since an answer
// is sent to a session that can run commands.

import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveAnswer, waitingTurn, writeMode } from './answers.ts';
import { liveHtml, pageHtml, reportHtml } from './render.ts';
import { loadRun, port as defaultPort, registered } from './run-folder.ts';
import type { Answer } from './types.ts';

const MAX_BODY = 16 * 1024 * 1024;

export function serve(port: number): Promise<Server> {
  return new Promise((done, fail) => {
    const server = createServer((req, res) => {
      try {
        handle(req, res);
      } catch (error) {
        // One bad run folder never takes the page down.
        reply(res, 500, `the page failed: ${(error as Error).message}`);
      }
    });
    server.once('error', (error: NodeJS.ErrnoException) => fail(error.code === 'EADDRINUSE' ? new Error(`port ${port} is in use`) : error));
    server.listen(port, '127.0.0.1', () => done(server));
  });
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  // Reads too: a page that rebinds its own name to 127.0.0.1 could otherwise read every run's replies.
  if (!thisMachine(req)) return reply(res, 403, 'refused: not addressed to 127.0.0.1 or localhost');
  const open = runFolder(url.searchParams.get('run')) ?? registered()[0] ?? null;
  if (req.method === 'GET') {
    if (url.pathname === '/whoami') return reply(res, 200, JSON.stringify({ app: 'run-workflow' }), 'application/json');
    if (url.pathname === '/') return reply(res, 200, pageHtml(open), 'text/html; charset=utf-8');
    if (url.pathname === '/live') return reply(res, 200, liveHtml(open), 'text/html; charset=utf-8');
    if (url.pathname === '/report') {
      let text: string;
      try {
        text = readFileSync(resolve(open ?? '', 'report.md'), 'utf8');
      } catch {
        return reply(res, 404, 'no report yet');
      }
      return reply(res, 200, reportHtml(text), 'text/html; charset=utf-8');
    }
    return reply(res, 404, 'not found');
  }
  if (req.method !== 'POST' || (url.pathname !== '/answer' && url.pathname !== '/mode')) return reply(res, 404, 'not found');
  if (!sameSite(req)) return reply(res, 403, 'refused: posted from another site');
  body(req).then((text) => {
    if (text === null) return reply(res, 413, 'too long');
    const [status, out] = (url.pathname === '/answer' ? handleAnswer : handleMode)(new URLSearchParams(text));
    if (status === 303) {
      res.writeHead(303, { location: out, 'content-length': 0 });
      res.end();
      return;
    }
    reply(res, status, out);
  }, () => reply(res, 400, 'could not read the form'));
}

// ── The two forms ──

export function handleAnswer(form: URLSearchParams): [number, string] {
  const id = form.get('run') ?? '';
  const dir = runFolder(id);
  const run = dir ? loadRun(dir) : null;
  if (!dir || !run) return [404, 'no such run'];
  const step = run.steps.find((s) => s.id === form.get('step'));
  if (!step) return [404, 'no such step'];
  const turn = Number(form.get('turn'));
  const open = step.state === 'waiting' || step.state === 'failed';
  if (!open || turn !== waitingTurn(step)) {
    const now = open ? `${step.state} at turn ${waitingTurn(step)}` : step.state;
    return [409, `${step.id} is not waiting at turn ${form.get('turn')}; it is ${now}`];
  }
  const kind = form.get('kind') as Answer['kind'];
  const allowed = step.state === 'failed' ? ['retry', 'end'] : ['reply', 'go-on', 'end'];
  if (!allowed.includes(kind)) return [400, `a ${step.state} step takes ${allowed.join(', ')}`];
  // A textarea submits CRLF line breaks; nothing else in the text is changed (R6).
  const text = kind === 'reply' ? (form.get('text') ?? '').replace(/\r\n/g, '\n') : '';
  if (kind === 'reply' && !text.trim()) return [400, 'empty answer'];
  if (!saveAnswer(dir, step.id, turn, { kind, text, at: new Date().toISOString() })) return [409, 'already sent'];
  return back(id);
}

export function handleMode(form: URLSearchParams): [number, string] {
  const id = form.get('run') ?? '';
  const dir = runFolder(id);
  if (!dir || !loadRun(dir)) return [404, 'no such run'];
  const mode = form.get('mode');
  if (mode !== 'speed' && mode !== 'slot-in') return [400, 'mode must be speed or slot-in'];
  writeMode(dir, mode);
  return back(id);
}

// The registered run folder with this id, or null. An id is a folder name, never a path.
export function runFolder(id: string | null): string | null {
  if (!id || id !== basename(id)) return null;
  return registered().find((dir) => basename(dir) === id) ?? null;
}

const back = (id: string): [number, string] => [303, `/?run=${encodeURIComponent(id)}`];

// ── The request and the response ──

// A Host that is not this machine is a rebinding: another site's name pointed at 127.0.0.1.
function thisMachine(req: IncomingMessage): boolean {
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? '');
}

// A form posted from another site would put its words into a session that can run commands. The browser says
// where a post came from; only this page's own address is taken. handle() has checked the Host.
function sameSite(req: IncomingMessage): boolean {
  const host = req.headers.host ?? '';
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://${host}`;
}

async function body(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function reply(res: ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8'): void {
  res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(body);
}

async function main(argv: string[]): Promise<number> {
  const at = argv.indexOf('--port');
  const port = at >= 0 ? Number(argv[at + 1]) : defaultPort();
  try {
    await serve(port);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
  console.log(`run-workflow page: http://127.0.0.1:${port}/`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await main(process.argv.slice(2));
  if (code) process.exit(code);
}
