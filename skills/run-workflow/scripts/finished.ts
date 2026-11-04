// Whether a step has finished: the config's `done` names a file the step must leave (a glob in the workdir,
// written since the run began) and words its reply must say. A step with no `done` finishes when its turn ends.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { StepConfig } from './types.ts';

// [finished, the file it left or null].
export function finished(step: StepConfig, reply: string, workdir: string, runStarted: number): [boolean, string | null] {
  if (!step.done) return [true, null];
  let ok = true;
  let file: string | null = null;
  if (step.done.file) {
    file = newestMatch(workdir, step.done.file, runStarted);
    ok &&= file !== null;
  }
  if (step.done.says) ok &&= reply.includes(step.done.says);
  return [ok, file];
}

// The newest file under workdir that matches the glob and was written at or after `since`, as a workdir path.
// Only the glob's own folders are read.
export function newestMatch(workdir: string, glob: string, since: number): string | null {
  const segments = glob.split('/');
  const fixed: string[] = [];
  while (segments.length > 1 && !/[*?]/.test(segments[0])) fixed.push(segments.shift()!);
  const deep = segments.includes('**') || segments.some((s) => s.includes('**'));
  const pattern = globRegex(glob);
  let best: [number, string] | null = null;
  const walk = (rel: string, depth: number) => {
    let names: string[];
    try {
      names = readdirSync(join(workdir, rel));
    } catch {
      return;
    }
    for (const name of names) {
      if (name === '.git') continue;
      const path = rel ? `${rel}/${name}` : name;
      let st;
      try {
        st = statSync(join(workdir, path));
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (deep || depth + 1 < segments.length) walk(path, depth + 1);
      } else if (pattern.test(path) && st.mtimeMs >= since && (!best || st.mtimeMs > best[0])) {
        best = [st.mtimeMs, path];
      }
    }
  };
  walk(fixed.join('/'), 0);
  return best ? (best as [number, string])[1] : null;
}

function globRegex(glob: string): RegExp {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') {
        i++;
        out += '(?:.*/)?';
      } else out += '.*';
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}
