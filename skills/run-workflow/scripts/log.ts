// Reads the logs a turn leaves: the `claude -p --output-format stream-json --verbose` log in the run's steps/, and
// the session transcript Claude Code keeps under ~/.claude/projects/. A line that does not parse is skipped, never
// thrown, so a half-written log never blanks the page.

import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { seams } from './launch.ts';
import type { Event } from './types.ts';

type Parsed = { key: string; size: number; out: Event[] };

// Parsed logs, the least recently read first. The page lives across runs, so once the files held pass
// seams.cacheBytes the least recently read is dropped, and parsed again if it is read again.
const parsed = new Map<string, Parsed>();
let held = 0;

// A log's events, parsed once per change of the file.
export function lines(path: string): Event[] {
  let key: string;
  let size: number;
  let text: string;
  try {
    const st = statSync(path);
    key = `${st.mtimeMs}:${st.size}`;
    size = st.size;
    const cached = parsed.get(path);
    if (cached && cached.key === key) {
      keep(path, cached);
      return cached.out;
    }
    text = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  const out: Event[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
    // A system event can carry its message as plain text (permission_denied does), and every reader here
    // expects an object, so the text moves to its own key.
    if (typeof event.message === 'string') {
      event.message_text = event.message;
      delete event.message;
    }
    out.push(event);
  }
  keep(path, { key, size, out });
  return out;
}

// Holds the file as the most recently read, then drops the least recently read until the rest fit. The file just
// read is always kept.
function keep(path: string, entry: Parsed): void {
  const old = parsed.get(path);
  if (old) {
    held -= old.size;
    parsed.delete(path);
  }
  parsed.set(path, entry);
  held += entry.size;
  for (const [other, e] of parsed) {
    if (held <= seams.cacheBytes || other === path) break;
    parsed.delete(other);
    held -= e.size;
  }
}

export function initOf(events: Event[]): Event {
  return events.find((e) => e.type === 'system' && e.subtype === 'init') ?? {};
}

export function resultOf(events: Event[]): Event | null {
  for (let i = events.length - 1; i >= 0; i--) if (events[i].type === 'result') return events[i];
  return null;
}

export function replyOf(events: Event[]): string {
  const result = resultOf(events);
  return result && typeof result.result === 'string' ? result.result : '';
}

// An event's time in seconds, or null when it has none.
export function stamp(event: Event): number | null {
  const value = event.timestamp;
  if (!value || typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms / 1000;
}

// The content blocks of an event's message, or none.
export function contentOf(event: Event): any[] {
  const content = (event.message || {}).content;
  return Array.isArray(content) ? content : [];
}

// A tool call in a few words: `Edit page.ts`, `Bash Run the tests`, `builder "tasks 1-3"`.
export function label(block: Event): string {
  const input = block.input || {};
  const name = block.name ?? '?';
  let text: string;
  if (name === 'Agent') text = `${input.subagent_type ?? 'agent'} "${input.description ?? ''}"`;
  else if (input.file_path) text = `${name} ${basename(String(input.file_path))}`;
  else text = `${name} ${input.description || input.command || input.pattern || input.url || ''}`;
  return text.replace(/\s+/g, ' ').trim().slice(0, 80);
}

// The folder of a session's agents' transcripts, beside the session's own.
export function subagentsOf(transcript: string): string {
  return join(transcript.replace(/\.jsonl$/, ''), 'subagents');
}

export function transcriptPath(workdir: string, session: string): string {
  const projects = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects');
  return join(projects, workdir.replace(/[^A-Za-z0-9]/g, '-'), `${session}.jsonl`);
}

// The last message line, not the last line: the CLI writes bookkeeping lines (last-prompt, cost-state) after the
// turn's stop_hook_summary. Reading the last line misses a turn that is over, and a hung step is never freed.
export function turnOver(transcript: Event[]): boolean {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const e = transcript[i];
    if (e.type === 'user' || e.type === 'assistant' || e.type === 'system') return e.type === 'system' && e.subtype === 'stop_hook_summary';
  }
  return false;
}
