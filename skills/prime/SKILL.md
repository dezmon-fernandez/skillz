---
name: prime
description: >-
  Load project context at the start of a session by reading the file list, the docs, and
  the recent history. Also read and delete a pending .agents/handover.md if one exists.
  Use when asked to "prime", "get up to speed", or at the start of a resumed session.
---

# Prime: Load Project Context

## Objective

Build comprehensive understanding of the codebase by analyzing structure, documentation, and key files.
The developer reads the report and works from it. A wrong or stale picture misleads the whole session.

## Process

### 0. Consume a pending handover

A previous session may have left `.agents/handover.md`. It holds live state for whoever
resumes, in six sections: Task, Done, Where we left off, Constraints, Facts, Explore.

Its contents:

!`cat .agents/handover.md 2>/dev/null || echo "(no pending handover)"`

If that printed `(no pending handover)`, skip to step 1. Otherwise:

1. **Constraints apply now.** They apply to prime's own reads in the steps below, not only
   to the work after. If the handover says not to read a file, do not read it during
   priming. If it says consent was not granted, it is not granted.
2. **Task sets the scope for the rest of priming.** Steps 1 through 3 read what the Task's
   first step needs. Leave the rest of the codebase for the moment it matters.
3. **Facts marked assumed stay assumed** until this session checks them. Verify a claim
   before any action that spends credits, writes to production, or cannot be undone.
   A handover records one moment, and the code may have changed since.
4. **Delete the file before continuing.** If it is tracked or staged, run
   `git rm --cached .agents/handover.md` first. Then remove it from disk. Left in place,
   it is read by a later session as though it were still current. It is also overwritten
   by the next run of the `/handover` skill that produced it.
5. Carry what it says into the report. The "Where we left off" section at the end is
   written from it.

### 1. Analyze Project Structure

All tracked files:
!`git ls-files`

### 2. Read Core Documentation

- **Read the PRD (`.agents/PRD.md`). It is the project's source of truth** (vision, MVP scope, architecture, success criteria, risks). If it's missing, note that the developer should run `/create-prd`.
- Read CLAUDE.md or similar global rules file
- Read README files at project root and major directories
- Read any architecture documentation

**The documentation map lives in CLAUDE.md** ("Documentation map"). Read now the rows
whose trigger matches the pending work. Leave the rest until the work reaches them.

### 3. Identify Key Files

Based on the structure, identify and read:
- Main entry points (main.py, index.ts, app.py, etc.)
- Core configuration files (pyproject.toml, package.json, tsconfig.json)
- Key model/schema definitions
- Important service or controller files

### 4. Understand Current State

Recent activity:
!`git log -10 --oneline`

Current branch and working-tree state:
!`git status`

If a handover was read, compare this against the repo state it recorded under "Where we
left off". Any difference means work happened after the handover was written. Report it,
and trust the repo over the handover.

## Output Report

Provide a concise summary covering:

### Project Overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Important directories and their purposes

### Tech Stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Core Principles
- Code style and conventions observed
- Documentation standards
- Testing approach

### Current State
- Active branch
- Recent changes or development focus
- Any immediate observations or concerns

**Make the sections above easy to scan. Use bullet points and clear headers.**

### Where we left off
Include this section only when step 0 read a handover. Otherwise end the report above.

Brief the developer in two parts, both drawn from the handover.

First the story: one paragraph drawn from Task, Done, and Where we left off. Say what is
being built, why, and where it stands. Write it so someone returning after a day away
understands it without opening a file.

Then confirm you and the developer see the same picture:

- **Constraints:** the handover's Constraints, quoted word for word. Add any consent it
  says must be asked for again.
- **What we know:** the handover's Facts. Give verified ones with their check, flag
  assumed ones, and state disproven ones as disproven. List anything left running that
  must be stopped.
- **Next task(s):** the Task's first step, then what Where we left off says moves it
  forward.
- **Open decisions:** the Explore section. List research directions and what each
  settles. Give referenced material by its exact path or URL (open it directly, don't
  work it out again). List the calls only the developer can make, and what each unblocks.

Current State describes the repository as it stands. This section describes the work in
progress.
