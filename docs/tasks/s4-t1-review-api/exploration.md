# S4-T1 — Exploration

## Current code state

- `Review`, `ReviewTag`, `ReviewTagSelection` models exist (S0-T1), never consumed. `Review` has `@@unique([shipmentId, reviewerRole])` and `rating` as plain `Int` (no DB-level `CHECK 1-5` in the Prisma schema — the range constraint from `DATABASE-DESIGN.md §10.1` is only enforced at the use-case/Zod layer, matching the project's established pattern of application-level validation over DB constraints for range checks).
- `ReviewTag` table is empty — its seed is explicitly S4-T3 (`ReviewTag` model comment: "seeded in S4-T3"), a task scheduled *after* this one. Tag-selection validation logic can be built and tested, but QA needs 1-2 rows inserted manually via SQL until S4-T3 exists (same operational pattern used earlier in the project for manual DB state).
- No `ReviewRepository` or `ReviewTagRepository` exists yet.

## Key files (patterns to mirror)

- `server/use-cases/shipments/safety/resolve-safety-participant.ts` — reusable again (4th reuse after S3-T1's own route, S3-T3's `GET /delivery-confirmation`, S3-T4's `GET /events`) for the "customer owner or selected carrier" access check on both endpoints.
- `server/repositories/proposal.repository.ts` — `findAcceptedByShipment(shipmentId)` returns `{ carrierId }`, which is already a `User.id` (confirmed in S3-T2) — directly usable as `revieweeId` when the customer reviews the carrier.
- **Gap found:** the reverse direction (carrier reviewing the customer) needs the customer's `User.id` as `revieweeId`, but `Shipment.customerId` is a `CustomerProfile.id`, not a `User.id`. `CustomerProfileRepository` only has `findByUserId` (forward direction) — needs a new `findUserIdById(customerProfileId): Promise<{ userId: string } | null>`.
- `shipmentRepo.updateStatus(id, status)` (generic, already used for the `OPEN → PROPOSALS_RECEIVED` transition in S2-T4) — reusable as-is for the `DELIVERED → REVIEWED` transition; no extra timestamp needed (`DATABASE-DESIGN.md` doesn't define a `reviewedAt` field, unlike the S3-T3 precedent).

## Integration points / gaps found

1. **Reviewee resolution asymmetry** — customer→carrier direction reuses an existing repo method; carrier→customer direction needs one new method (`findUserIdById` on `CustomerProfileRepository`).
2. **Three-way contradiction on the review eligibility gate** (already flagged in `brief.md`, needs Research decision): `§10.1` says `status = REVIEWED`, `§12` says `status = DELIVERED` (confirmed), the lifecycle diagram implies `REVIEWED` is the *outcome* of both reviews, not a precondition.
3. **When does `Shipment.status` become `REVIEWED`?** Not explicit anywhere — needs a decision, mirroring the `SAFETY_CONFIRMED` precedent from S3-T4 (fires once, on the review that completes the pair) versus firing after either single review.

## Risks

- Getting the reviewee-resolution direction wrong (customer accidentally reviewing themselves, or a stale/wrong carrier id) would corrupt rating data permanently once S4-T2 starts aggregating it — worth explicit QA coverage confirming `revieweeId` on both directions.
- Since `ReviewTag` is empty until S4-T3, tag-validation logic (reject tags with wrong `targetRole` or nonexistent id) needs to be exercised with manually-seeded rows during this task's QA, not skipped.
