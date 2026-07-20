---
name: task-doc
description: Use when about to create brief.md, exploration.md, research.md, plan.md, todo.md, or validation.md under docs/tasks/<feature-slug>/ for a Movux feature — scaffolds the file from the matching template instead of writing structure from scratch.
metadata:
  adapted-from: copa-bolao-web-app/.claude/skills/task-doc
---

# Task doc scaffold (Movux)

Movux's task-doc convention already lives in [`CLAUDE.md`](../../CLAUDE.md)
("Task documentation (MANDATORY per feature)") — this skill doesn't repeat
those rules, it just points each phase file at its template so structure
stays consistent across `docs/tasks/*/`.

**Don't write any of these files before their phase is reached.** Same rule
as CLAUDE.md: brief → exploration → research → plan/todo → validation, one
gate at a time, no questions/TBDs inside the docs (ask in chat).

## Folder

`docs/tasks/<feature-slug>/` — kebab-case, matching the ROADMAP.md task ID
pattern already used in this repo (e.g. `s7-t1-plan-seed`,
`s8-<slug>` for UI features). Create the folder on Phase 0, not before.

## File → template mapping

| File | Phase | Template |
|---|---|---|
| `brief.md` | 0 | [`docs/_templates/task-brief-template.md`](../../docs/_templates/task-brief-template.md) |
| `exploration.md` | 1 | [`docs/_templates/phase-template.md`](../../docs/_templates/phase-template.md) (EXPLORATION section) |
| `research.md` | 2 | [`docs/_templates/phase-template.md`](../../docs/_templates/phase-template.md) (RESEARCH section) |
| `plan.md` | 3 | [`docs/_templates/phase-template.md`](../../docs/_templates/phase-template.md) (PLANNING section) |
| `todo.md` | 3 | [`docs/_templates/todo-template.md`](../../docs/_templates/todo-template.md) |
| `validation.md` | 5 | [`docs/_templates/validation-template.md`](../../docs/_templates/validation-template.md) |

Some existing task folders also carry a `qa-roteiro.md` (e.g.
`docs/tasks/s4-t1-review-api/`) for the Phase 5 chat QA script — there's no
dedicated template for it yet; follow the shape of an existing one if the
feature needs it.

## How to scaffold

1. Copy the mapped template's content into the new file.
2. Fill in `<placeholders>` with real content for this feature — never leave
   a placeholder or a question in the file (CLAUDE.md anti-pattern list).
3. For `exploration.md`/`research.md`/`plan.md`, the `phase-template.md` is
   generic across all three phases — swap the `## [Phase-Specific Section]`
   comment block for the section names listed for that phase (Current
   Architecture/Key Findings for exploration, Technical Analysis/Edge
   Cases/Decision Log for research, Architecture Overview/Module
   Specs/Sub-steps for plan).
4. Do not create files for phases not yet reached, even to "get ahead" —
   CLAUDE.md's phase gates require explicit user approval before starting
   the next phase.
