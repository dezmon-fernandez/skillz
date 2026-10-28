// What changed between two versions of a document, from a longest common subsequence of whole lines: the indexes of
// the lines in `after` that are new or changed, and each run of lines `before` had that `after` has lost, placed at
// the index in `after` it used to sit before (`after.length` for the end). The table is rows × columns, which is fine
// for documents of a few thousand lines.
export interface Removed {
  at: number;
  lines: string[];
}

export function diffLines(before: string[], after: string[]): { changed: number[]; removed: Removed[] } {
  const common = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
  for (let row = before.length - 1; row >= 0; row -= 1) {
    for (let column = after.length - 1; column >= 0; column -= 1) {
      common[row][column] = before[row] === after[column]
        ? common[row + 1][column + 1] + 1
        : Math.max(common[row + 1][column], common[row][column + 1]);
    }
  }
  const changed: number[] = [];
  const removed: Removed[] = [];
  let pending: string[] = [];
  const flush = (at: number) => {
    if (pending.length) removed.push({ at, lines: pending });
    pending = [];
  };
  let row = 0;
  let column = 0;
  while (column < after.length) {
    if (row < before.length && before[row] === after[column]) {
      flush(column);
      row += 1;
      column += 1;
    } else if (row < before.length && common[row + 1][column] >= common[row][column + 1]) {
      pending.push(before[row]);
      row += 1;
    } else {
      flush(column);
      changed.push(column);
      column += 1;
    }
  }
  pending.push(...before.slice(row));
  flush(after.length);
  return { changed, removed };
}

export function changedLines(before: string[], after: string[]): number[] {
  return diffLines(before, after).changed;
}
