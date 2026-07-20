# S3-T4 — Exploration

## Current code state

- `ShipmentEvent` model exists (S0-T1), never consumed: `id`, `shipmentId`, `eventType` (`EventType` enum, 11 values), `triggeredBy` (nullable FK → `User`), `occurredAt` (`@default(now())`), `metadata` (`Json?`).
- No `ShipmentEventRepository` exists yet.
- Confirmed (grep): no cancel-shipment or expire-shipment use-case exists anywhere — only `sweepExpiredProposals`, which expires `Proposal` rows, a different entity. `WINDOW_ALERT`/`CANCELLED`/`EXPIRED` have zero producers, matching the brief's scoping.

## Retrofit insertion points (read each use-case's actual current code)

| `eventType` | File | Insertion point | `triggeredBy` | Notes |
|---|---|---|---|---|
| `PUBLISHED` | `shipments/publish-shipment.use-case.ts` | after `updateStatus(id, 'OPEN')` | `userId` (customer) | single call, straightforward |
| `CARRIER_CALLED` | `shipments/queue/refill-called-group.ts` | after `markManyCalled(...)`, once per entry in `nextWaiting` | `null` (system) | `refillCalledGroup` can call multiple carriers in one invocation (up to 3 slots) — needs one event per queue entry, not one per call |
| `PROPOSAL_RECEIVED` | `shipments/proposals/submit-proposal.use-case.ts` | after `proposalRepo.create(...)` | `carrierId` | `metadata: { proposalId }` optional |
| `CARRIER_SELECTED` | `shipments/proposals/accept-proposal.use-case.ts` | after `markCarrierSelected(...)` | `userId` (customer) | |
| `SAFETY_CONFIRMED` | `shipments/safety/confirm-safety-check-in.use-case.ts` | **ambiguous — see Research** | **ambiguous** | event name is singular ("confirmed", not "confirmed by X") — could mean "this role confirmed" (fires twice) or "both roles have now confirmed" (fires once, on the 2nd call) |
| `COLLECTED` | `shipments/transit/mark-collected.use-case.ts` | after `shipmentRepo.markCollected(...)` | `userId` (carrier) | |
| `IN_TRANSIT` | `shipments/transit/mark-in-transit.use-case.ts` | after `shipmentRepo.markInTransit(...)` | `userId` (carrier) | |
| `DELIVERED` | `shipments/transit/mark-delivered.use-case.ts` | after `shipmentRepo.markDelivered(...)` | `userId` (carrier) | **overlap with S3-T3 — see Research**: does the 24h auto-confirm sweep (`sweep-auto-confirm-delivery.ts`) also write a `DELIVERED` event, or does `DeliveryConfirmation`'s own `confirmedAt` already serve as that record? |

## Key files (patterns to mirror)

- `server/repositories/safety-check-in.repository.ts` — closest shape precedent for a new `ShipmentEventRepository` (`create`, `findByShipment`).
- `server/use-cases/shipments/safety/resolve-safety-participant.ts` — reusable as-is for the `GET /events` access check (same "customer owner or selected carrier" predicate, third reuse after S3-T1's own `GET /safety` and S3-T3's `GET /delivery-confirmation`).
- `server/use-cases/shipments/proposals/list-proposals-for-shipment.use-case.ts` — pattern for a simple "resolve access → list" read use-case.

## Integration points

- 8 already-shipped, already-QA'd use-cases across 5 commits (S1-T3, S2-T1, S2-T2, S2-T4, S3-T1, S3-T2 ×3) need a one-line-ish addition each. None of their existing signatures, return types, or error codes change — purely additive (a `shipmentEventRepo` added to each use-case's `repos` param object, one `.create(...)` call at the end of the success path).
- `refillCalledGroup` is called from 3 different places (`join-proposal-queue`, `withdraw-proposal` — not in the brief's scope table, wait: check — and `submit-proposal`/`reject-proposal`). Since the event-logging call lives *inside* `refillCalledGroup` itself (not duplicated at each call site), this is actually the simplest insertion point in the whole retrofit — one change covers every caller.

## Risks

- Missing an insertion point silently produces an incomplete audit trail (no error, just a gap) — since this is a retrofit across many files, worth double-checking each of the 8 during Execution against this table rather than trusting memory.
- The two ambiguous cases (`SAFETY_CONFIRMED` timing, `DELIVERED` double-logging) need to be resolved before Plan — both affect what "correct" QA output looks like.
