// What a step's reply asks the developer, and what it says it decided alone. The driver logs both in
// decisions.jsonl; the page shows them under the turn.

const NUMBERED = /^\s{0,3}(\d+)[.)]\s+(.*)/;
const ITEM = /^(\s*)([-*•]|\d+[.)])\s+(.*)/;

// A reply's own list of calls it made without asking: "## Decisions I made", "**Changed:**",
// "- **Deviations from the plan:**".
const DECIDED = new RegExp(
  String.raw`^(\s*)(?:#{1,6}\s+|[-*•]\s+|\d+[.)]\s+)?\*{0,2}(decisions? (?:i|it|we) (?:made|took)|` +
    String.raw`decided on (?:my|its) own|i decided|judgment calls?|changed|deviations?(?: from the plan)?)` +
    String.raw`\*{0,2}\s*(?::\s*\*{0,2}\s*(.*)|$)`,
  'i'
);

const plain = (text: string) => text.replace(/\*\*|__|`/g, '').trim();
const expand = (text: string) => text.replace(/\t/g, '  ');
const lstripBullets = (text: string) => text.replace(/^[-*• ]+/, '');

// (question, its recommendation) per question the reply asks.
export function questions(reply: string): [string, string][] {
  const rows = reply.split(/\r?\n/);
  const out: [string, string][] = [];
  rows.forEach((row, i) => {
    const m = NUMBERED.exec(row);
    if (!m) return;
    let rec = '';
    for (const next of rows.slice(i + 1, i + 20)) {
      if (NUMBERED.test(next)) break;
      if (/\brecommend/i.test(next)) {
        rec = plain(lstripBullets(next.trim()));
        break;
      }
    }
    // An item that opens with a bold lead is asked by that lead; the rest is its reasoning. The status page kept
    // the whole item, which buried the question on the page and in the decisions log.
    const bold = /^\*\*(.+?)\*\*/.exec(m[2].trim());
    const q = plain(m[2]);
    if (q.includes('?') || rec) out.push([bold ? plain(bold[1]) : q, rec]);
  });
  if (out.length) return out;
  return rows
    .filter((r) => r.trim().endsWith('?') && !r.trimStart().startsWith('#'))
    .slice(0, 8)
    .map((r) => [plain(lstripBullets(r.trim())), '']);
}

// (what it decided, why) per item under a heading or lead the DECIDED pattern finds.
export function decided(reply: string): [string, string][] {
  const rows = reply.split(/\r?\n/);
  const out: [string, string][] = [];
  rows.forEach((row, i) => {
    const m = DECIDED.exec(row);
    if (!m) return;
    const inList = /^\s*([-*•]|\d+[.)])\s/.test(row);
    const base = expand(m[1]).length;
    let items: string[][] = [];
    let indent: number | null = null;
    for (const next of rows.slice(i + 1)) {
      if (!next.trim()) continue;
      if (/^\s*#{1,6}\s/.test(next)) break;
      const wide = expand(next);
      const depth = wide.length - wide.trimStart().length;
      const listed = ITEM.exec(next);
      if (listed && !(inList && depth <= base)) {
        indent = indent ?? depth;
        if (depth < indent) break;
        if (depth === indent) items.push([listed[3]]);
        else if (items.length) items[items.length - 1].push(listed[3]);
      } else if (items.length && depth > (indent ?? 0)) {
        items[items.length - 1].push(next.trim());
      } else {
        break;
      }
    }
    const rest = plain(m[3] || '');
    if (!items.length && rest && rest.toLowerCase().replace(/\.+$/, '') !== 'none') items = [[rest]];
    for (const words of items) out.push(splitItem(words.join(' ')));
  });
  return out;
}

function splitItem(text: string): [string, string] {
  const bold = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text.trim());
  if (bold) return [plain(bold[1]).replace(/:+$/, ''), plain(bold[2])];
  const first = /^(.+?[.!?])\s+(.*)$/.exec(plain(text));
  return first ? [first[1], first[2]] : [plain(text), ''];
}
