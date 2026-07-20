# S3-T2 — Exploration

## Current code state

- `ShipmentStatus` enum already has `COLLECTED`, `IN_TRANSIT`, `DELIVERED` (from S0-T1) — no schema change needed.
- `shipmentRepository.findStatusById(id)` and `shipmentRepository.updateStatus(id, status)` already exist and are generic enough to reuse as-is (no new repo methods needed on `ShipmentRepository`).
- `proposalRepository.findAcceptedByShipment(shipmentId)` (added in S3-T1) already resolves `{ carrierId }` for the accepted proposal — the same lookup S3-T2 needs to verify "is this caller the selected carrier."
- `safetyCheckInRepository.findByShipment(shipmentId)` (added in S3-T1) returns all check-in rows for a shipment — enough to check "both roles confirmed" by filtering for `role === 'CUSTOMER'`/`'CARRIER'`.
- No route, use-case, or error code for `collect`/`transit`/`deliver` exists yet.

## Key files (patterns to mirror)

- `server/use-cases/shipments/safety/resolve-safety-participant.ts` (S3-T1) — same "resolve selected carrier via accepted proposal" logic needed here, but S3-T2 only ever deals with the `CARRIER` side (no customer action in this task) and doesn't need to return a `role`. Reusing the safety-specific helper as-is would leak an irrelevant `role` field into an unrelated domain — a small dedicated resolver (2-3 lines) is more honest here than stretching the S3-T1 helper to fit.
- `app/api/shipments/[shipmentId]/queue/join/route.ts` — single-role route pattern (`principal.role !== 'CARRIER'` gate) to mirror for all 3 new routes (unlike S3-T1's dual-role routes, these are carrier-only).
- `server/http/error-response.ts` / `server/graphql/errors.ts` — need one new code, `SAFETY_NOT_CONFIRMED` (409), following the `ALREADY_CONFIRMED` pattern just added in S3-T1.
- `server/schemas/shipment.schema.ts` — `ShipmentIdParamSchema` already covers all 3 routes, no new schema needed.

## Integration points

- The 3 use-cases are nearly identical: resolve carrier → check exact prior status → (only for collect) check both safety check-ins → `updateStatus`. Given the 3-way repetition is real but each has a different status pair and `/collect` has an extra check, following the project's existing convention (S2-T4 also has near-duplicate `accept`/`reject` use-cases, not merged into one parameterized function) — keep them as 3 separate small files rather than one generic "transition" function. Matches `CLAUDE.md`'s "single responsibility per function" and avoids a premature abstraction for 3 call sites.

## Risks

- None significant — this task is low-complexity, reusing every repo method that already exists. Main thing to get right is the `/collect` safety-check-in gate (must check *both* roles present, not just one).
