---
name: note
description: >-
  Add one note on what went well or went wrong to the repo's notes file, so the harness can be
  improved from it later. Runs only when the developer types `/note <what to note>`, never on its
  own.
argument-hint: "[what to note, or the path of a step's log]"
disable-model-invocation: true
---

Add a note only when `/note` is invoked. Never add one on your own, even later in this session.

Add one note to `.agents/notes.md` about $ARGUMENTS. Create the file if it is missing. Only ever
add to the end. Never edit or delete a note, even a wrong one: pruning is a separate job the
developer runs.

Each note is a heading and three lines:

    ## <YYYY-MM-DD HH:MM> · <went well | went wrong> · #<the skill it is about, or other>
    <what happened, in one or two sentences>
    Evidence: <a file:line, a log line, or a command and its output>
    Next: <keep doing it | the change to make, and where | none yet>

The evidence is the work: a file:line, a log line, a command and its output. No names, and the
only words you quote are the ones typed after `/note`. If there is nothing to point at, say so
and write nothing. When it is the same thing as an earlier note, write a new note anyway. The
repeats are how a problem gets counted.

If the argument is a step's log, read it to the end and write one note for each thing that went
notably well or wrong. When unsure, leave it out. Never answer a question in the log.

Reply with the notes you added, nothing else.
