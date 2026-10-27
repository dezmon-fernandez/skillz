---
name: annotate
description: >-
  Open a local page where the developer comments line by line on markdown you are working on together (a plan, a
  doc, a skill, notes, a draft) or on the outputs of a skill-creator eval iteration, then act on the comments when
  they press Send. Use when the developer says "let me comment on it", "open it in the annotator", "I want to mark
  this up", "let me leave comments on the plan", "go through the eval outputs line by line", or "label the outputs".
  Not for review threads on a hosted merge or pull request.
---

# annotate: line comments on markdown, handed back in one Send

The developer clicks a line, or drags across several, and writes a comment. Send hands you every comment at once.
The page has no login, listens on 127.0.0.1 only, and makes no other network calls.

The helper needs Node 22.18 or later, which runs TypeScript directly. If `node --version` is older, say so and stop.

## Open the page

From the repo root, run the helper as a background command, on files or on one eval iteration folder:

```bash
node --no-warnings .claude/skills/annotate/scripts/annotate.ts <file.md> [more.md ...]
node --no-warnings .claude/skills/annotate/scripts/annotate.ts <iteration-folder>
```

It prints the page's address and serves until the developer presses Send. Then it prints the comments and exits,
and that exit is what wakes you. Give the developer the address and end your turn. Don't poll, and don't start on
the work the comments are for. Your own guess at their comments is not their comments.

If your harness has no background commands, run the helper in the foreground with no timeout. The developer reads
the address in its live output, and the call returns with the comments when they press Send. If Send can't reach
you, ask the developer to press **Copy for agent** and paste the comments instead.

The same files always open on the same address, so unsent comments survive a restart.

## When the comments arrive

The output gives the developer's instruction, which may be empty, then each comment with its document, its line
numbers and the start of the text it was written on. The line numbers are from the text as it was at Send.

If there are no comments and no instruction, or the developer calls it a test, do nothing.

### Files you are working on together

Each comment is the developer's request about the lines it marks. Work through all of them:

- Do what it asks. "Cut", "drop" or "delete" means delete the text, not soften it.
  - ❌ `Cut this` on a paragraph, answered with a shorter paragraph.
  - ✅ `Cut this` on a paragraph, answered with the paragraph gone.
- A question gets an answer, not an edit, unless the answer shows the text is wrong.
- A comment can reach beyond its lines ("same for the other steps"). Follow it there.
- An overall comment applies to the whole document.

Then reply with one line per comment: what you did, why you didn't, or your question back. Reopen the page with
the same command. It tints the lines you changed since the Send and clears the comments on every file you edited.
The developer's open tab reloads by itself.

Stop the helper when the developer says they're done.

### Eval iteration folders

The folder is the layout skill-creator writes, `<eval>/<version>/outputs/*.md`. skill-creator runs and grades the
evals; this page is only where the developer comments on what they produced. When an eval has two versions, such as
`new_skill` and `old_skill`, the page can show them side by side. Each Send also writes `<folder>/feedback.json`,
which keeps the comments as labels.

Do what the instruction asks, such as revising the skill from the comments. With no instruction, the comments are
labels: say how many arrived and change nothing. Reopen the page so the developer can keep going. The outputs
don't change, so their comments stay.
