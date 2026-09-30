---
name: review-prose
description: >-
  Rewrite the wording of a skill, agent, or document so it is short, plain, and clear,
  without changing what it asks of the reader. Use when asked to "review the prose",
  "tighten this file", or "slim this down". The operator runs it by hand, on one file.
argument-hint: "[path to the file to rewrite]"
disable-model-invocation: true
---

# review-prose: same instructions, fewer and plainer words

## File: $ARGUMENTS

A reader who follows the new version must do exactly what a reader of the old version did.
Change the words. Never change the ask.

If `$ARGUMENTS` is empty or unreadable, say so and stop. Do not guess which file.

## Before you edit

1. **State the file's goal** in one or two sentences: what it does, who uses its output, and
   what goes wrong if the output is wrong. Every choice below serves that goal. If the file
   has no opening that says it, add one.
2. **Find the frozen names.** A heading, field label, output shape, path, or quoted phrase
   that another file reads is frozen. Search the repo for each one before you touch it.
   Copy frozen names character for character.

## Rules

- **Keep every rule, check, step, and example.** Cut words, not content. Never add a rule.
  When unsure, keep the sentence.
- **One idea per sentence.** Split the long ones.
- **Put lists in bullets.** Rules, checks, steps, and inputs are lists.
- **Use the everyday word.** Keep a technical term only if it is a frozen name or has no
  plain equivalent.
- **Cut a sentence only if another sentence already says it.** Filler, warm-ups, and
  restating go. A sentence that is the only place a rule appears stays.
- **Keep the reason behind a rule only where a reader would assume the opposite.**
- **Keep "which way to err" sentences.** They decide the close calls.
- **Leave clear wording alone.** A change must make a sentence shorter or clearer. Anything
  else is churn, and it makes the diff harder to trust.
- **Never fix a flaw silently.** If you find a contradiction or a gap, keep the behavior
  and report it.

❌ `It is read-only by design, so it cannot quietly fix what it finds. Its findings arrive
as a report rather than as edits you have to go looking for.`
✅ `It is read-only, so it cannot quietly fix what it finds. You get a report, not edits to hunt for.`

❌ `Start the agent with the report path, the plan path, the changed file list, and the diffstat.`
✅ `Start the agent. Give it:` followed by one bullet per input.

❌ Renaming `Final verification` to `Final check`. Same meaning, no gain.
✅ Leave it.

## After you edit

Edit the file in place. If it is not tracked by git, copy it aside first. Then report:

- the word count before and after. If it did not drop, say so. Never call a file slimmer
  than it is.
- every flaw you found and left alone
- anything whose meaning you think changed. The answer should be nothing.
