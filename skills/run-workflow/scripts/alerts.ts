// What the run's rules stopped in one step's log: a denied call or a hook that blocked one. The log carries the
// agents' calls too, marked with the call that started them. The status page's ssh "prod" kind is left out: it
// named one project's production host.

import { contentOf, label } from './log.ts';
import type { Alert, Event } from './types.ts';

export function alertsIn(events: Event[], step: string): Alert[] {
  const uses: Record<string, Event> = {};
  const out: Alert[] = [];
  for (const e of events) {
    const who = e.parent_tool_use_id ? 'an agent' : 'the session';
    // A denied shell command arrives as its own system event, with no tool result after it.
    if (e.type === 'system' && e.subtype === 'permission_denied') {
      const use = uses[e.tool_use_id ?? ''];
      out.push({ kind: 'denied', step, who, text: use ? label(use) : String(e.message_text ?? '').slice(0, 160) });
      continue;
    }
    for (const b of contentOf(e)) {
      if (e.type === 'assistant' && b?.type === 'tool_use') {
        uses[b.id ?? ''] = b;
      } else if (e.type === 'user' && b?.type === 'tool_result' && b.is_error) {
        const text = fullText(b);
        const use = uses[b.tool_use_id ?? ''];
        if (text.includes('denied by your permission settings') || (text.includes('Permission to use') && text.includes('denied'))) {
          out.push({ kind: 'denied', step, who, text: use ? label(use) : text.slice(0, 160) });
        } else if (text.includes('Blocked')) {
          const reason = /Blocked[^\n]*/.exec(text);
          out.push({ kind: 'blocked', step, who, text: `${use ? label(use) : ''}. ${reason ? reason[0] : ''}`.slice(0, 260) });
        }
      }
    }
  }
  return out;
}

function fullText(block: Event): string {
  const content = block.content;
  if (Array.isArray(content)) return content.filter((c) => c && typeof c === 'object').map((c) => c.text ?? '').join('\n');
  return String(content ?? '');
}
