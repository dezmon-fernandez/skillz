// What the run changed in its workdir since the commit it started from: the files it touched and the tests it
// added, for the page. Rewritten from the eval rounds' status page, behaviour unchanged unless a comment says
// otherwise.

import { readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { stdout } from './shell.ts';
import type { FileRow, TestFile } from './types.ts';

const PY_TEST = /^\s*(?:async\s+)?def\s+(test_\w+)\s*\(/;
const JS_TEST = /\b(?:it|test)(?:\.\w+)?\(\s*(["'`])(.+?)\1/;
const DOC = /^\s*[rRbBuU]?("{3}|'{3})(.*?)(?:\1)?\s*$/;

const isDir = (path: string) => {
  try {
    return !!path && statSync(path).isDirectory();
  } catch {
    return false;
  }
};

const untracked = (cwd: string) => stdout(['git', '-C', cwd, 'ls-files', '-o', '--exclude-standard']).split('\n').filter(Boolean);

// (added | changed | deleted, path, lines added, lines removed) per file the workdir changed since base. The
// status page's ignore list is gone: a run's workdir holds only the steps' work.
export function filesTouched(cwd: string, base: string): FileRow[] {
  if (!isDir(cwd)) return [];
  const stats: Record<string, [number, number]> = {};
  for (const row of stdout(['git', '-C', cwd, 'diff', '--numstat', base]).split('\n')) {
    const parts = row.split('\t');
    if (parts.length === 3) stats[parts[2]] = [/^\d+$/.test(parts[0]) ? +parts[0] : 0, /^\d+$/.test(parts[1]) ? +parts[1] : 0];
  }
  const tracked = stdout(['git', '-C', cwd, 'diff', '--name-status', base]).split('\n').filter(Boolean)
    .map((row) => [row[0], row.split('\t').pop()!] as [string, string]);
  const changed = [...tracked, ...untracked(cwd).map((p) => ['A', p] as [string, string])];
  return changed.map(([code, path]) => {
    if (!stats[path]) {
      // Untracked: git's numstat never saw it.
      try {
        stats[path] = [(readFileSync(join(cwd, path), 'utf8').match(/\n/g) || []).length, 0];
      } catch {
        stats[path] = [0, 0];
      }
    }
    return [code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'changed', path, ...stats[path]] as FileRow;
  });
}

// (test file, its tests) for every test the workdir added since base: added lines in the files it changed, and
// every test in a test file it created.
export function testsAdded(cwd: string, base: string): TestFile[] {
  if (!isDir(cwd)) return [];
  const found = new Map<string, string[]>();
  let path: string | null = null;
  for (const row of stdout(['git', '-C', cwd, 'diff', '-U0', base]).split('\n')) {
    if (row.startsWith('+++ ')) path = row.startsWith('+++ b/') ? row.slice(6) : null;
    else if (path && isTestFile(path) && row.startsWith('+') && !row.startsWith('+++')) found.set(path, [...(found.get(path) ?? []), row.slice(1)]);
    else if (path && row.startsWith('@@')) found.set(path, [...(found.get(path) ?? []), '']);
  }
  for (const p of untracked(cwd)) {
    if (!isTestFile(p)) continue;
    try {
      found.set(p, readFileSync(join(cwd, p), 'utf8').split('\n'));
    } catch {
      // Gone between the listing and the read.
    }
  }
  const out: TestFile[] = [];
  for (const [p, rows] of found) {
    const names = testNames(rows);
    if (names.length) out.push([p, names]);
  }
  return out;
}

function isTestFile(path: string): boolean {
  return /^(test_.*\.py|.*_test\.py|.*\.(test|spec)\.[jt]sx?)$/.test(basename(path));
}

function testNames(rows: string[]): [string, string][] {
  const out: [string, string][] = [];
  rows.forEach((row, i) => {
    const py = PY_TEST.exec(row);
    if (py) {
      const doc = i + 1 < rows.length ? DOC.exec(rows[i + 1]) : null;
      out.push([py[1].slice(5).replace(/_/g, ' '), doc ? doc[2].trim() : '']);
      return;
    }
    const js = JS_TEST.exec(row);
    if (js) out.push([js[2], '']);
  });
  return out;
}
