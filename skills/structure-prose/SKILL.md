---
name: structure-prose
description: >-
  Rebuild the layout of a skill, agent, or other instruction file so it scans: each part
  under a bold label, one rule per line, a blank line between groups. Layout only: every
  rule and its words stay. Use when asked to "break up this wall of text", "make this
  easier to read", "structure this file", or "format it like piv". The operator runs it by
  hand, on one file.
argument-hint: "[path to the file to restructure]"
disable-model-invocation: true
---

# structure-prose: the same rules, laid out to scan

The output is the file at `$ARGUMENTS`, rewritten in place: the same rules, in a layout a
reader can scan and an editor can extend in the same style. The developer reads it side by
side with the original before it is kept. A rule lost in the move is a rule no session
follows, so step 3 matters more than the layout.

This skill changes layout only. To cut or reword, use `review-prose`.

## Step 1: Find the walls

Read the whole file. A wall is:

- a paragraph that holds more than one rule
- a bullet longer than two lines
- a numbered item that holds a paragraph
- an example far from the rule it shows

Leave alone what already scans: short bullets, templates, code, tables.

## Step 2: Rebuild each wall in this shape

**The shape**

- A bold label for each part, under the file's own `##` headings
- Number the labels when the order matters, or when another line points at a number
- One rule per bullet. When unsure whether a sentence holds one rule or two, split it
- Start each bullet with the action, or with the thing it is about
- A short lead line before a list that needs one: `Before you show it:`, `Then:`
- A branch becomes bold-led bullets: `**Free:** send it now`
- A blank line between groups
- A ❌/✅ pair sits right after the rule it shows
- A template or code block stays word for word, moved to the left margin under its label

```
## Step <n>: <the step>

<one line on what the step is for, when it needs one>

**1. <the part>**

- <one rule>
- <one rule>: <its reason, only where a reader would assume the opposite>

**2. <the part, with branches>**

<lead line>:

- **<case>:** <what to do>
- **<case>:** <what to do>
```

❌ `3. **Settle what is answered.** If the code or the request answers it, take that answer and record its source. Never ask what you can verify. A design that differs from a settled line goes to the developer.`

✅ The same four rules as four bullets under `**3. Settle what is already answered**`: take
the answer the code or the request gives; record where it came from; never ask what you can
check yourself; take a design that differs from a settled line to the developer.

**Keep**

- Every rule, and every word that carries one. "too", "only", "never" and "each" change a
  rule
- Every name another file points at: headings, field names, labels, numbers. Grep the repo
  for each one before you rename or renumber it
- The file's own terms. Explain a coined term once, in plain words, where it first appears.
  Do not rename it

## Step 3: Check that no rule fell out

- List each word whose count fell: `git diff --word-diff=porcelain <file>` marks every
  removed word with `-`
- Trace each one to a rephrase. A word you cannot trace is a lost rule: put it back
- Read every ❌/✅ pair and template against the original, character for character

## Step 4: Show it side by side, then stop

- Put the original under `<folder>/<name>/1-before/outputs/` and the result under
  `<folder>/<name>/2-after/outputs/`, then open the folder with the `annotate` skill and
  tell the developer to turn on **Side by side**
- Without `annotate`, print each changed part, before and after
- The file is kept only on the developer's word. A comment is a request about its lines:
  apply it, check it as in step 3, and show it again

## Note

- Step 3 needs `git`. Without it, compare the two texts' word counts another way, and say
  how you did it
- Step 4 uses the `annotate` skill for the side-by-side view. When it is missing, say so,
  and print the parts instead
