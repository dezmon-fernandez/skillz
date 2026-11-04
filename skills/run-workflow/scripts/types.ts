// The types two or more of the scripts use. A type only one script uses sits at the top of that script.

// One parsed line of a step's log or a session transcript. Its shape is the CLI's, so the readers check each field.
export type Event = Record<string, any>;

// How a run's stops are answered: from the config's list, or by the developer on the page.
export type Mode = 'speed' | 'slot-in';

// Who sent a turn or an answer.
export type By = 'config' | 'developer';

// ── The config: what the project's config file holds ──

export interface Config {
  name: string;
  workdir: string;
  runs: string;
  steps: StepConfig[];
  envFile?: string;
  path?: string[];
  env?: Record<string, string>;
  ports?: number[];
  watchdogWait?: number;
  deny?: string[];
  settings?: Record<string, unknown>;
  note?: string;
  model?: string;
  permissionMode?: string;
  watcher?: AgentConfig;
  reporter?: AgentConfig;
}

export interface StepConfig {
  id: string;
  label: string;
  prompt: string;
  session: 'new' | 'continue';
  effort?: Record<string, string>;
  done?: { file?: string; says?: string };
  answers?: string[];
  answerIfAsks?: boolean;
}

export interface AgentConfig {
  model: string;
  effort: string;
}

// ── The run: run.json, answers/ and decisions.jsonl ──

export interface Run {
  id: string;
  name: string;
  config: string;
  workdir: string;
  base: string;
  started: string;
  state: 'running' | 'waiting' | 'done' | 'failed' | 'ended';
  reason: string;
  driverPid: number | null;
  steps: Step[];
  report: 'none' | 'writing' | 'written' | 'failed';
}

export interface Step {
  id: string;
  label: string;
  state: 'pending' | 'running' | 'waiting' | 'done' | 'failed';
  reason: string;
  session: string | null;
  file: string | null;
  turns: Turn[];
}

export interface Turn {
  n: number;
  prompt: string;
  by: By;
  log: string;
  started: string;
  ended: string | null;
  seconds: number | null;
  exit: number | null;
  sessionCost: number | null;
  cost: number | null;
  watched: 'no' | 'watching' | 'noted' | 'failed';
  retryOf?: number;             // set on a Retry: the turn it resends. A retry uses none of the config's answers
  pid?: number;                 // the turn's process while it runs, so a resumed driver can wait for it
}

export interface Answer {
  kind: 'reply' | 'go-on' | 'retry' | 'end';
  text: string;
  at: string;
}

export interface Decision {
  at: string;
  step: string;
  turn: number;
  kind: 'answered' | 'decided-alone';
  questions: [string, string][];
  answer: string;
  by: By;
  evidence: string;
}

// What the driver does next. `ended`: the step's last turn ended while no driver watched it (R17), so it is judged
// as if it had just ended. `running`: that turn's process, left by a stopped driver, is still working; the driver
// waits for it.
export interface Action {
  kind: 'send' | 'ended' | 'running' | 'wait' | 'report' | 'stop';
  stepIndex: number | null;
  prompt: string;
  by: By;
  retryOf?: number;
}

// ── What the readers find in a step's logs and the workdir ──

// `briefed`, `named` and `events` are the working fields that taskState() reads.
export interface AgentRow {
  name: string;
  done: boolean;
  start: number;
  end: number;
  calls: Record<string, number>;
  last: string;
  task: string;
  model: string;
  briefed: [string, string][];
  named: string[];
  events: Event[];
}

export interface TaskState {
  listed: [string, string][];
  done: Set<string>;
  doing: Set<string>;
  merged: Record<string, { start: number; end: number; time: number; calls: number; failed: string[] }>;
}

export interface Alert { kind: 'denied' | 'blocked' | 'failed'; step: string; who: string; text: string }
export type FileRow = [status: string, path: string, added: number, removed: number];
export type TestFile = [path: string, tests: [name: string, doc: string][]];

// ── What the page shows of one run: view.ts builds it, render.ts draws it ──

export interface RunView {
  run: Run | null;
  dir: string;
  mode: Mode;
  driverAlive: boolean;
  steps: StepView[];
  files: FileRow[];
  tests: TestFile[];
  report: string | null;
  seconds: number;
  cost: number;
  problems: string[];
}

export interface StepView {
  step: Step;
  turns: { turn: Turn; reply: string; questions: [string, string][]; alerts: Alert[]; agents: AgentRow[]; now: string }[];
  tasks: TaskState | null;
  plan: string;
  decisions: Decision[];
  notes: [number, string][];
  events: string[];
  problems: string[];
  seconds: number;              // its turns' time, a turn still running counted up to now
}
