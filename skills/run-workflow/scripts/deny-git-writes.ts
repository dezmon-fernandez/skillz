#!/usr/bin/env node
// A PreToolUse hook on Bash that every step of a run carries in its --settings: no step runs a git command that
// changes the repository or reaches a remote, however it is written. Git commands that only read (diff, log, show,
// status, ls-files, merge-base, rev-parse, ...) run, because a review step reads with them.
//
//   node --no-warnings <skill>/scripts/deny-git-writes.ts    (the hook's JSON on stdin)
//
// Exit 0 and silent: no opinion. Exit 2 with one line on stderr: a git write, blocked; the step reads the line.
// Input that is not JSON, or has no tool_input.command, has no opinion. This hook exists to block, so a command it
// cannot parse is still checked, and text that reads as a git write is blocked even inside quotes: the reason says
// so, and the step can rephrase.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Always a write: each changes the repository, its index or working tree, or talks to a remote.
const ALWAYS = new Set(('add am apply bisect checkout cherry-pick clean clone commit fetch filter-branch gc init merge mv ' +
  'notes pull push rebase replace reset restore revert rm submodule switch update-index update-ref ' +
  // The porcelain's other names and the plumbing under it, and the commands that reach a remote to read it.
  'stage checkout-index read-tree commit-tree write-tree mktag mktree unpack-objects fast-import merge-file ' +
  'merge-index mergetool prune prune-packed repack pack-refs maintenance update-server-info rerere bundle ' +
  'fetch-pack send-pack ls-remote request-pull send-email').split(' '));
// A write only in some forms; isWrite() tells which.
const SOMETIMES = new Set('branch tag remote config stash worktree symbolic-ref reflog sparse-checkout hash-object'.split(' '));
// Words that run the command after them.
const WRAPPERS = new Set(['env', 'command', 'nohup', 'time', 'xargs', 'exec', 'sudo', 'builtin']);

// A shell word splitter: single quotes, double quotes with backslash escapes, backslashes outside quotes. null
// when a quote is left open.
export function splitWords(text: string): string[] | null {
  const words: string[] = [];
  let word = '';
  let inWord = false;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
    } else if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === '\\' && i + 1 < text.length && '"\\$`\n'.includes(text[i + 1])) word += text[++i];
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      inWord = true;
    } else if (c === '\\' && i + 1 < text.length) {
      word += text[++i];
      inWord = true;
    } else if (/\s/.test(c)) {
      if (inWord) words.push(word);
      word = '';
      inWord = false;
    } else {
      word += c;
      inWord = true;
    }
  }
  if (quote) return null;
  if (inWord) words.push(word);
  return words;
}

// The command split into the parts that each start a command: on ; && || | & newline ( ) $( and backticks. A
// separator inside single quotes is text; inside double quotes only $( and backticks start a command, and the
// part after them is left to parse as it can.
function parts(command: string): string[] {
  const out: string[] = [];
  let part = '';
  let quote: "'" | '"' | null = null;
  const cut = () => {
    out.push(part);
    part = '';
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote === "'") {
      part += c;
      if (c === "'") quote = null;
      continue;
    }
    if (c === '\\' && i + 1 < command.length) {
      part += c + command[++i];
      continue;
    }
    if (c === '`' || (c === '$' && command[i + 1] === '(')) {
      if (c === '$') i++;
      cut();
      quote = null;
      continue;
    }
    if (quote === '"') {
      part += c;
      if (c === '"') quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      part += c;
    } else if (';&|\n()'.includes(c)) {
      cut();
    } else {
      part += c;
    }
  }
  cut();
  return out.filter((p) => p.trim());
}

// A redirection is not an argument: `2>/dev/null` would read as symbolic-ref's second name. A bare operator
// (`>`, `2>>`) takes the next word with it.
function withoutRedirects(words: string[] | null): string[] | null {
  if (!words) return null;
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (/^\d*(?:>>?|<<?|>&|<&|&>>?)$/.test(words[i])) i++;
    else if (!/^\d*(?:>>?|<<?|&>>?)\S/.test(words[i])) out.push(words[i]);
  }
  return out;
}

const isGit = (word: string) => word === 'git' || word.endsWith('/git');

// One git invocation. `aliased`: it defines an alias on its own command line (`-c alias.p=push p`), so its
// subcommand may be any command at all.
type GitCall = { sub: string; args: string[]; parsed: boolean; aliased?: boolean };

// Each git invocation's subcommand and its arguments.
export function gitCalls(command: string): GitCall[] {
  const out: GitCall[] = [];
  for (const part of parts(command)) {
    const words = withoutRedirects(splitWords(part));
    if (!words) {
      const found = looseWrite(part);
      if (found) out.push({ sub: found, args: [], parsed: false });
      continue;
    }
    let i = 0;
    // Command position: past VAR=value words, and past wrappers with their own options.
    for (;;) {
      if (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
      else if (i < words.length && WRAPPERS.has(words[i])) {
        i++;
        while (i < words.length && words[i].startsWith('-')) i++;
      } else break;
    }
    if (i >= words.length || !isGit(words[i])) continue;
    i++;
    // git's own options before the subcommand.
    let aliased = false;
    while (i < words.length && words[i].startsWith('-')) {
      const w = words[i];
      const value = /^--config-env=/.test(w) ? w.slice('--config-env='.length) : words[i + 1] ?? '';
      if ((w === '-c' || w.startsWith('--config-env')) && /^alias\./i.test(value)) aliased = true;
      if (w === '-C' || w === '-c' || w === '--config-env' || w === '--git-dir' || w === '--work-tree' || w === '--namespace') i += 2;
      else i += 1;
    }
    if (i < words.length) out.push({ sub: words[i], args: words.slice(i + 1), parsed: true, aliased });
  }
  return out;
}

const positional = (args: string[]) => args.filter((a) => !a.startsWith('-'));

// Whether one call changes the repository or reaches a remote.
export function isWrite(sub: string, args: string[]): boolean {
  if (ALWAYS.has(sub)) return true;
  if (!SOMETIMES.has(sub)) return false;
  const has = (...flags: string[]) => args.some((a) => flags.includes(a));
  switch (sub) {
    case 'branch': {
      if (!args.length) return false;
      if (has('-d', '-D', '-m', '-M', '-c', '-C', '-f', '-u', '--delete', '--move', '--copy', '--force',
        '--set-upstream-to', '--unset-upstream', '--edit-description') || args.some((a) => a.startsWith('--set-upstream-to='))) return true;
      if (has('-l', '--list', '-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose', '--show-current', '--contains',
        '--merged', '--no-merged')) return false;
      return true;
    }
    case 'tag':
      if (!args.length) return false;
      return !(has('-l', '--list') && !has('-d', '--delete', '-f', '--force', '-a', '-s', '-m'));
    case 'remote': {
      if (!args.length || args.every((a) => a === '-v' || a === '--verbose')) return false;
      const first = positional(args)[0];
      return !(first === 'get-url' || first === 'show');
    }
    case 'config':
      return !args.some((a) => a.startsWith('--get') || a === '--list' || a === '-l');
    case 'stash': {
      const first = positional(args)[0];
      return !(first === 'list' || first === 'show');
    }
    case 'worktree':
      return positional(args)[0] !== 'list';
    case 'symbolic-ref':
      return has('-d', '--delete') || positional(args).length >= 2;
    case 'reflog': {
      const first = positional(args)[0];
      return first === 'expire' || first === 'delete';
    }
    case 'sparse-checkout':
      return positional(args)[0] !== 'list';
    case 'hash-object':
      return has('-w');
  }
  return false;
}

// `git` followed by a subcommand that always writes, anywhere in the text: for a part that cannot be split, and
// for text that reads as a git write inside quotes. The subcommand, or null.
const LOOSE = new RegExp(String.raw`(?:^|[^\w./-])(?:[\w./-]*/)?git\s+(?:(?:-C|-c)\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*(` +
  [...ALWAYS].map((s) => s.replace('-', '\\-')).join('|') + String.raw`)(?![\w-])`);

function looseWrite(text: string): string | null {
  const m = LOOSE.exec(text);
  return m ? m[1] : null;
}

const ALLOWED = 'only git commands that read run during a workflow (diff, log, show, status, ls-files, rev-parse, ...)';

// The one line to block with, or null for no opinion.
export function verdict(command: string): string | null {
  for (const call of gitCalls(command)) {
    if (!call.parsed) return `deny-git-writes: blocked: the command could not be parsed and looks like a git write (git ${call.sub}); ${ALLOWED}.`;
    if (call.aliased) return `deny-git-writes: blocked git -c alias.*: an alias defined on the command line could run any git command; ${ALLOWED}.`;
    if (isWrite(call.sub, call.args)) return `deny-git-writes: blocked git ${call.sub}: ${ALLOWED}.`;
  }
  const loose = looseWrite(command);
  if (loose) return `deny-git-writes: blocked: text that reads as a git write (git ${loose}); ${ALLOWED}. Rephrase it if it is not a git command.`;
  return null;
}

async function main(): Promise<number> {
  let command: unknown;
  try {
    command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command;
  } catch {
    return 0;
  }
  if (typeof command !== 'string' || !command.trim()) return 0;
  const reason = verdict(command);
  if (!reason) return 0;
  process.stderr.write(reason + '\n');
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
