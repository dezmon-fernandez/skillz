#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Only git commands it knows to be read-only run: diff, log, show, status and the
// like, and the reading forms of branch, tag, remote, config, stash and the rest. Every other git command is
// blocked, however it is written: a write, a remote call, an alias, an external command such as `git lfs push`,
// or one this hook has never heard of.
//
//   node --no-warnings deny-git-writes.ts    (the hook's JSON on stdin; Node 22.18 or later)
//
// Exit 0 and silent: no opinion. Exit 2 with one line on stderr: blocked, and why. Input that is not JSON, or has
// no tool_input.command, has no command to judge: exit 0. This hook exists to block, so a command it cannot
// parse is still checked, and text that reads as a git write is blocked even inside quotes; the reason says so.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Subcommands that only read the repository and never reach a remote.
const READERS = new Set(('annotate blame cat-file check-attr check-ignore check-mailmap check-ref-format cherry ' +
  'count-objects describe diff diff-files diff-index diff-tree for-each-ref grep help log ls-files ls-tree merge-base ' +
  'name-rev range-diff rev-list rev-parse shortlog show show-branch show-ref status var verify-commit verify-tag ' +
  'version whatchanged').split(' '));
// Subcommands that read in some forms and write in others; readOnly() tells which.
const SOMETIMES = new Set('branch tag remote config stash worktree symbolic-ref reflog sparse-checkout hash-object'.split(' '));
// Writers in every form, which the text check looks for inside quotes and in a command it cannot parse.
const WRITERS = ('add am apply checkout cherry-pick clean clone commit fetch gc init merge mv pull push rebase reset ' +
  'restore revert rm stage switch update-ref').split(' ');
// Words that run the command after them.
const WRAPPERS = new Set(['env', 'command', 'nohup', 'time', 'xargs', 'exec', 'sudo', 'builtin']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash']);

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
// separator inside single quotes is text; inside double quotes only $( and backticks start a command.
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
function withoutRedirects(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (/^\d*(?:>>?|<<?|>&|<&|&>>?)$/.test(words[i])) i++;
    else if (!/^\d*(?:>>?|<<?|&>>?)\S/.test(words[i])) out.push(words[i]);
  }
  return out;
}

// One git invocation: its subcommand ('' for none) and its arguments. `parsed` is false for text the splitter
// could not read, where only the text check ran.
type GitCall = { sub: string; args: string[]; parsed: boolean };

// Each git invocation in the command, including those inside `sh -c '...'` and `eval`.
export function gitCalls(command: string, depth = 0): GitCall[] {
  const out: GitCall[] = [];
  for (const part of parts(command)) {
    const split = splitWords(part);
    if (!split) {
      const found = looseWrite(part);
      if (found) out.push({ sub: found, args: [], parsed: false });
      continue;
    }
    const words = withoutRedirects(split);
    let i = 0;
    // Command position: past VAR=value words, and past wrappers with their own options.
    for (;;) {
      if (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
      else if (i < words.length && WRAPPERS.has(words[i])) {
        i++;
        while (i < words.length && words[i].startsWith('-')) i++;
      } else break;
    }
    if (i >= words.length) continue;
    const name = words[i].slice(words[i].lastIndexOf('/') + 1);
    // A shell or eval runs its text as a command: read that text too.
    if (depth < 3 && SHELLS.has(name) && words[i + 1] === '-c' && words[i + 2] !== undefined) {
      out.push(...gitCalls(words[i + 2], depth + 1));
      continue;
    }
    if (depth < 3 && name === 'eval') {
      out.push(...gitCalls(words.slice(i + 1).join(' '), depth + 1));
      continue;
    }
    // git-<name> is git's own form of `git <name>`, and how external commands such as git-lfs are installed.
    if (/^git-[\w-]+$/.test(name)) {
      out.push({ sub: name.slice(4), args: words.slice(i + 1), parsed: true });
      continue;
    }
    if (name !== 'git') continue;
    i++;
    // git's own options before the subcommand; these take the next word as their value.
    while (i < words.length && words[i].startsWith('-')) {
      const w = words[i];
      i += ['-C', '-c', '--config-env', '--git-dir', '--work-tree', '--namespace'].includes(w) ? 2 : 1;
    }
    out.push({ sub: words[i] ?? '', args: words.slice(i + 1), parsed: true });
  }
  return out;
}

const positional = (args: string[]) => args.filter((a) => !a.startsWith('-'));

// Whether one of the SOMETIMES subcommands only reads, given its arguments.
export function readOnly(sub: string, args: string[]): boolean {
  const has = (...flags: string[]) => args.some((a) => flags.includes(a));
  const first = positional(args)[0];
  switch (sub) {
    case 'branch':
      if (!args.length) return true;
      if (has('-d', '-D', '-m', '-M', '-c', '-C', '-f', '-u', '--delete', '--move', '--copy', '--force', '--set-upstream-to',
        '--unset-upstream', '--edit-description') || args.some((a) => a.startsWith('--set-upstream-to='))) return false;
      return has('-l', '--list', '-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose', '--show-current', '--contains',
        '--merged', '--no-merged');
    case 'tag':
      return !args.length || (has('-l', '--list') && !has('-d', '--delete', '-f', '--force', '-a', '-s', '-m'));
    case 'remote':
      // `remote show` asks the remote; -n keeps it local but is rare enough to leave blocked.
      return !args.length || args.every((a) => a === '-v' || a === '--verbose') || first === 'get-url';
    case 'config':
      return args.some((a) => a.startsWith('--get') || a === '--list' || a === '-l');
    case 'stash':
      return first === 'list' || first === 'show';
    case 'worktree':
    case 'sparse-checkout':
      return first === 'list';
    case 'symbolic-ref':
      return !has('-d', '--delete') && positional(args).length < 2;
    case 'reflog':
      return first === undefined || first === 'show';
    case 'hash-object':
      return !has('-w');
  }
  return false;
}

// `git` followed by a known writer, anywhere in the text: for a part that cannot be split, and for text that
// reads as a git write inside quotes. The writer, or null.
const LOOSE = new RegExp(String.raw`(?:^|[^\w./-])(?:[\w./-]*/)?git\s+(?:(?:-C|-c)\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*(` +
  WRITERS.map((s) => s.replace('-', '\\-')).join('|') + String.raw`)(?![\w-])`);

function looseWrite(text: string): string | null {
  const m = LOOSE.exec(text);
  return m ? m[1] : null;
}

const ALLOWED = 'only git commands that read run here (diff, log, show, status, ls-files, rev-parse, merge-base, ...)';

// The one line to block with, or null for no opinion.
export function verdict(command: string): string | null {
  for (const call of gitCalls(command)) {
    if (!call.parsed) return `deny-git-writes: blocked: the command could not be parsed and looks like a git write (git ${call.sub}); ${ALLOWED}.`;
    if (call.sub === '' || READERS.has(call.sub)) continue;
    if (SOMETIMES.has(call.sub)) {
      if (readOnly(call.sub, call.args)) continue;
      return `deny-git-writes: blocked git ${call.sub}: this form changes the repository or reaches a remote; ${ALLOWED}.`;
    }
    return `deny-git-writes: blocked git ${call.sub}: not a git command this hook recognizes as read-only; ${ALLOWED}.`;
  }
  const loose = looseWrite(command);
  if (loose) return `deny-git-writes: blocked: text that reads as a git write (git ${loose}); ${ALLOWED}. Rephrase it if it is not a git command.`;
  return null;
}

function main(): number {
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
