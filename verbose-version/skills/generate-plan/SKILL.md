---
name: generate-plan
description: Turn a feature request, the current conversation, or a tracker ticket (Jira, GitHub, GitLab) into a context-rich implementation plan through codebase analysis, a short decision gate, and external research. The plan states the contract and a pseudocode sketch, not literal implementation code. Use before writing any code for a feature.
argument-hint: "[ticket key or URL, a feature description, or empty to plan from the conversation]"
---

# Plan a new task

## Feature: $ARGUMENTS

Resolve the input first: `$ARGUMENTS` is a **free-form feature description**, **chat context**, or a
**tracker ticket**. Tell them apart and handle each:

- **A free-form description**: plan directly from it.
- **Chat context** (`$ARGUMENTS` is empty or points at the conversation): the feature lives in
  this session, which the executor never sees. Restate it in your own words, confirm it with
  the user, then plan from that restatement as if it were free-form.
- **A ticket** (a key such as `ABC-123`, or a Jira / Linear / GitHub / GitLab issue URL): **fetch it
  from the tracker before you plan** (Jira via the Atlassian MCP, GitHub via `gh issue view`, GitLab via
  `glab issue view`). Read its summary, acceptance criteria, and per-ticket context. Then **follow its
  links up to the epic and the epic's linked architecture page** (Confluence via the Atlassian MCP) and
  inherit those decisions (see "Inherit, don't re-decide" below). Never plan from the bare key; the
  ticket body plus its epic and architecture are the real input.

## Mission

Transform a feature request into a **comprehensive implementation plan** through systematic codebase analysis, external research, and strategic planning.

**Core Principle**: We do NOT write code in this phase. Our goal is to create a context-rich implementation plan that enables one-pass implementation success for ai agents. The plan specifies the **contract** (signatures, types, behavioral rules, edge cases) and a **high-level implementation plan in pseudocode** — it guides the implementer, it does not pre-write the code. Pseudocode, examples, and specs are encouraged; literal, paste-ready code is not. **Litmus**: if the implementer could paste it and be done, it's code — back off to pseudocode. Data models are the exception — a schema or type *is* its spec, so state it as real code.

**Key Philosophy**: Context is King. The plan must contain ALL information needed for implementation - patterns, mandatory reading, documentation, the contract, a pseudocode implementation plan, and validation commands - so the execution agent succeeds on the first attempt.

## Planning Process

### Phase 1: Feature Understanding

**Deep Feature Analysis:**

- Extract the core problem being solved
- Identify user value and business impact
- Determine feature type: New Capability/Enhancement/Refactor/Bug Fix
- Assess complexity: Low/Medium/High
- Map affected systems and components

**Create User Story Format Or Refine If Story Was Provided By The User:**

```
As a <type of user>
I want to <action/goal>
So that <benefit/value>
```

### Phase 2: Codebase Intelligence Gathering

**Use specialized agents and parallel analysis:**

**1. Project Structure Analysis**

- Detect primary language(s), frameworks, and runtime versions
- Map directory structure and architectural patterns
- Identify service/component boundaries and integration points
- Locate configuration files (pyproject.toml, package.json, etc.)
- Find environment setup and build processes

**2. Pattern Recognition** (Use specialized subagents when beneficial)

- Search for similar implementations in codebase
- Identify coding conventions:
  - Naming patterns (CamelCase, snake_case, kebab-case)
  - File organization and module structure
  - Error handling approaches
  - Logging patterns and standards
- Extract common patterns for the feature's domain
- Document anti-patterns to avoid
- Check CLAUDE.md for project-specific rules and conventions

**3. Dependency Analysis**

- Catalog external libraries relevant to feature
- Understand how libraries are integrated (check imports, configs)
- Find relevant documentation in `.agents/documentation/` if available
- Note library versions and compatibility requirements

**4. Testing Patterns**

- Identify test framework and structure (pytest, jest, etc.)
- Find similar test examples for reference
- Understand test organization (unit vs integration)
- Note coverage requirements and testing standards

**5. Integration Points**

- Identify existing files that need updates
- Determine new files that need creation and their locations
- Map router/API registration patterns
- Understand database/model patterns if applicable
- Identify authentication/authorization patterns if relevant

**Collect Open Questions (do not ask yet):**

- Note every ambiguity, unstated preference, and unresolved architecture choice you meet while
  researching — the feature idea's own "Open questions" section included
- These are resolved at the Decision Gate (Phase 3.5), after research has armed you to ask each
  one with a verified recommendation attached
- Exception: ask immediately only when the ambiguity blocks the research itself (you cannot tell
  which subsystem or approach to investigate)

### Phase 3: External Research & Documentation

**Use specialized subagents when beneficial for external research:**

**Documentation Gathering:**

- Research latest library versions and best practices
- Find official documentation with specific section anchors
- Locate implementation examples and tutorials
- Identify common gotchas and known issues
- Check for breaking changes and migration guides

**Technology Trends:**

- Research current best practices for the technology stack
- Find relevant blog posts, guides, or case studies
- Identify performance optimization patterns
- Document security considerations

**Compile Research References:**

```markdown
## Relevant Documentation

- [Library Official Docs](https://example.com/docs#section)
  - Specific feature implementation guide
  - Why: Needed for X functionality
- [Framework Guide](https://example.com/guide#integration)
  - Integration patterns section
  - Why: Shows how to connect components
```

### Phase 3.5: Decision Gate (mandatory — never write the plan while an open question remains)

Open questions in a feature idea are user policy wearing an architecture costume: the codebase
cannot answer them, and a plan that guesses them decides for the user. This gate runs after
research on purpose — research is what arms you to ask well.

**Collect every unresolved decision:**

- The "Open questions" section of the feature idea document, if one exists
- The open questions noted during Phase 2
- Any architecture or policy choice research surfaced that the user has not already decided
  (scope, defaults, spend/cost posture, surfaces, cadence)

**Resolve the set:**

1. Sort each item first. If the codebase, an existing standard, or a prior user decision answers
   it, resolve it yourself and record the resolution — never ask what you can verify.
2. For each remaining item, form a recommendation before asking. Verify its feasibility in the
   code, and attach the concrete trade-off (cost, blast radius, maintenance) the user needs in
   order to choose well.
3. Ask via AskUserQuestion in batches of up to 4 — recommended option first, labeled
   "(Recommended)", every option's description carrying its consequence.
4. Read each answer as an answer AND as new input. An answer may raise a new question, contradict
   an assumption, or ask you something back — fact-check it against the code, answer it, and loop
   until the set is empty.

**Done when:** zero open questions remain, and every decision appears in the plan as a settled
fact the executor can act on (in the Feature Description or NOTES) — never as an option list or
an open item. The executor holds only the plan, not this conversation.

### Phase 4: Deep Strategic Thinking

**Think Harder About:**

- How does this feature fit into the existing architecture?
- What are the critical dependencies and order of operations?
- What could go wrong? (Edge cases, race conditions, errors)
- How will this be tested comprehensively?
- What performance implications exist?
- Are there security considerations?
- How maintainable is this approach?

**Design Decisions:**

- Choose between alternative approaches with clear rationale
- Design for extensibility and future modifications
- Plan for backward compatibility if needed
- Consider scalability implications

A new user-owned decision surfaced here goes back through the Decision Gate (Phase 3.5);
decisions already settled there stay settled.

### Phase 5: Plan Structure Generation

**Create comprehensive plan with the following structure:**

Whats below here is a template for you to fill for the implementation agent:

````markdown
# Feature: <feature-name>

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

<Detailed description of the feature, its purpose, and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<Clearly define the specific problem or opportunity this feature addresses>

## Solution Statement

<Describe the proposed solution approach and how it solves the problem>

## ACCEPTANCE CRITERIA

<Numbered, one line each: what a user can observably do, or what must observably be true, when this
feature is done. These are the requirements; there is no separate requirements list. Tasks cite them
by number (AC #3), so the numbering is fixed once written.>

Each one must be provable by a test or a named manual check. "Works correctly" is not provable.
Anything the feature deliberately does not do belongs in Out of Scope, never here as a soft
criterion.

**Example:**

1. A provider owner sees an Archive action on each row of My Providers.
2. Archiving asks for confirmation, and cancelling leaves the list unchanged.
3. An archived provider leaves the table without a page reload.
4. An archived provider is absent from the list on next load.
5. A failed archive leaves the row in place and surfaces the error in the snack bar.

## OUT OF SCOPE

<What this feature deliberately does not do, one line each with the reason. A feature is either
fully in or explicitly out; a half-build is what happens when neither list says.>

**Example:**

- Bulk archive: one row at a time until the table has a selection model.
- Unarchive: no surface for it yet, a mistaken archive is fixed by an admin.

## Prerequisite

<Omit this section when nothing must be true before execution starts.>

A gate that must hold before the executor begins — a dependency to install, an upstream change to
land, a schema/API sync to confirm. State it as a checkable condition, not a task, and say plainly:
**do not execute this plan until it holds.**

- `<condition>` — how to confirm it: `<command>`, or the observable state that proves it

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

<List files with line numbers and relevance>

- `path/to/file.py` (lines 15-45) - Why: Contains pattern for X that we'll mirror
- `path/to/model.py` (lines 100-120) - Why: Database model structure to follow
- `path/to/test.py` - Why: Test pattern example

### New Files to Create

- `path/to/new_service.py` - Service implementation for X functionality
- `path/to/new_model.py` - Data model for Y resource
- `tests/path/to/test_new_service.py` - Unit tests for new service

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Documentation Link 1](https://example.com/doc1#section)
  - Specific section: Authentication setup
  - Why: Required for implementing secure endpoints
- [Documentation Link 2](https://example.com/doc2#integration)
  - Specific section: Database integration
  - Why: Shows proper async database patterns

### Patterns to Follow

<Specific patterns extracted from codebase - include actual code examples from the project>

**Naming Conventions:** (for example)

**Error Handling:** (for example)

**Logging Pattern:** (for example)

**Other Relevant Patterns:** (for example)

---

## DATA MODELS

<The models this feature adds or changes, as real code: a Zod schema (`*.schema.ts`) or a plain TS
type/interface (`*.model.ts`). Everything else derives from them, so get them exact.>

Annotate each model with:

- **Reuse?:** what comes from an existing model, its import path, and why sharing it is safe.
- **Changes:** for an edit to an existing model, the delta against `file:line` and the consumers it affects.
- **Assumptions:** anything about the shape the reviewer should check. A nullable the API may not honor, a default that encodes a policy decision, a rule the backend must agree with.

**Example:**

### `providerProfileSchema` in `provider/provider-profile-builder/provider-profile.schema.ts`

- **Reuse?:** `classificationTextSchema` from `@shared/classification`; a marked string means the
  same thing here as in every other classified field, so one definition covers both.
- **Changes:** none, new model
- **Assumptions:** the API omits `notes` when empty instead of sending `""`

```ts
import { classificationTextSchema } from '@shared/classification';

export const providerProfileSchema = z.object({
  programName: z.string().min(1),                // required; trimmed at the boundary
  summary: classificationTextSchema.required(),  // reuse
  notes: z.string().max(500).optional(),         // optional → absent, never ""
});
export type ProviderProfile = z.infer<typeof providerProfileSchema>;
```

```ts
// or a plain TS type: an internal shape with no validation boundary
export interface ProviderSummary {
  id: string;               // opaque server id, never parsed
  programName: string;      // display name, already trimmed upstream
  dataSourceCount: number;  // 0 when there are none yet, never undefined
  archivedAt?: string;      // ISO instant; absent while active
}
```

---

## CONTRACT

<What this feature exposes to the rest of the app, what it must always do, and how it behaves at
the edges. DATA MODELS says what the data is; this says what the code does with it.>

### Interface Sketch

<Signatures only: component `input()`/`output()`, the services it injects, public service methods, and the endpoint each one calls, route params. Comment what each one guarantees, and why each injected service is needed. No bodies, no implementation.>

### Behavioral Rules

<Numbered statements that must be observably true when the feature is done. One rule per line, each
one something a test can prove.>

### Edge Cases

<The conditions that would degrade the system or make it behave in a way nobody asked for, grouped
under the unit that owns them. Both the UI states (empty, loading, error, denied, in-flight) and the
logic that throws or returns a wrong answer (boundary values, malformed input, an absent optional).>

Write each one as `condition → what must happen`. Every line here becomes a named test.

**Example:**

### Archive a provider: `ArchiveProviderButtonComponent` and `ProviderService`

**Interface Sketch**

```ts
// provider/my-providers/archive-provider-button.component.ts (NEW)
provider = input.required<Provider>();  // the row this button acts on
archived = output<Provider>();          // emits after a successful archive, so the parent can undo
readonly #providerService = inject(ProviderService);  // owns `providers`, the list this mutates
readonly #promptService = inject(PromptService);      // @shared/prompt, owns the confirm dialog

// provider/provider.service.ts (EXISTING service, one new method)
archive(providerId: string): Observable<Provider>;  // POST {providerServiceUrl}/{id}/archive
// emits the archived provider and drops it from `providers` the way delete() does
```

**Behavioral Rules**

1. Archiving confirms through `PromptService` first, and a cancelled prompt calls nothing.
2. The row leaves the table only after the server confirms, never optimistically.
3. A failed archive leaves the row in place and reports the error through the snack bar.

**Edge Cases**

`ArchiveProviderButtonComponent`:
- archive while the list is still loading → the button is disabled

`ProviderService.archive`:
- already archived by someone else (404) → treat as success, drop the row
- `providers` still null because the resource has not loaded → the drop is a no-op, never a throw
- two archives in flight on different rows → each settles on its own

---

## IMPLEMENTATION PLAN

Phases run **top to bottom by default** — each assumes the phase above it is done. Where that is NOT the true dependency, make it explicit with a `**Depends on:**` line under the phase header, and a `**Independent of:**` line where two phases don't block each other. Independent phases are candidates to run in **parallel** (e.g. separate worktrees / parallel loops). Only annotate where it changes execution order or unlocks parallelism — skip the obvious sequential case.

### Key design decisions

<The choices that shaped this plan and the reason each one won, one line each. A decision settled at
the Decision Gate belongs here as a fact, never as an option. This is where a reviewer disagrees
with the approach, before any code exists.>

### Phases

<The phases this feature actually has. Title each one with the work it delivers, not a generic
label: "Phase 1: Foundation (schema, service method, dialog)". Under it, the order the pieces land
in and why, saying which dependencies are hard and which are only convenient.>

Sketch an algorithm in pseudocode under the phase that owns it when there is one the CONTRACT cannot
express: the loop, the branches, where the transaction or state update happens. Sketch it, do not
write it. If the implementer could paste it and be done, back off.

**Example:**

### Key design decisions

- Archive is a soft delete on the server, not a client-side filter: the list must still be correct
  after a reload, and only the server knows that state.
- The confirm step reuses `PromptService` instead of a new dialog, so archive and delete ask alike.
- `ArchiveProviderButtonComponent` owns the confirm and the call, so `my-providers` stays a table.

### Phase 1: The service method (`ProviderService.archive`)

Lands with its tests first: the component has nothing to call until it exists.

### Phase 2: The button (`ArchiveProviderButtonComponent`)

**Depends on:** Phase 1.

Build the component, wire the prompt, then render it in the `my-providers` row. No algorithm
sketch: the CONTRACT's rules and edge cases already specify the whole flow.

---

## STEP-BY-STEP TASKS

Execute in order, top to bottom. Each task is atomic and independently testable. Every task carries
the finding it needs — read the files it names and do what it says; you should not have to go
discover anything.

Group tasks under `### Phase N` headers when the work spans slices or stages.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

### {ACTION} {target_file}

Open the title with the action keyword, then a few terse bullets saying exactly what changes.
Reach for the heavier fields below only when the task earns it — most tasks need just the change
bullets and a VALIDATE:

- **CONTRACT** — the exact signature/type/behavior this unit must expose, when it isn't already
  pinned by a top-level CONTRACT or a synced schema.
- **PATTERN** — the existing code to mirror, `file:line`.
- **IMPORTS** — the exact imports, when non-obvious.
- **EDGE CASES** — the paths this task must handle, when it owns any.
- **GOTCHA** — a known constraint that would trip the executor (framework behavior, ordering, a
  type quirk).
- **VALIDATE** — `{executable command}` proving this one task is done. Always include it.
- **SATISFIES** — which acceptance criterion this advances (e.g. AC #2), so every task traces to one.

<Continue with all tasks in dependency order...>

---

## TESTING STRATEGY

<Define testing approach based on project's test framework and patterns discovered during research>

### Unit Tests

<Scope and requirements based on project standards>

Design unit tests with fixtures and assertions following existing testing approaches

### Integration Tests

<Scope and requirements based on project standards>

### Edge Cases

The CONTRACT's Edge Cases list is the checklist. Every line there gets a named test.

---

## VALIDATION COMMANDS

<Define validation commands based on project's tools discovered in Phase 2>

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

<Project-specific linting and formatting commands>

### Level 2: Unit Tests

<Project-specific unit test commands>

### Level 3: Integration Tests

<Project-specific integration test commands>

### Level 4: Manual Validation

<Feature-specific manual testing steps - API calls, UI testing, etc.>

Cover every state branch the feature renders, not only the happy one: empty, loading, error,
denied. For a UI change, check keyboard focus and run an accessibility pass on the changed view.

### Level 5: Additional Validation (Optional)

<MCP servers or additional CLI tools if available>

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

<Additional context, design decisions, trade-offs>
````

## Output Format

**Filename**: `.agents/plans/{kebab-case-descriptive-name}.md`

- Replace `{kebab-case-descriptive-name}` with short, descriptive feature name
- Examples: `add-user-authentication.md`, `implement-search-api.md`, `refactor-database-layer.md`

**Directory**: Create `.agents/plans/` if it doesn't exist

## Quality Criteria

### Context Completeness ✓

- [ ] All necessary patterns identified and documented
- [ ] External library usage documented with links
- [ ] Integration points clearly mapped
- [ ] Gotchas and anti-patterns captured
- [ ] Every task has executable validation command

### Implementation Ready ✓

- [ ] Another developer could execute without additional context
- [ ] Tasks ordered by dependency (can execute top-to-bottom)
- [ ] Each task is atomic and independently testable
- [ ] Pattern references include specific file:line numbers

### Pattern Consistency ✓

- [ ] Tasks follow existing codebase conventions
- [ ] New patterns justified with clear rationale
- [ ] No reinvention of existing patterns or utils
- [ ] Testing approach matches project standards

### Information Density ✓

- [ ] No generic references (all specific and actionable)
- [ ] URLs include section anchors when applicable
- [ ] Task descriptions use codebase keywords
- [ ] Validation commands are non interactive executable

### Decisions Settled ✓

- [ ] The Decision Gate (Phase 3.5) ran: every open question was resolved with the user or
      verified from the code
- [ ] Each settled decision is stated in the plan as a fact with its chosen mechanism
- [ ] No plan section hands the executor an option list or an unanswered question

## Success Metrics

**One-Pass Implementation**: Execution agent can complete feature without additional research or clarification

**Validation Complete**: Every task has at least one working validation command

**Context Rich**: The Plan passes "No Prior Knowledge Test" - someone unfamiliar with codebase can implement using only Plan content

**Confidence Score**: #/10 that execution will succeed on first attempt

## Report

After creating the Plan, provide:

- Summary of feature and approach
- The decisions settled at the Decision Gate and what was chosen for each
- Full path to created Plan file
- Complexity assessment
- Key implementation risks or considerations
- Estimated confidence score for one-pass success