// Runs a short command and returns what it printed.

import { spawnSync } from 'node:child_process';

// A command's stdout, or "" when it cannot run. Its exit status is not an error here: git diff exits 1 on a diff.
export function stdout(cmd: string[], cwd?: string): string {
  const out = spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'] });
  return out.error ? '' : out.stdout || '';
}
