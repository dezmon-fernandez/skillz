# Plan template

Fill every section. Delete a section only when the feature genuinely has nothing for it —
never leave a heading with placeholder text under it, because the executor will implement
the placeholder.

The examples use a stand-in feature: **archiving a record from a list**. Replace them with
this codebase's real nouns.

---

```markdown
# Feature: <feature-name>

This plan should be complete, but validate the documentation, the codebase patterns, and
task sanity before implementing. Pay special attention to the names of existing utilities,
types, and models — import from the right files.

## Feature Description

<What the feature is, its purpose, and its value to users.>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<The specific problem or opportunity this addresses.>

## Solution Statement

<The proposed approach and how it solves the problem.>

## ACCEPTANCE CRITERIA

<Numbered, one line each: what a user can observably do, or what must observably be true,
when this feature is done. These are the requirements; there is no separate requirements
list. Tasks cite them by number (AC #3), so the numbering is fixed once written.>

Each one must be provable by a test or a named manual check. "Works correctly" is not
provable. Anything the feature deliberately does not do belongs in Out of Scope, never
here as a soft criterion.

**Example:**

1. An owner sees an Archive action on each row of their record list.
2. Archiving asks for confirmation, and cancelling leaves the list unchanged.
3. An archived record leaves the list without a reload.
4. An archived record is absent from the list on next load.
5. A failed archive leaves the row in place and surfaces the error to the user.

## OUT OF SCOPE

<What this feature deliberately does not do, one line each, with the reason. A feature is
either fully in or explicitly out; a half-build is what happens when neither list says.>

**Example:**

- Bulk archive: one row at a time until the list has a selection model.
- Unarchive: no surface for it yet; a mistaken archive is fixed by an admin.

## Prerequisite

<Omit this section when nothing must be true before execution starts.>

A gate that must hold before the executor begins — a dependency to install, an upstream
change to land, a schema or API sync to confirm. State it as a checkable condition, not a
task, and say plainly: **do not execute this plan until it holds.**

- `<condition>` — how to confirm it: `<command>`, or the observable state that proves it

---

## CONTEXT REFERENCES

### Relevant codebase files — READ THESE BEFORE IMPLEMENTING

<Files with line numbers and relevance.>

- `path/to/file` (lines 15-45) — Why: the pattern for X that this mirrors
- `path/to/model` (lines 100-120) — Why: the data model structure to follow
- `path/to/test` — Why: the test pattern to follow

### New files to create

- `path/to/new-service` — the service implementation for X
- `path/to/new-model` — the data model for Y
- `path/to/new-service-test` — unit tests for the new service

### Relevant documentation — READ THESE BEFORE IMPLEMENTING

- [Doc link](https://example.com/doc#section)
  - Specific section: authentication setup
  - Why: required for the secure endpoint

### Patterns to follow

<Specific patterns extracted from this codebase, with real excerpts from the project:
naming conventions, error handling, logging, and anything else the executor must match.>

---

## DATA MODELS

<The models this feature adds or changes, as real code in this project's own idiom —
a validation schema, a type, a struct, a table definition. Everything else derives from
them, so get them exact.>

Annotate each model with:

- **Reuse?** — what comes from an existing model, its import path, and why sharing is safe.
- **Changes** — for an edit to an existing model, the delta against `file:line` and the
  consumers it affects.
- **Assumptions** — anything about the shape the reviewer should check: a nullable the API
  may not honor, a default that encodes a policy decision, a rule the backend must agree with.

**Example:**

### `recordSummary` in `record/record-summary.<ext>`

- **Reuse?** `classifiedText` from the shared module — a marked string means the same
  thing here as everywhere else, so one definition covers both.
- **Changes:** none, new model.
- **Assumptions:** the API omits `notes` when empty rather than sending `""`.

    recordSummary {
      id           opaque server id, never parsed
      name         required, non-empty, trimmed at the boundary
      summary      classifiedText (reuse)
      itemCount    integer, 0 when there are none, never absent
      notes?       max 500 chars; optional → absent, never ""
      archivedAt?  timestamp; absent while active
    }

---

## CONTRACT

<What this feature exposes to the rest of the system, what it must always do, and how it
behaves at the edges. DATA MODELS says what the data is; this says what the code does with it.>

### Interface Sketch

<Signatures only: the public inputs and outputs of each new unit, the collaborators it
depends on, the public methods and the endpoint each one calls, any route parameters.
Comment what each one guarantees and why each dependency is needed. No bodies.>

### Behavioral Rules

<Numbered statements that must be observably true when the feature is done. One rule per
line, each one something a test can prove.>

### Edge Cases

<The conditions that would degrade the system or make it behave in a way nobody asked for,
grouped under the unit that owns them. Both the UI states (empty, loading, error, denied,
in-flight) and the logic that throws or returns a wrong answer (boundary values, malformed
input, an absent optional).>

Write each one as `condition → what must happen`. **Every line here becomes a named test.**

**Example:**

### Archive a record: `ArchiveButton` and `RecordService`

**Interface Sketch**

    ArchiveButton (NEW)
      in  record   : required, the row this button acts on
      out archived : emitted after a successful archive, so the parent can offer undo
      needs RecordService  — owns the list this mutates
      needs ConfirmService — owns the confirmation prompt

    RecordService.archive(recordId) -> async Record   (EXISTING service, one new method)
      POST {recordServiceUrl}/{id}/archive
      resolves with the archived record and drops it from the cached list, as delete() does

**Behavioral Rules**

1. Archiving confirms through `ConfirmService` first, and a cancelled prompt calls nothing.
2. The row leaves the list only after the server confirms, never optimistically.
3. A failed archive leaves the row in place and reports the error to the user.

**Edge Cases**

`ArchiveButton`:
- archive while the list is still loading → the button is disabled

`RecordService.archive`:
- already archived by someone else (404) → treat as success, drop the row
- the cached list has not loaded yet → the drop is a no-op, never a throw
- two archives in flight on different rows → each settles on its own

---

## IMPLEMENTATION PLAN

Phases run **top to bottom by default** — each assumes the phase above it is done. Where
that is not the true dependency, make it explicit with a `**Depends on:**` line under the
phase header, and an `**Independent of:**` line where two phases don't block each other.
Independent phases are candidates to run in parallel. Only annotate where it changes
execution order or unlocks parallelism; skip the obvious sequential case.

### Key design decisions

<The choices that shaped this plan and the reason each one won, one line each. A decision
settled at the Decision Gate belongs here as a fact, never as an option. This is where a
reviewer disagrees with the approach, before any code exists.>

**Example:**

- Archive is a soft delete on the server, not a client-side filter: the list must still be
  correct after a reload, and only the server knows that state.
- The confirm step reuses `ConfirmService` instead of a new prompt, so archive and delete ask alike.
- `ArchiveButton` owns the confirm and the call, so the list stays a list.

### Phases

<The phases this feature actually has. Title each one with the work it delivers, not a
generic label: "Phase 1: Foundation (schema, service method, prompt)". Under it, the order
the pieces land in and why, saying which dependencies are hard and which are convenient.>

Sketch an algorithm in pseudocode under the phase that owns it when there is one the
CONTRACT cannot express: the loop, the branches, where the transaction or state update
happens. **Sketch it, do not write it.** If the executor could paste it and be done, back off.

**Example:**

#### Phase 1: The service method (`RecordService.archive`)

Lands with its tests first: the button has nothing to call until it exists.

#### Phase 2: The button (`ArchiveButton`)

**Depends on:** Phase 1.

Build the unit, wire the confirmation, then render it in the list row. No algorithm sketch:
the CONTRACT's rules and edge cases already specify the whole flow.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently testable. Every task
carries the finding it needs — read the files it names and do what it says; the executor
should not have to go discover anything.

Group tasks under `### Phase N` headers when the work spans stages.

Open each task title with an action keyword, then give terse bullets saying exactly what
changes:

**CREATE** new files · **UPDATE** existing files · **ADD** new functionality to existing
code · **REMOVE** deprecated code · **REFACTOR** without changing behavior · **MIRROR** a
pattern from elsewhere in the codebase

Reach for the heavier fields only when the task earns it — most tasks need just the change
bullets and a VALIDATE:

- **CONTRACT** — the exact signature, type, or behavior this unit must expose, when it is
  not already pinned by the top-level CONTRACT or a synced schema.
- **PATTERN** — the existing code to mirror, as `file:line`.
- **IMPORTS** — the exact imports, when non-obvious.
- **EDGE CASES** — the paths this task must handle, when it owns any.
- **GOTCHA** — a known constraint that would trip the executor: framework behavior,
  ordering, a type quirk.
- **VALIDATE** — `<executable command>` proving this one task is done. **Always include it.**
- **SATISFIES** — the acceptance criterion this advances (e.g. AC #2), so every task traces
  to one.

---

## TESTING STRATEGY

### Unit Tests

<Scope and requirements, following the testing approach already in the codebase.>

### Integration Tests

<Scope and requirements.>

### Edge Cases

The CONTRACT's Edge Cases list is the checklist. Every line there gets a named test.

---

## VALIDATION COMMANDS

<The real commands from this project, discovered in Phase 2. Every one must be
non-interactive and runnable as written.>

Execute every command to ensure zero regressions and full feature correctness.

- **Level 1 — Syntax and style**: <lint and format commands>
- **Level 2 — Unit tests**: <unit test command>
- **Level 3 — Integration tests**: <integration test command>
- **Level 4 — Manual validation**: <feature-specific steps>

  Cover every state branch the feature renders, not only the happy one: empty, loading,
  error, denied. For a UI change, check keyboard focus and run an accessibility pass on
  the changed view.

- **Level 5 — Additional** (optional): <any other tooling available in this project>

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task's own validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes
- [ ] No linting or type errors
- [ ] Manual testing confirms the feature works
- [ ] Every acceptance criterion met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

<Additional context, design decisions, and trade-offs. Decisions settled with the operator
live here as facts if they have no better home.>
```
