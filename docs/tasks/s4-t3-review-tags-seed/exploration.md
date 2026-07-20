# S4-T3 — Exploration

## Current code state

- `prisma/seed/geography.ts` and `prisma/seed/pricing.ts` establish the seed script pattern: array of typed seed objects → `prisma.X.upsert({ where: { <unique field> }, create, update })` per row → `main()` invoked with `.catch(() => process.exit(1)).finally(() => prisma.$disconnect())` → registered in `package.json#db:seed`, chained with `&&` after the existing seeds.
- Current `reviewTag` table state (from S4-T1's manual QA seeding): `CAREFUL_WITH_ITEMS` (`CARRIER`), `PUNCTUAL` (`CUSTOMER`) — 2 rows, will be absorbed by this task's `upsert` (same `code`, same `targetRole`, values match what the real seed will write).
- Confirmed via repo-wide grep: **`ReviewTag.code` is never referenced by string literal anywhere in application logic** (`review.repository.ts`, `review-tag.repository.ts`, `submit-review.use-case.ts` all operate on tag `id`, never `code`). It's a seed-time/display identifier only — no business logic depends on its exact value.

## Conflict — resolving the `PUNCTUAL` collision

Two ways to make both `PUNCTUAL` tags (carrier + customer) coexist:

1. **Rename the `code` values** (e.g. `PUNCTUAL_CARRIER` / `PUNCTUAL_CUSTOMER`) — no schema change, no migration. Both can still show the same PT-BR `label` ("Pontual") to end users since `code` is never displayed.
2. **Change the schema constraint** from `code @unique` to `@@unique([code, targetRole])` — lets the literal string `PUNCTUAL` be reused across roles, matching `DATABASE-DESIGN.md §10.2`'s list more literally. Requires a migration (drop single-column unique index, add composite).

Since `code` has no other consumer and is purely internal, option 1 achieves the same practical outcome (both "Pontual" tags exist, one per role) with zero schema risk. Decision needed in Research.

## Risks

- None significant — this is the smallest task in the sprint so far (1 new file, 1 `package.json` line, no use-case/route changes).
