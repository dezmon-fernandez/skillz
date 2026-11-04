// Spawns the processes that outlive the session that ran `run.ts start`: the driver and the page. The page is one
// per Mac, so it is started only when nothing answers /whoami on its port.

import { closeSync, mkdirSync, openSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { home, port } from './run-folder.ts';
import { stdout } from './shell.ts';

type Spawn = (script: string, args: string[], log: string) => number;

// Runs a script of this skill under node, detached, its output appended to the log. Returns its pid.
export function spawnDetached(script: string, args: string[], log: string): number {
  mkdirSync(dirname(log), { recursive: true });
  const fd = openSync(log, 'a');
  try {
    const child = spawn(process.execPath, ['--no-warnings', script, ...args], { detached: true, stdio: ['ignore', fd, fd] });
    child.unref();
    return child.pid ?? 0;
  } finally {
    closeSync(fd);
  }
}

// The page's address once it answers, or one line that says why there is no page.
export async function ensurePage(spawnPage: Spawn): Promise<string> {
  const first = await whoami();
  if (first === 'page') return address();
  if (first === 'other') {
    const holder = stdout(['lsof', '-nP', `-iTCP:${port()}`, '-sTCP:LISTEN', '-Fc']).split('\n').find((l) => l.startsWith('c'));
    return `port ${port()} is held by another program (${holder ? holder.slice(1) : 'unknown'}); no page`;
  }
  const log = join(home(), 'page.log');
  spawnPage(join(import.meta.dirname, 'page.ts'), ['--port', String(port())], log);
  for (let waited = 0; waited < 5000; waited += 250) {
    await new Promise((done) => setTimeout(done, 250));
    if ((await whoami()) === 'page') return address();
  }
  return `the page did not start within 5 s; see ${log}`;
}

const address = () => `http://127.0.0.1:${port()}/`;

// 'page' when /whoami names this app, 'none' when nothing listens, 'other' when something else answers.
function whoami(): Promise<'page' | 'none' | 'other'> {
  return new Promise((done) => {
    const req = httpRequest({ host: '127.0.0.1', port: port(), path: '/whoami', timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          done(JSON.parse(body).app === 'run-workflow' ? 'page' : 'other');
        } catch {
          done('other');
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      done('other');
    });
    req.on('error', (error: NodeJS.ErrnoException) => done(error.code === 'ECONNREFUSED' ? 'none' : 'other'));
    req.end();
  });
}
