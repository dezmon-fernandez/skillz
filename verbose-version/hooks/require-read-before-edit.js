#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Denies shell commands that modify files so every change
// goes through Edit/Write, which require a prior Read. Bypass-permissions mode steers the model
// toward sed and heredocs, which skip that Read. Reads and writes to scratch locations pass.

// Redirect targets and tee targets that may be written freely.
const ALLOWED_TARGET = /^(\/dev\/null|\/dev\/std(out|err)|\/tmp(\/.*)?)$/;

// Commands whose in-place flag rewrites a file.
const IN_PLACE_EDITORS = new Set(['sed', 'perl']);

function stripQuotes(word) {
  return word.replace(/^["']|["']$/g, '');
}

function baseName(word) {
  return word.slice(word.lastIndexOf('/') + 1);
}

function findViolation(command) {
  // 1. Output redirects: >, >>, &>, &>>, N>, N>>. Skips fd duplication (>&2), process substitution (>(...)),
  //    and arrows inside text (->, =>).
  const redirect = /(?<![<>=-])(?:&|\d*)>{1,2}\|?\s*["']?([^\s"';|&)]+)/g;
  let match;
  while ((match = redirect.exec(command)) !== null) {
    const target = match[1];
    if (target.startsWith('&') || target.startsWith('(')) continue;
    if (!ALLOWED_TARGET.test(target)) return `redirect to "${target}"`;
  }

  // 2. Per-command checks: in-place sed/perl, tee to a real file.
  const segments = command.split(/\|\||&&|[|;\n]/);
  for (const segment of segments) {
    const words = segment.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const cmd = baseName(stripQuotes(words[0]));
    const args = words.slice(1);

    if (IN_PLACE_EDITORS.has(cmd)) {
      const inPlace = args.find((a) => /^--in-place/.test(a) || /^-[a-zA-Z]*i/.test(a));
      if (inPlace) return `${cmd} ${inPlace} (in-place edit)`;
    }

    if (cmd === 'tee') {
      const files = args.filter((a) => !a.startsWith('-')).map(stripQuotes);
      const bad = files.find((f) => !ALLOWED_TARGET.test(f));
      if (bad) return `tee to "${bad}"`;
    }
  }

  return null;
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(raw);
      if (input.tool_name !== 'Bash') process.exit(0);
      const command = (input.tool_input && input.tool_input.command) || '';
      const violation = findViolation(command);
      if (!violation) process.exit(0);
      process.stderr.write(
        `Blocked by require-read-before-edit hook: ${violation}. ` +
          'File changes must not go through Bash. Read the file, then use the Edit or Write tool instead. ' +
          'Writes to /dev/null and /tmp are allowed.\n',
      );
      process.exit(2);
    } catch {
      process.exit(0); // fail open: a broken hook must never block the session
    }
  });
}

main();
