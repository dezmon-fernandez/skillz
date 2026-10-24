// The indexes of the lines in `after` that are new or changed since `before`, from a longest common subsequence
// of whole lines. The table is rows × columns, which is fine for documents of a few thousand lines.
export function changedLines(before: string[], after: string[]): number[] {
  const common = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
  for (let row = before.length - 1; row >= 0; row -= 1) {
    for (let column = after.length - 1; column >= 0; column -= 1) {
      common[row][column] = before[row] === after[column]
        ? common[row + 1][column + 1] + 1
        : Math.max(common[row + 1][column], common[row][column + 1]);
    }
  }
  const changed: number[] = [];
  let row = 0;
  let column = 0;
  while (column < after.length) {
    if (row < before.length && before[row] === after[column]) {
      row += 1;
      column += 1;
    } else if (row < before.length && common[row + 1][column] >= common[row][column + 1]) {
      row += 1;
    } else {
      changed.push(column);
      column += 1;
    }
  }
  return changed;
}
