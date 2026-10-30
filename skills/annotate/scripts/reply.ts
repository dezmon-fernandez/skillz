// The agent's reply to a Send, written in the shape of the Send's own text: a `## <document>` heading, then one item
// per comment, `- Lines 25-26: Done. <what it did>`, `- Line 116: Question. <what it asks>`, `- Overall: Not done.
// <why>`. The page sets each item beside the comment it answers. Any other line is a note to the developer.
export type ReplyStatus = 'done' | 'not done' | 'question';

export interface ReplyItem {
  document: string;
  // 1-based, as the Send's text numbers lines. Null for the document's overall comment.
  start: number | null;
  end: number | null;
  status: ReplyStatus | null;
  text: string;
}

export interface Reply {
  notes: string[];
  items: ReplyItem[];
}

const HEADING = /^##\s+(.+?)(?:\s+\[reviewed\])?\s*$/;
// The Send's text puts the commented line's opening words in ("...") after the label; a reply that copies it still reads.
const ITEM = /^\s*[-*]\s+(?:lines?\s+(\d+)(?:\s*-\s*(\d+))?|(overall))(?:\s+\(".*?"\))?\s*:\s*(.*)$/i;
// The status word needs its stop, so "Done with the intro" is text, not a status.
const STATUS = /^(not done|done|question)(?:\s*[.:]|\s+[—–-])\s*/i;

export function parseReply(text: string): Reply {
  const reply: Reply = { notes: [], items: [] };
  let document: string | null = null;
  let last: ReplyItem | null = null;
  for (const line of text.split('\n')) {
    const heading = line.match(HEADING);
    if (heading) {
      document = heading[1];
      last = null;
      continue;
    }
    const item = document === null ? null : line.match(ITEM);
    if (item) {
      const [, first, second, overall, rest] = item;
      const status = rest.match(STATUS);
      last = {
        document: document!,
        start: overall ? null : Number(first),
        end: overall ? null : Number(second ?? first),
        status: status ? (status[1].toLowerCase() as ReplyStatus) : null,
        text: rest.slice(status ? status[0].length : 0).trim()
      };
      reply.items.push(last);
    } else if (!line.trim()) {
      last = null;
    } else if (last && /^\s/.test(line)) {
      last.text += ' ' + line.trim();
    } else {
      reply.notes.push(line.trim());
      last = null;
    }
  }
  return reply;
}
