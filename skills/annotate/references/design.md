# annotate's page: design rules

The page is `scripts/annotate.html`, styled only with Tailwind's own classes, written in its markup and in the
strings its script puts on what it builds. A class the compiler cannot find gets no style, so write every class
name whole. Building a list from whole names is fine.

- ❌ `"md-h" + level`, or `"bg-" + colour`.
- ✅ `["text-lg font-semibold", "text-base font-semibold"][level]`.

Semantic names (`line`, `sheet`, `lines`, `badge`, `md-diagram-line`) are hooks the script
queries. They carry no style. A state is a data attribute the script sets, styled with Tailwind's variants:
`data-changed`, `data-commented`, `data-selected` on a row, and `data-working` and `data-compare` on the body
(`group/page`). Never style a state with a new class and hand-written CSS.

## Palette

Tailwind's default palette, each colour with one job. Every colour sets its dark pair with `dark:`.

| Job | Light | Dark |
|---|---|---|
| Paper | `bg-white` | `dark:bg-zinc-950` |
| Panel: sidebar, code blocks, banner | `bg-zinc-50` | `dark:bg-zinc-900` |
| Ink: text, the solid button | `text-zinc-900` | `dark:text-zinc-100` |
| Graphite: labels, secondary text | `text-zinc-500` | `dark:text-zinc-400` |
| Faint: line numbers, folders | `text-zinc-400` | `dark:text-zinc-600` |
| Rule: borders | `border-zinc-200` | `dark:border-zinc-800` |
| Hover, and the quiet fill | `bg-zinc-100`, hover `bg-zinc-200` | `dark:bg-zinc-800`, hover `dark:bg-zinc-700` |
| Highlighter: a commented line, a comment count | `bg-yellow-200/60` | `dark:bg-yellow-400/20` |
| Note: a comment card, a commented diagram | `bg-yellow-50`, edge `border-yellow-500` | `dark:bg-yellow-400/10`, edge `dark:border-yellow-400` |
| Added: changed lines | `bg-emerald-50`, edge `border-emerald-600` | `dark:bg-emerald-950`, edge `dark:border-emerald-400` |
| Removed, and danger | `bg-red-50`, `border-red-600`, `text-red-600` | `dark:bg-red-950`, `dark:border-red-400`, `dark:text-red-400` |

The highlighter is the only accent, and it means a comment. Green and red mean a change, nothing else. No orange,
no blue for links: a link is ink, underlined. Syntax colours in code blocks (violet, cyan, blue, fuchsia) avoid
green, red, orange and yellow, so a token never reads as a change or a comment.

## Scales

Standard values only (`skills/annotate/AGENTS.md`). An arbitrary value needs a comment saying why no standard
class fits. When unsure, take the smaller standard step.

- Type: `text-xs` (labels, numbers, code), `text-sm` (everything else), `text-lg` (the page title and a document's
  `#`), `text-base` (a document's `##`). Document rows are `text-sm/6`, so every row is 24px.
- Weight: `font-normal` and `font-semibold`. Never bold.
- Space: gap and padding 1, 2, 3, 4, 6, 8. Radius: `rounded-lg` for controls, messages and the input,
  `rounded` for rows and inline code, `rounded-full` for pills and the switch.
- Fonts: Tailwind's system stacks. No web font: the page makes no network call.

## Buttons

Three kinds, all `h-8 rounded-lg text-sm`, a 2px focus ring, and a disabled look. Pick by what the action does.

- **Solid**, for the one action that matters: Send, under the input. Never two on the page.
  `h-8 cursor-pointer rounded-lg bg-zinc-900 px-3 text-sm font-semibold whitespace-nowrap text-white enabled:hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100`
- **Quiet**, for a secondary action: Save, Copy for agent.
  `h-8 cursor-pointer rounded-lg bg-zinc-100 px-3 text-sm whitespace-nowrap text-zinc-900 enabled:hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:enabled:hover:bg-zinc-700 dark:focus-visible:outline-zinc-100`
- **Text**, for the way out: Cancel, and Delete, which turns red on hover (`hover:text-red-600
  dark:hover:text-red-400` in place of the ink hover).
  `h-8 cursor-pointer rounded-lg px-2 text-sm whitespace-nowrap text-zinc-500 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100`

## Two panes: the document, and the panel

One panel on the left, `w-1/4 min-w-80`, holds everything but the document, top to bottom; the document fills the
rest. On the left, the document's scroll bar runs down the window's edge, not the seam between the two. Never a third
column, and nothing beside the document's lines.

- A row (`ROW` in the script) is gutter (`w-5`), number (`min-w-8`), text. A block between rows (removed lines,
  "Show source") starts its text at the same place with two spacers. Never a measured padding.
- Changed: `bg-emerald-50` and a `border-l-4` emerald edge. Removed: a red block with the old lines struck
  through. Selected: `bg-zinc-100` and an ink edge, over a change. Commented: the highlighter on the text only.
- **Files**, at most a quarter of the panel's height: one row per file, its Reviewed tick, its name above its
  folder, and a highlighter count of the comments waiting on it.
- **The conversation** fills the middle and scrolls to its end, so the newest message and any question sit just
  above the input. A comment waiting to be sent wears the note colour with a highlighter edge. A sent comment is
  quiet graphite with no border. The agent's answer is paper with a rule border; a question it asks carries an ink
  edge and opens the input on its lines when clicked.
- **The input** sits at the bottom: what it writes to (the selected lines as a highlighter chip, or the note for
  the agent and the whole document as two pills), the field, then Send ⌘↵ (solid), Save and Copy (quiet), and
  Delete (text, red on hover) on the right while it changes a saved comment.

## The hand-written CSS

`scripts/styles.css` holds only what classes cannot say: tables built of rows (subgrid), a diagram's fit to
its row and its zoom, and the flash keyframes. Add to it only when no class can do the job. A rule there beats
every class, because it sits outside Tailwind's layers.

## Rebuild

`scripts/annotate.css` is generated and ships with the skill; the helper inlines it into the page. Never edit it
by hand. After changing `scripts/styles.css` or a class in `scripts/annotate.html`, run `npm run build` at the
skillz root, and commit the CSS with the change. `npm run check` fails if the committed CSS is stale. A project's
copy has no build, so change the page only in skillz.
