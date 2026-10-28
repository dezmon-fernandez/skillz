#!/usr/bin/env node
// Serve a comment page for markdown files, or for the outputs of one skill-creator eval iteration, and exit when
// the developer presses Send. That exit is what tells the agent to act.
//
//   node --no-warnings .claude/skills/annotate/scripts/annotate.ts <file.md> [more.md ...]
//   node --no-warnings .claude/skills/annotate/scripts/annotate.ts <iteration-folder>
//
// It listens on 127.0.0.1 only, and the page makes no other network calls.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { changedLines } from './changed-lines.ts';
import { imageFile } from './image-file.ts';

interface Source {
  path: string;
  group: string;
  version: string;
  title: string;
}

const FIRST_PORT = 8700;
const PORT_COUNT = 100;

// The text each document had at the developer's last Send, so the next page can tint what changed since then.
const snapshots = join(tmpdir(), 'annotate-snapshots');
const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const snapshotOf = (path: string) => join(snapshots, hash(resolve(path)) + '.md');
const linesOf = (text: string) => text.replace(/\n$/, '').split('\n');

// <eval>/<version>/outputs/<file>.md, or <eval>/<version>/run-<n>/outputs/<file>.md when each version ran more than
// once. The same run number of each version shares a group, so the two sit side by side.
function evalSources(iteration: string): Source[] {
  return readdirSync(iteration, { recursive: true, encoding: 'utf8' })
    .map((path) => path.split('/'))
    .filter(
      (parts) =>
        parts.at(-2) === 'outputs' &&
        parts.at(-1)!.endsWith('.md') &&
        (parts.length === 4 || (parts.length === 5 && /^run-\d+$/.test(parts[2])))
    )
    .sort((first, second) => first.join('/').localeCompare(second.join('/')))
    .map((parts) => {
      const [evaluation, version] = parts;
      const file = evaluation + '/' + (parts.length === 5 ? parts[2] + '/' : '') + parts.at(-1);
      return {
        path: join(iteration, ...parts),
        group: file,
        version,
        title: `${file} (${version.replaceAll('_', ' ')})`
      };
    });
}

function fileSources(paths: string[]): Source[] {
  return paths.map((path) => {
    const inRepo = relative(process.cwd(), path);
    return { path, group: path, version: '', title: inRepo.startsWith('..') ? path : inRepo };
  });
}

function readDocument(source: Source, text: string) {
  let previous: string | null = null;
  try {
    previous = readFileSync(snapshotOf(source.path), 'utf8');
  } catch {
    // Never sent before, so nothing counts as changed.
  }
  const lines = linesOf(text);
  return {
    // The text's hash is part of the id, so comments made on a version the agent has since edited no longer match.
    id: source.title + '@' + hash(text),
    group: source.group,
    version: source.version,
    title: source.title,
    lines,
    changed: previous === null ? [] : changedLines(linesOf(previous), lines)
  };
}

async function listen(server: Server, preferred: number): Promise<number> {
  for (let tries = 0; tries < PORT_COUNT; tries += 1) {
    const port = FIRST_PORT + ((preferred - FIRST_PORT + tries) % PORT_COUNT);
    const error = await new Promise<NodeJS.ErrnoException | null>((done) => {
      server.once('error', done);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', done);
        done(null);
      });
    });
    if (!error) return port;
    if (error.code !== 'EADDRINUSE') throw error;
  }
  throw new Error(`No free port from ${FIRST_PORT} to ${FIRST_PORT + PORT_COUNT - 1}`);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function replyImage(response: ServerResponse, sources: Source[], url: string) {
  const [, index, path] = url.match(/^\/image\/(\d+)\/(.+)$/) ?? [];
  const source = sources[Number(index)];
  try {
    const file = source && path ? imageFile(dirname(source.path), decodeURIComponent(path)) : null;
    if (file) return reply(response, 200, readFileSync(file.path), file.type);
  } catch {
    // A malformed path or a missing file is a 404 like any other.
  }
  reply(response, 404, '{}');
}

function reply(response: ServerResponse, status: number, body: string | Buffer, type = 'application/json') {
  response.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  response.end(body);
}

async function main() {
  const targets = process.argv.slice(2).map((target) => resolve(target));
  if (!targets.length) {
    console.error('Usage: annotate.ts <file.md> [more.md ...] | <iteration-folder>');
    process.exit(1);
  }
  const iteration = targets.length === 1 && statSync(targets[0]).isDirectory() ? targets[0] : null;
  const sources = iteration ? evalSources(iteration) : fileSources(targets);
  if (!sources.length) {
    console.error(`No <eval>/<version>/[run-<n>/]outputs/*.md files under ${iteration}`);
    process.exit(1);
  }

  const name = iteration ? `${basename(dirname(iteration))}/${basename(iteration)}` : sources.map((source) => source.title).join(', ');
  const key = hash(targets.join('\n'));
  const token = randomBytes(16).toString('base64url');
  const session = randomBytes(8).toString('hex');
  const texts = sources.map((source) => readFileSync(source.path, 'utf8'));
  const documents = sources.map((source, index) => readDocument(source, texts[index]));
  const data = JSON.stringify({ name, key, token, session, documents }).replaceAll('</', '<\\/');
  const escapedName = name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const page = readFileSync(join(import.meta.dirname, 'annotate.html'), 'utf8')
    .replace('__DATA__', () => data)
    .replace('__NAME__', () => escapedName);

  const server = createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/') return reply(response, 200, page, 'text/html; charset=utf-8');
    if (request.method === 'GET' && request.url === '/ping') return reply(response, 200, JSON.stringify({ session }));
    if (request.method === 'GET' && request.url?.startsWith('/image/')) return replyImage(response, sources, request.url);
    if (request.method !== 'POST' || request.url !== '/send') return reply(response, 404, '{}');

    const { token: given, text, ...feedback } = JSON.parse((await readBody(request)) || '{}');
    const sameKey = typeof given === 'string' && given.length === token.length
      && timingSafeEqual(Buffer.from(given), Buffer.from(token));
    if (!sameKey) return reply(response, 403, '{"error": "wrong key"}');

    mkdirSync(snapshots, { recursive: true });
    sources.forEach((source, index) => writeFileSync(snapshotOf(source.path), texts[index]));
    const feedbackFile = iteration ? join(iteration, 'feedback.json') : null;
    if (feedbackFile) writeFileSync(feedbackFile, JSON.stringify(feedback, null, 2));
    reply(response, 200, '{"ok": true}');

    console.log('SEND');
    console.log(`instruction: ${feedback.instruction || '(none)'}`);
    console.log(text);
    if (feedbackFile) console.log(`feedback: ${feedbackFile}`);
    server.close();
    server.closeAllConnections();
  });

  // The same target asks for the same port every time. The browser keeps comments per address, so the developer's
  // unsent comments survive a restart, and an open tab can reload itself once the page is back.
  const port = await listen(server, FIRST_PORT + (parseInt(key.slice(0, 8), 16) % PORT_COUNT));
  console.log(`Comment page for ${name}: http://127.0.0.1:${port}/`);
  console.log('Waiting for Send. Only this machine can reach it.');
}

await main();
