// What start and resume print, how they spawn, and the driver's clock and intervals, behind one object so the
// tests can replace them: ES module exports cannot be swapped from outside. `patience` is how long the driver waits
// on an answer before it exits and leaves the wait to resume; a real run waits for as long as it takes.

import { ensurePage, spawnDetached } from './launch.ts';

export const seams = {
  print: (line: string): void => void console.log(line),
  spawnDetached: (script: string, args: string[], log: string): number => spawnDetached(script, args, log),
  ensurePage: (): Promise<string> => ensurePage(seams.spawnDetached),
  now: (): number => Date.now(),
  tickMs: 5000,
  pollMs: 2000,
  patience: Infinity
};
