# Plan template

A plan has two parts. The developer reads the Design part and confirms it before anything
is built. The executor builds from both.

- A task never restates another section. It points at it: a function or a model by name,
  a rule or a case by its opening words. A fact written twice gets changed in one place.
- Fill every section. One with nothing to report says `none`, because "no migration" is
  information. Never leave placeholder text under a heading. The executor will implement
  it.
- Write every code block in the codebase's own language. The skeleton shows Python and
  SQL.
- Keep every line of the Design part under 80 columns, inside code blocks too. The
  developer may read it in a terminal, where a wider line wraps and breaks every block.
  Move a trailing comment that does not fit to the line above its field.
- The Design part names no source file, test, or line number, outside `## Prerequisite`.
  The Build part carries those.

---

````markdown
# Feature: <feature-name>

# DESIGN

Size: <N> entry points, <N> tables, <N> functions, <N> models

## What gets built

<Two sentences in plain words: what exists afterwards that is not there
today. No function or model name.>

As a <type of user>, I want to <action/goal>, so that <benefit/value>.

## ACCEPTANCE CRITERIA

<Numbered, one each: what a user can observably do, or what must observably
be true, when the feature is done. Each is provable by a test or a named
manual check. Tasks cite them by number (AC #3), so the numbering is fixed
once written.>

## Out of scope

- <What this feature does not do, and why. A part that is not fully built is
  listed here.>

## Surface

```
NEW  <a route, command, screen, job, event handler, or public function>

  Reach     <what it may read, write, or call, and what a call costs>

  Inputs    <input>       <bounds, default, or how it pairs with another>

  Answers   <outcome>     <what causes it>


CHANGED  <the entry point>

  Now       <what a caller sees differently>
```

## Data

```
Migration   <none, or each table and column added or changed>
Writes      <none, or each table, file, or cache and what is written to it>
Reads       <table, file, cache, or service>    <what it holds for the feature>
Relies on   <the key or index a new query needs>
```

## What else changes

- <Existing behaviour that moves, and who sees it.>
- <Code or behaviour that is removed.>
- <Work another codebase must do, and which side ships first.>
- <Generated files that change, such as an API schema, and kept documents,
  such as a changelog.>

## Decisions

- Developer, <date>: **<what was chosen>**, not <what was rejected>.
  <Why, in one sentence.>
- On record, <its source>: **<what was already decided>**.
- Planner: **<what was chosen>**, not <what was rejected>.
  <Why, in one sentence.>

## The path

```
<the request, command, or trigger, with its inputs>

1. <function_name>   <what it does>   → <what it yields>
2. <function_name>   <what it does>   → <what it yields>

→ <what comes back, or what is written>
Helpers: <new or changed functions the steps call, or none>
Reuses: <existing functions this path calls unchanged, or none>
```

## Models

Served, what leaves this codebase:

```python
# <Which function returns or builds it.>
class <Name>:
    <field>: <type>   # <its meaning, worded as a caller will read it>
```

Stored, tables added or changed:

```sql
CREATE TABLE <name> (        -- a changed table is an ALTER TABLE
    <column> <type>,
    PRIMARY KEY (<columns>)
);
-- Row model: <Name>, one field per column. It is not listed again.
```

## Rules

Traced on one value: <what it is, for whom, asked at what moment>.

```
<the inputs, as a small table of example values>

<step>   <the arithmetic or check on those inputs>   → <result>
<step>   <the next step>                             → <result>

served   <the model's name, or `stored` and the table's>
           <field>   <its value in this example>
```

Also:

1. <A rule the trace does not show, in one plain sentence with its case.>

## When it can't answer

- <A missing-data, refused, or failed case>: <what the user sees>.

## Cost and proof

- Cost: <measured time and size with their sample, anything metered, caching>.
- Proof: <how the tests show the result is right, in one sentence>.

## Prerequisite

<`none`, or each condition that must hold before the build starts: a
dependency to install, an upstream change to land, a schema or API sync to
confirm.>

- `<condition>`. <Who makes it hold.> Confirm it with `<command>`, or with
  the observable state that proves it.

**Do not execute this plan until each one holds.**

# BUILD

Check the names of existing utilities, types, and models against the code before you use
them. Import from the right files.

## Functions

```python
# ── <the first path's name>, in order ──

# <What the body does, in three lines at most.>
def <name>(<arguments>) -> <return type>

# Existing, changed. <What the body does after the change.>
# Today: <what it does now.>
def <name>(...) -> <return type>     # (...) unless the change is to its arguments

# ── helpers the steps call ──

# <What the body does.>
def <name>(<arguments>) -> <return type>

# ── other new or changed functions ──

# <A function that no path lists.>
def <name>(<arguments>) -> <return type>
```

## Internal models

```python
# <What moves between this feature's own functions. Which one builds it, which reads it.>
class <Name>:
    <field>: <type>

# Existing, gains <N> fields.
class <Name>:
    ...
    <new field>: <type>
```

## EDGE CASES

<Every condition the Design part's Rules and "When it can't answer" have no room for,
grouped under the unit that owns it. For each unit, take every input it reads and every
state that input can be in: absent, loading, in-flight, empty, denied, failed with nothing
held, and failed while an earlier value is still held. Write the line for each state, and
for each two that can happen together. Add logic that throws or returns a wrong answer
(boundary values, malformed input), and every case where two rules apply at once, with the
rule that wins.>

`<unit>`:
- <condition>: <what must happen>

**Every line here becomes a named test. So does every rule and every case in the Design
part.**

## CONTEXT REFERENCES

### Relevant codebase files: READ THESE BEFORE IMPLEMENTING

<Files with line numbers and relevance.>

- `path/to/file` (lines 15-45). Why: the pattern for X that this mirrors
- `path/to/model` (lines 100-120). Why: the data model structure to follow
- `path/to/test`. Why: the test pattern to follow

### New files to create

- `path/to/new-service`: the service implementation for X
- `path/to/new-model`: the data model for Y
- `path/to/new-service-test`: unit tests for the new service

### Relevant documentation: READ THESE BEFORE IMPLEMENTING

- [Doc link](https://example.com/doc#section)
  - Specific section: authentication setup
  - Why: required for the secure endpoint
- `.agents/documentation/<name>.md`
  - Specific section: <heading>
  - Why: the decision this project already made about X

### Patterns to follow

<Patterns from this codebase the executor must match, each as `file:line` with what to
take from it: naming, error handling, logging.>

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Number the tasks. Each one is atomic and independently
testable, and names the files it changes. The executor should never have to go discover a
file.

Group tasks under `### Phase N: <the work it delivers>` headers when the work spans
stages. A phase assumes the one above it is done. Where that is not the true dependency,
add a `**Depends on:**` or an `**Independent of:**` line under its header. Independent
phases can run in parallel.

Start each task title with an action keyword, then add short bullets saying exactly what
changes:

- **CREATE**: new files
- **UPDATE**: existing files
- **ADD**: new functionality in existing code
- **REMOVE**: deprecated code
- **REFACTOR**: restructure without changing behavior
- **MIRROR**: follow the shape of existing code. Count the places that already hold the
  same logic and say the number: a third copy is a REFACTOR, unless a project rule says
  otherwise
- **VERIFY**: run a check that changes no file

Add the fields below only when the task needs them. Most tasks need just the change
bullets, a BUILDS and a VALIDATE:

- **BUILDS**: the functions and models this task delivers, by name. Never restate them.
- **PATTERN**: the existing code to mirror, as `file:line`.
- **IMPORTS**: the exact imports, when they are not obvious.
- **EDGE CASES**: the rules and cases this task owns. It writes the named test for each.
- **GOTCHA**: a known constraint that would trip up the executor, such as framework
  behavior, ordering, or a type quirk.
- **VALIDATE**: `<executable command>` proving this one task is done. **Always include it.**
- **SATISFIES**: the acceptance criterion this advances (for example AC #2), so every task
  traces to one.

When an algorithm is too involved for Functions and Rules to carry, sketch it in
pseudocode under the task that owns it: the loop, the branches, where the transaction or
state update happens.

## VALIDATION COMMANDS

<The real commands from this project, each one run while planning, or marked `not run`
with the reason. Every one must be non-interactive.>

Run every command. Together they prove no regressions and a correct feature.

- **Level 1: Syntax and style.** <lint and format commands>
- **Level 2: Unit tests.** <unit test command>
- **Level 3: Integration tests.** <integration test command>
- **Level 4: Manual validation.** <feature-specific steps>

  Cover every state the feature renders, not only the one where everything works: empty,
  loading, error, denied. For a UI change, check keyboard focus and run an accessibility
  check on the changed view.

- **Level 5: Additional.** <any other check this feature needs>

## NOTES

<Your decisions that nobody outside the code would see, one line each, and context the
sections above have no home for.>
````

---

## Rules the skeleton cannot show

- **Surface.** For a screen, draw it under its entry, in each state that changes the
  layout. Where the plan rests on size, colour or spacing, say under the sketch whether
  the developer has seen it rendered.
- **Decisions.** List every decision the developer made, then each of yours whose effect
  the developer or a caller would see. A choice with no rejected alternative is not a
  decision. Your others go under `## NOTES`.
- **The path.** One block for each path, such as a job that writes and a route that reads.
  Every function the plan adds or changes appears by name, as a step or under `Helpers`.
- **Models.** Name a field with the word the developer or the code already uses for the
  thing. Where neither has one, your name is a decision: list it under Decisions with the
  name you rejected. An existing model appears in full only when a new or changed function
  returns it, marked `Existing, unchanged`. One that a new model nests appears only as a
  field's type. Say in a model's comment what it reuses from an existing model, and any
  assumption a reviewer should check, such as a nullable field the caller may not honor.
- **Rules.** Pick a value whose numbers include a tie or a boundary when the feature has
  one. For a feature that writes, follow one record to its stored row. Two behaviours that
  share no step get a trace each. Use no term the Design part has not shown. Number at
  most six rules under `Also`. The rest go under `## EDGE CASES`.
- **When it can't answer.** At most five cases a user would see. The rest go under
  `## EDGE CASES`.
- **Functions.** A function appears once. Leave out test code: fixtures, doubles, and
  seeding helpers. List a style rule or a stored query the same way: its name and what it
  does.
