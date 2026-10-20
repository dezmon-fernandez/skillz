---
name: walk-plan
description: >-
  Render a developer's walkthrough of an implementation plan: what gets built, the entry
  points, the data it reads and writes, what else changes, the decisions, the call path,
  every new or changed function with its return type, every model as code, and the rules
  traced on one worked value. Read-only. Use after a plan is written or revised, and when
  asked to "walk me through the plan", "show me the shape of this plan", "what does this
  plan build", or "what models and functions does this add".
argument-hint: "[path to the plan]"
---

# walk-plan: the plan as the developer needs to see it

## Plan: $ARGUMENTS

Goal: the developer judges the design before anything is built. A plan is written for
whoever implements it, with every detail they need, so it runs long. The developer needs a
different cut of the same facts: what the work touches, why it has this shape, and what
the code will be named.

Write no file and change nothing. The walkthrough is the reply.

If the plan path is missing or the file cannot be read, say so and stop.

## 1. Read

Read the plan file in full, even when this session wrote it. The implementer gets the
file, so the walkthrough describes the file.

Two sources answer a section:

- **The plan** is the only source for anything the plan adds or changes.
- **The code** answers only for what exists today: the tables a query reads, an entry
  point's address, what an existing function returns before the change.

Report the plan. Never repair it in the walkthrough.

- A name appears exactly as the plan spells it. The developer is judging the real names.
- When the plan leaves out something a section needs, write `not stated in the plan` in
  that place. A return type the plan never gives reads `-> not stated in the plan`. Each
  such line shows the developer a hole in the plan.

## 2. Write

Use the size line and these eleven sections, in this order, every time. A section or a
group with nothing to report says `none`, because "no migration" is information.

Write every code block in the plan's own language. The skeleton shows Python and SQL.

````markdown
# Walkthrough: <plan name>

Size: <N> entry points, <N> tables, <N> functions, <N> models

## What gets built

<Two sentences in plain words: what exists afterwards that is not there today.>

## Surface

```
NEW  <the entry point>

  Reach     <what it may read, write, or call, and what a call costs>

  Inputs    <input>       <bounds, default, or how it pairs with another>

  Answers   <outcome>     <what causes it>


CHANGED  <the entry point>

  Now       <what a caller sees differently>
```

## Data

```
Migration   <none, or each table and column added or changed>
Writes      <none, or each table and what is written to it>
Reads       <table>    <what it holds for this feature>
Relies on   <the key or index a new query needs>
```

## What else changes

- <Existing behaviour that moves, and who sees it.>
- <Code or behaviour that is removed.>
- <Work another codebase must do, and which side ships first.>
- <Generated files and records that change.>

## Decisions

- **<What was chosen>**, not <what was rejected>. <Why, in one sentence.>

## The path

```
<the request, command, or trigger, with its inputs>

1. <function_name>   <what it does>   → <what it yields>
2. <function_name>   <what it does>   → <what it yields>

→ <what comes back, or what is written>
Reuses: <existing functions this path calls unchanged, or none>
```

## Functions

```python
# ── <the first path's name>, in order ──

# <What the body does.>
def <name>(...) -> <return type>

# Existing, changed. <What the body does after the change.>
# Today: <what it does now.>
def <name>(...) -> <return type>

# ── helpers the steps call ──

# <What the body does.>
def <name>(...) -> <return type>

# ── existing, changed ──

# <A changed function that no path above lists.>
# Today: <what it does now.>
def <name>(...) -> <return type>
```

## Models

Served, what a caller receives:

```python
# <Which function returns or builds it.>
class <Name>:
    <field>: <type>   # <its meaning, when the name does not carry it>
```

Stored, tables added or changed:

```sql
CREATE TABLE <name> (
    <column> <type>,
    PRIMARY KEY (<columns>)
);
-- Row model: <Name>, one field per column.
```

Internal, what moves between the steps:

```python
# Existing, gains <N> fields. <Which function builds it and which reads it.>
class <Name>:
    ...
    <new field>: <type>
```

## Rules

Traced on one value: <what it is, for whom, asked at what moment>.

```
<the inputs, as a small table of the plan's own example or test values>

<step>   <the arithmetic or check on those inputs>   → <result>
<step>   <the next step>                             → <what the user sees>
```

Also:

- <A rule the trace does not show, in one plain sentence with its case.>

## When it can't answer

- <A missing-data or refused case>: <what the user sees>.

## Cost and proof

- Cost: <measured time and size with their sample, anything metered, caching>.
- Proof: <how the tests show the result is right, in one sentence>.
````

What each part holds:

- **Size.** Count what the plan adds or changes. The numbers tell the developer how big
  the plan is before they read it.
- **What gets built.** No function or model name. A reader who stops here knows what
  changed for the user.
- **Surface.** Every entry point the plan adds or changes: an HTTP route, a command, a
  screen, a scheduled job, an event handler, or a library's public function. `Reach`,
  `Inputs`, and `Answers` are separate groups, so a parameter never sits beside a status
  code. Give each row one line, and shorten its words before wrapping it. Leave one blank
  line between groups and two between entry points. Entry points that change the same way
  stack their `CHANGED` lines and share one `Now` line. A call's cost is stated when the
  project meters calls.
- **Data.** Everything the feature persists or reads: database tables, files, caches,
  and outside services.
- **What else changes.** At most five bullets. Generated files are ones a tool rebuilds
  from the code, such as an API schema or generated types. Records are documents the
  project keeps, such as a decision record or a changelog.
- **Decisions.** At most five. Pick the ones that set the shape: where the feature lives,
  which side does which work, what the data is keyed by. A decision with no rejected
  alternative stays in the plan.
- **The path.** The steps the plan adds or changes, in call order. Existing functions the
  path calls unchanged go on the `Reuses` line, by name only. A plan with several paths,
  such as a job that writes and a route that reads, gets one block for each.
- **Functions.** Every function the plan adds or changes, one group per path block in the
  same order, then the helpers, then any changed function no path lists. A function
  appears once. Arguments stay as `(...)`. The comment says what the body does, in at
  most three lines, so the developer can check each name against its body. Leave out test
  code: fixtures, doubles, and seeding helpers.
- **Models.** Every type, schema, and table the plan adds or changes, as real code with
  fields exactly as the plan gives them. Transcribe a table the plan describes in a column
  list into `CREATE TABLE`, and a changed table into `ALTER TABLE`. A row model that
  mirrors its table gets the one comment line under the table, never a second listing. An
  existing model appears in full only when a new or changed function returns it, marked
  `Existing, unchanged`. An existing model that a new model nests appears only as a
  field's type.
- **Rules.** Follow one value a user will see from its inputs to what they are shown,
  with the plan's own example or test values. Each step shows its inputs, its arithmetic
  or check, and its result, so every rule arrives with the case that needs it. Pick a
  value whose numbers include a tie or a boundary when the plan has one. For a plan that
  writes, follow one record from where it enters to its stored row. Under `Also`, give
  each rule the trace does not show as one plain sentence with a case, at most six. Use
  no term the trace has not shown. When the plan carries no worked values, write
  `not stated in the plan` in place of the trace.
- **When it can't answer.** At most five cases, chosen from the cases the plan lists:
  the ones a user of the feature would see.
- **Cost and proof.** One bullet each.

The first six sections stay short whatever the plan's size. Functions and Models run as
long as the plan needs. Never drop a function or a model to shorten them: their length is
the plan's size, and the developer is reading for it.

## 3. Check

Before replying, hold the walkthrough to these.

- Every line is under 80 columns, inside code blocks too. The developer may read this in
  a terminal or a narrow side panel, where a wider line wraps and breaks the alignment of
  every block. Wrap a long signature across lines. Move a trailing comment that does not
  fit to the line above its field.
- No file path, argument list, test name, validation command, line number, or
  implementation warning appears. The plan carries those for the implementer.
- A function comment says what the body does. Why the design was chosen belongs under
  Decisions.
- The reply carries no opinion on a name, no recommendation, and no summary after the last
  section. The developer forms a view from Functions and Models.

`references/example.md` is one finished walkthrough of an invented plan. Read it before
writing, for the level of detail each section takes.
