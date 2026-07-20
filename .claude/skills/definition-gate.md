---
name: definition-gate
description: Use when a Movux phase (especially Research, per CLAUDE.md's Fast/Good/Ideal shape) needs a decision from the user before continuing — covers how to ask, not what to ask.
metadata:
  adapted-from: copa-bolao-web-app/.claude/skills/definition-gate
---

# Definition gate (Movux) — how to ask, not what to ask

[`CLAUDE.md`](../../CLAUDE.md) already defines *what* to produce when a
decision is needed: the "Fast / Good / Ideal decision shape" (grounded
options, named tradeoffs, a real recommendation) and the hard-stop rule that
Research → Plan can't advance with an open question. This skill only covers
the *mechanics* of asking, adapted from copa-bolao's `definition-gate` —
that part isn't spelled out in CLAUDE.md today.

## Mechanics

- **Use the `AskUserQuestion` tool**, not a wall of lettered options typed
  into chat prose. This user (see auto-memory) wants to click a choice, not
  type "a/b/c".
- **One question at a time.** If a phase surfaces several open decisions,
  ask them one call at a time (or as separate questions within one call
  only when they're truly independent) — don't dump every open decision on
  the user in one giant list.
- **Always put the recommended option first**, labeled `(Recomendado)` —
  chat is PT-BR (see CLAUDE.md's Language Rules table), so the label is
  user-facing chat text, not code.
- **Explore before asking.** Ground the question in what the code already
  does (file:line evidence) — CLAUDE.md's Fast/Good/Ideal format already
  requires citing repo evidence per option; don't ask something the
  Exploration phase should have already answered.

## After the decision closes

Record it exactly as CLAUDE.md already specifies: resolved item in the
phase doc (never the question itself — see CLAUDE.md's "Doc anti-patterns"
table), and in `docs/decisions.md` if it's a project-level decision rather
than a single feature's scope (format: `Context → Decision → Why`, per the
header of that file).

## What NOT to do

Same anti-patterns CLAUDE.md already forbids in docs (`TBD`, `Open
questions:`, `??? revisit later`) — this skill doesn't repeat that list,
just flags that asking-mechanics violations (typed a/b/c menus, bundling
unrelated decisions into one question, skipping the recommendation) are the
same class of problem even though they happen in chat, not in a doc.
