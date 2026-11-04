// Enough markdown for a session's reply, a watcher's notes and the report: code fences, headings, list items,
// bold and code. The HTML each one becomes is a part in parts.html.

import { esc, part } from './template.ts';

const ITEM = /^(\s*)([-*•]|\d+[.)])\s+(.*)/;

const inline = (text: string) => esc(text)
  .replace(/`([^`]+)`/g, (_, code: string) => part('md-code', { html: code }))
  .replace(/\*\*(.+?)\*\*/g, (_, bold: string) => part('md-bold', { html: bold }));

export function md(text: string): string {
  const out: string[] = [];
  const para: string[] = [];
  let item: [number, string, string[]] | null = null;
  let code: string[] | null = null;
  const flush = () => {
    if (item) {
      const [depth, mark, words] = item;
      out.push(part('md-item', { depth, mark, html: inline(words.join(' ')) }));
      item = null;
    }
    if (para.length) {
      out.push(part('md-paragraph', { html: inline(para.join(' ')) }));
      para.length = 0;
    }
  };
  for (const row of text.split(/\r?\n/)) {
    if (row.trim().startsWith('```')) {
      if (code === null) {
        flush();
        code = [];
      } else {
        out.push(part('md-code-block', { code: code.join('\n') }));
        code = null;
      }
      continue;
    }
    if (code !== null) {
      code.push(row);
      continue;
    }
    if (!row.trim()) {
      flush();
      continue;
    }
    const heading = /^#{1,6}\s+(.*)/.exec(row);
    const listed = ITEM.exec(row);
    if (heading) {
      flush();
      out.push(part('md-heading', { html: inline(heading[1]) }));
    } else if (listed) {
      flush();
      const mark = ['-', '*', '•'].includes(listed[2]) ? '•' : listed[2];
      item = [Math.floor(listed[1].replace(/\t/g, '  ').length / 2), mark, [listed[3]]];
    } else if (item && row.startsWith(' ')) {
      (item as [number, string, string[]])[2].push(row.trim());
    } else {
      if (item) flush();
      para.push(row.trim());
    }
  }
  if (code !== null) out.push(part('md-code-block', { code: (code as string[]).join('\n') }));
  flush();
  return out.join('\n');
}
