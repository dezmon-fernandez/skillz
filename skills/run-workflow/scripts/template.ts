// Fills the page's HTML files. The HTML lives beside this file, never in the TypeScript: page.html is the page
// around the live part, and parts.html holds every piece the page is drawn from, one per `<!-- part: <name> -->`
// line.
//
//   {{key}}                the value as text, escaped
//   {{{key}}}              the value as it is: HTML another part made
//   {{#key}}...{{/key}}    what is between, when the value is truthy
//   {{^key}}...{{/key}}    what is between, when it is not
//
// A key the part names but the values lack throws, so a misspelt key fails the page's tests rather than drawing
// nothing. In parts.html each line of a part is trimmed and the lines are joined with nothing, so a part can be laid
// out on several lines without adding space to the page. Break a line only between tags or placeholders: a break
// inside running text loses its space.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Values = Record<string, string | number | boolean | null>;

const TOKEN = /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}|\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g;

const read = (name: string) => readFileSync(join(import.meta.dirname, name), 'utf8');
const PAGE = read('page.html').replace(/\n$/, '');
const CSS = read('page.css');
const PARTS = new Map<string, string>();
for (const piece of read('parts.html').split(/^<!-- part: /m).slice(1)) {
  const [head, ...rows] = piece.split('\n');
  // The name is the marker's first word; anything after it, up to -->, is a note for the reader.
  PARTS.set(/^[\w-]+/.exec(head)![0], rows.map((r) => r.trim()).join(''));
}

export const esc = (text: unknown) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A part of parts.html, filled.
export function part(name: string, values: Values = {}): string {
  const text = PARTS.get(name);
  if (text === undefined) throw new Error(`parts.html has no part ${name}`);
  return fill(text, values, name);
}

// page.html with the stylesheet in, filled.
export function page(values: Values): string {
  return fill(PAGE, { ...values, css: CSS }, 'page.html');
}

// One pass, so a value that holds braces is never read as a placeholder.
function fill(text: string, values: Values, where: string): string {
  const value = (key: string) => {
    if (values[key] === undefined) throw new Error(`${where} needs a value for ${key}`);
    return values[key];
  };
  return text.replace(TOKEN, (_, sign, section, inner, raw, plain) => {
    if (section) return !!value(section) === (sign === '#') ? fill(inner, values, where) : '';
    if (raw) return String(value(raw));
    return esc(value(plain));
  });
}
