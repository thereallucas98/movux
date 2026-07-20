# S3-T3 — Exploration

## Current code state

- `DeliveryConfirmation` model already exists (S0-T1): `id`, `shipmentId` (unique), `customerId`, `confirmed`, `issueDescription`, `confirmedAt` (defaults `now()`). Never consumed by any use-case or route.
- `markDelivered` (S3-T2, already shipped) only calls `shipmentRepo.updateStatus(shipmentId, 'DELIVERED')` — **no timestamp is recorded for when the transition happened.**
- `Shipment` has no `deliveredAt` (or any per-status timestamp) field. The generic `updatedAt` (`@updatedAt`) changes on *any* write to the row, so it can't safely stand in for "when did this become DELIVERED" — a future write to the shipment for an unrelated reason would silently reset the 24h clock.
- No `DeliveryConfirmationRepository` exists yet.

## Key files (patterns to mirror)

- `server/use-cases/shipments/proposals/sweep-expired-proposals.ts` — the project's only precedent for a "lazy" time-based transition. Notably, it works because **`Proposal.expiresAt` is a field stored directly on the row being swept** (set at creation/each attempt) — the sweep just compares `expiresAt < now()`. There is no equivalent deadline field for delivery confirmation today.
- `server/use-cases/shipments/safety/resolve-safety-participant.ts` (S3-T1) — the `GET /delivery-confirmation` endpoint needs the exact same predicate ("customer owner OR selected carrier"), unlike S3-T2 where a carrier-only helper was intentionally kept separate. Candidate for direct reuse this time, since the shape (`{status, role}`) is not carrier-specific here — decided at Plan, not a Research-level architecture question.
- `server/repositories/proposal.repository.ts` — `findAcceptedByShipment` already resolves the selected carrier, reusable as-is for the `GET` access check.

## Integration points / gaps found

1. **No reliable "became DELIVERED at" timestamp.** This blocks the 24h auto-confirm rule as literally stated in the brief ("24h depois que o shipment virou DELIVERED"). Needs a decision before Plan — see Research.
2. **`DeliveryConfirmationRepository` needs to be created** — no existing file to extend, unlike S3-T2 which reused everything from S3-T1.

## Risks

- Whatever the deadline source ends up being, getting it wrong either lets customers get auto-confirmed too early (before they've had a real chance to inspect the delivery) or never auto-confirms at all (defeating the point of the rule) — this is the one part of the task worth being careful about; the confirm/reject CRUD itself is low-risk and follows established patterns exactly.
