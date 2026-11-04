// A build step's agents and the plan tasks they work on, for the page: each agent's calls and model, and which of
// the plan's tasks are done, under way and still to do. Rewritten from the eval rounds' status page, behaviour
// unchanged unless a comment says otherwise.

import { readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { contentOf, label, lines, stamp } from './log.ts';
import type { AgentRow, Event, TaskState } from './types.ts';

type TaskRow = { start: number; end: number; time: number; calls: number; failed: string[] };

const TASK = /\bTask (\d+(?:\.\d+)?)\b/g;
const MENTION = /\btasks? (\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?/gi;

// A search that finds nothing exits non-zero. That is an answer, not something that went wrong.
const SEARCHES = new Set(['grep', 'rg', 'find', 'ls', 'test', '[', 'cat', 'head', 'tail', 'sed', 'awk', 'diff', 'which']);

// ── The plan's tasks ──

// The plan a build turn works from: the first .md path in its prompt that holds tasks. The status page matched
// command names instead, which ties the page to one loop's skills.
export function planInPrompt(prompt: string, workdir: string): string | null {
  for (const word of prompt.split(/\s+/)) {
    const path = word.replace(/^[`'"(<]+|[`'")>.,;:]+$/g, '');
    if (!path.endsWith('.md')) continue;
    const full = isAbsolute(path) ? path : join(workdir, path);
    return planTasks(full).length ? full : null;
  }
  return null;
}

// (id, title) per task: headings like "#### Task 2.1 ...", bold lines like "**Task 1. ...**", or the numbered
// list under a STEP-BY-STEP TASKS heading.
export function planTasks(plan: string): [string, string][] {
  let text: string;
  try {
    text = readFileSync(plan, 'utf8');
  } catch {
    return [];
  }
  let found: [string, string][] = [...text.matchAll(/^#{2,5} Task (\d+(?:\.\d+)?)\s*[:.-]?\s*(.*)$/gm)].map((m) => [m[1], m[2]]);
  if (!found.length) found = [...text.matchAll(/^\*\*Task (\d+(?:\.\d+)?)\s*[:.-]?\s*(.*?)\*\*\s*$/gm)].map((m) => [m[1], m[2]]);
  if (!found.length) {
    const section = /^#+ STEP-BY-STEP TASKS\s*$([\s\S]*?)(?=^#{1,2} |(?![\s\S]))/im.exec(text);
    found = section ? [...section[1].matchAll(/^(\d+)\. (.*)$/gm)].map((m) => [m[1], m[2]]) : [];
  }
  return found.map(([i, title]) => [i, title.replace(/[*`]/g, '').trim().slice(0, 72)]);
}

const order = (id: string) => id.split('.').map(Number);

function compare(a: string, b: string): number {
  const x = order(a);
  const y = order(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === undefined) return -1;
    if (y[i] === undefined) return 1;
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

const maxTask = (ids: string[]) => ids.reduce((a, b) => (compare(b, a) > 0 ? b : a));

// ── What a session says about them ──

// The plan task a session last named in its own words or a tool's description: plans number their tasks
// "Task 3" or "Task 2.1". Empty when it never named one.
function currentTask(events: Event[]): string {
  let named = '';
  for (const e of events) {
    if (e.type !== 'assistant' || e.parent_tool_use_id) continue;
    for (const block of contentOf(e)) {
      const text = block?.type === 'text' ? block.text ?? '' : block?.type === 'tool_use' ? block.input?.description ?? '' : '';
      const found = [...String(text || '').matchAll(TASK)];
      if (found.length) named = `Task ${found[found.length - 1][1]}`;
    }
  }
  return named;
}

// A session's own text and the descriptions it gave its tool calls, in order. With toolsOnly, only the
// descriptions: what it is doing, not what it says it will do.
function ownWords(events: Event[], toolsOnly = false): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.type !== 'assistant' || e.parent_tool_use_id) continue;
    for (const block of contentOf(e)) {
      if (block?.type === 'text' && !toolsOnly) out.push(block.text ?? '');
      else if (block?.type === 'tool_use') out.push(block.input?.description || '');
    }
  }
  return out;
}

// (first, last) per task or range named in a text: "task 13" -> (13, 13), "tasks 1-12" -> (1, 12).
function taskRanges(text: string): [string, string][] {
  return [...String(text || '').matchAll(MENTION)].map((m) => [m[1], m[2] || m[1]]);
}

// ── The step's agents ──

// One row per agent in the session's subagents folder that this step's log started.
export function agents(folder: string, stepText: string): AgentRow[] {
  let names: string[];
  try {
    names = readdirSync(folder).filter((n) => n.endsWith('.meta.json')).sort();
  } catch {
    return [];
  }
  const out: AgentRow[] = [];
  for (const name of names) {
    let meta: Record<string, any>;
    try {
      meta = JSON.parse(readFileSync(join(folder, name), 'utf8'));
    } catch {
      continue;
    }
    if (!stepText.includes(meta.toolUseId ?? '-')) continue;
    const events = lines(join(folder, name.replace('.meta.json', '.jsonl')));
    const times = events.map(stamp).filter((t): t is number => !!t);
    const calls: Record<string, number> = {};
    const models: Record<string, number> = {};
    let last = '';
    for (const e of events) {
      if (e.type !== 'assistant') continue;
      const model = (e.message || {}).model ?? '?';
      models[model] = (models[model] || 0) + 1;
      for (const block of contentOf(e)) {
        if (block?.type === 'tool_use') {
          calls[block.name] = (calls[block.name] || 0) + 1;
          last = label(block);
        }
      }
    }
    const top = Object.entries(models).sort((a, b) => b[1] - a[1])[0];
    out.push({
      name: `${meta.agentType ?? '?'} "${meta.description ?? ''}"`,
      done: meta.finished === true,
      start: times.length ? Math.min(...times) : 0,
      end: times.length ? Math.max(...times) : 0,
      calls, last, task: currentTask(events),
      briefed: taskRanges(meta.description ?? ''),
      named: ownWords(events, true).flatMap((text) => taskRanges(text).map(([t]) => t)),
      model: top ? top[0].replace('claude-', '') : '?',
      events
    });
  }
  return out;
}

// ── Where the tasks stand ──

export function taskState(plan: string, window: Event[], found: AgentRow[], running: boolean): TaskState {
  const listed = planTasks(plan);
  const known = listed.map(([i]) => i);
  const between = (first: string, last: string) => known.filter((i) => compare(first, i) <= 0 && compare(i, last) <= 0);
  const done = new Set<string>();
  const doing = new Set<string>();
  const logs = [taskLog(window.filter((e) => e.type === 'assistant' || e.type === 'user'), known)];
  // A finished agent did the tasks it was briefed with. A running one is on the last task it named while working,
  // or on its whole brief until it names one.
  for (const a of found) {
    const briefed = a.briefed.flatMap(([f, l]) => between(f, l));
    logs.push(taskLog(a.events, known, briefed[0] ?? null));
    if (a.done) {
      briefed.forEach((i) => done.add(i));
      continue;
    }
    const own = briefed.length ? a.named.filter((t) => briefed.includes(t)) : a.named.filter((t) => known.includes(t));
    if (own.length) {
      const at = maxTask(own);
      briefed.filter((i) => compare(i, at) < 0).forEach((i) => done.add(i));
      doing.add(at);
    } else {
      briefed.forEach((i) => doing.add(i));
    }
  }
  // With no agent carrying tasks, the session builds them itself, so the one task it names in its own words is
  // the one it is on. With agents, its words are about what they will do.
  const alone = !found.some((a) => a.briefed.length);
  const mine = ownWords(window, !alone).flatMap((text) =>
    taskRanges(text).filter(([t, l]) => known.includes(t) && (t === l || !alone)).map(([t]) => t));
  if (mine.length) {
    const at = maxTask(mine);
    known.filter((i) => compare(i, at) < 0 && !doing.has(i)).forEach((i) => done.add(i));
    (running ? doing : done).add(at);
  }
  for (const i of done) doing.delete(i);
  const merged: TaskState['merged'] = {};
  for (const one of logs) {
    for (const [task, row] of Object.entries(one)) {
      const m = (merged[task] ??= { start: row.start, end: row.end, time: 0, calls: 0, failed: [] });
      m.start = Math.min(m.start, row.start);
      m.end = Math.max(m.end, row.end);
      m.calls += row.calls;
      m.time += row.time;
      m.failed.push(...row.failed);
    }
  }
  return { listed, done, doing, merged };
}

// Per task: when the session first and last worked on it, its calls, and its failed calls. The task is the last
// one the session named: in a tool call's description, or one task alone in its own words.
function taskLog(events: Event[], known: string[], startOn: string | null = null): Record<string, TaskRow> {
  const log: Record<string, TaskRow> = {};
  const owner: Record<string, [string, string, string]> = {};
  let current = startOn;
  let before: number | null = null;
  for (const e of events) {
    const t = stamp(e);
    const content = (e.message || {}).content;
    if (t === null || !Array.isArray(content)) continue;
    // Time counts toward the task that was current while it passed.
    if (before !== null && current !== null && log[current]) log[current].time += t - before;
    before = t;
    for (const block of content) {
      if (block?.type === 'text' && e.type === 'assistant') {
        const single = taskRanges(block.text ?? '').filter(([f, l]) => f === l && known.includes(f)).map(([f]) => f);
        if (single.length) current = single[0];
      } else if (block?.type === 'tool_use') {
        const named = taskRanges(block.input?.description ?? '').map(([f]) => f).filter((n) => known.includes(n));
        if (named.length) current = named[0];
        if (current === null) continue;
        owner[block.id] = [current, label(block), block.input?.command ?? ''];
        const row = (log[current] ??= { start: t, end: t, time: 0, calls: 0, failed: [] });
        row.calls += 1;
        row.end = Math.max(row.end, t);
      } else if (block?.type === 'tool_result' && owner[block.tool_use_id]) {
        const [task, what, command] = owner[block.tool_use_id];
        log[task].end = Math.max(log[task].end, t);
        if (block.is_error && !isSearch(command)) log[task].failed.push(`${what.slice(0, 50)}: ${resultText(block)}`);
      }
    }
  }
  return log;
}

function isSearch(command: string): boolean {
  const parts = (command || '').split(/&&|;|\|\|/);
  const last = parts[parts.length - 1].trim().split(/\s+/).filter(Boolean);
  return last.length > 0 && SEARCHES.has(last[0]);
}

function resultText(block: Event): string {
  let content = block.content;
  if (Array.isArray(content)) content = content.filter((c) => c && typeof c === 'object').map((c) => c.text ?? '').join(' ');
  const rows = String(content ?? '').split('\n').map((r) => r.trim()).filter(Boolean);
  if (!rows.length) return '';
  // A failed shell call reads "Exit code N" then its output; the output's last line is usually the verdict.
  return (rows[0].startsWith('Exit code') && rows.length > 1 ? `${rows[0]}: ${rows[rows.length - 1]}` : rows[0]).slice(0, 120);
}
