---
name: deploy-checklist
description: Use before marking any Movux execution complete, or when the user asks to validate/prepare a commit — runs pnpm lint and pnpm build for real and points at the parts of the sprint deploy checklist that can't be checked mechanically.
metadata:
  adapted-from: copa-bolao-web-app/.claude/skills/deploy-checklist
---

# Deploy checklist (Movux)

CLAUDE.md already states the gate: *"Validation before marking execution
complete: `pnpm lint` (0 warnings), `pnpm build` (must succeed)."* This
skill is the run-it-for-real step, plus [`docs/ROADMAP.md`](../../docs/ROADMAP.md)'s
own **"Deploy checklist (por sprint)"** section for what happens after code
is green — don't duplicate either list, just execute against them.

## 1. Confirm directory

`pwd` — commands below assume repo root (`pnpm lint`/`pnpm build` are root
`turbo` scripts filtered to `web`, see `package.json`). Running them from
inside `apps/web/` directly also works but changes which lockfile/cache
turbo resolves against — prefer root.

## 2. Run the gate

```bash
pnpm lint    # turbo run lint --filter=web — tsc --noEmit + ESLint, max-warnings 0
pnpm build   # turbo run build --filter=web — prisma generate + next build
```

Both must exit 0. Report actual output, not "should pass" — if either
fails, that's the next thing to fix, not something to route around.

## 3. If `apps/web/prisma/schema.prisma` changed

`pnpm build` already runs `prisma generate`, but a schema change also needs
a migration:

```bash
cd apps/web && pnpm db:migrate
```

Only run this if the user has asked to apply the migration — CLAUDE.md's
"never run git commands unless explicitly asked" spirit extends to schema
migrations against the shared dev DB (`docker exec movux-postgres …` is
fine to inspect, riskier to migrate without asking).

## 4. Sprint-level checklist (not mechanically checkable here)

Once `lint`/`build` are green, `docs/ROADMAP.md`'s per-sprint checklist has
items that need the user's action or manual verification outside this
session — surface them, don't silently skip:

- Insomnia collection updated/exported (`docs/insomnia/`)
- Swagger reachable at `/api-docs`
- Migration applied on Supabase (production)
- Manual smoke test of the sprint's critical endpoints

## 5. Done

All green → this is validation only, same as copa-bolao's version. It does
**not** commit, push, or deploy — that only happens on the user's explicit
go-ahead, following whatever git workflow the user has asked for in this
session.
