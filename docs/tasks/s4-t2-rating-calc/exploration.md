# S4-T2 — Exploration

## Current code state

- No `CarrierProfileRepository` exists anywhere in `server/repositories/` — needs creating from scratch.
- `CustomerProfileRepository` exists but only has `findByUserId` and `findUserIdById` (both added in S4-T1) — no update method yet.
- Confirmed via schema comment (`prisma/schema.prisma:341-343`) that `isActive = false` is the literal implementation of "auto-suspend" for `avgRating < 3.5` — not ambiguous.
- Confirmed via repo-wide grep: **no admin-flag field, table, or mechanism exists anywhere** in the schema for the `avgRating < 4.0` rule from `DATABASE-DESIGN.md §12`. Needs a Research decision (see below).
- `Review.revieweeId` is already a `User.id` (both directions — confirmed in S4-T1's QA, `revieweeId` values matched the other party's `userId` exactly).

## Key simplification found

`submitReview` (the use-case being retrofitted) **already knows the reviewer's role** (`participant.role`) at the point where the review is created — and since a review always goes in exactly one direction, the reviewee's "side" is simply the opposite:
- `participant.role === 'CUSTOMER'` → the review*ee* is the carrier → update `CarrierProfile`
- `participant.role === 'CARRIER'` → the review*ee* is the customer → update `CustomerProfile`

No extra lookup of `revieweeId`'s role is needed (no query against `User.role`) — this is simpler than a generic "recalculate whoever `revieweeId` is" design would suggest.

## Key files (patterns to mirror)

- `server/repositories/customer-profile.repository.ts` — shape to mirror for the new `CarrierProfileRepository`.
- `server/use-cases/shipments/reviews/submit-review.use-case.ts` (S4-T1) — the single retrofit point; insertion after `reviewRepo.create(...)`, alongside the existing `REVIEWED` transition check.
- Both `CustomerProfile.userId` and `CarrierProfile.userId` are `@unique` — Prisma `update({ where: { userId }, ... })` works directly, no need to resolve to the profile's own `id` first.

## Integration points

- **Aggregation:** `prisma.review.aggregate({ where: { revieweeId }, _avg: { rating: true } })` — one query gets the new average directly from all historical reviews for that user (no need to fetch and average in application code).
- Only 1 use-case touched (`submit-review.use-case.ts`) — much narrower blast radius than S3-T4's event-log retrofit; no shared-helper cascade risk like `refillCalledGroup` had.

## Open question for Research

**"Admin flag" for `avgRating < 4.0`** — no field/table/notification mechanism exists in the schema today to represent this. Options span from silently skipping it (documented gap, like `CARRIER_CALLED` in S3-T4) to inventing new schema just for a flag with no consumer yet (no admin dashboard exists — that's Sprint 5+). Needs a Fast/Good/Ideal decision in chat before Plan.

## Risks

- None significant for the `isActive` auto-suspend path — it's a direct, well-specified rule. The only risk is scope creep on the "admin flag" question if not bounded clearly in Research.
