# S3-T1 — Research

## Decision Log

### Duplicate safety-term fields on `Shipment`

**Decision:** Ideal — implement on `SafetyCheckIn`, remove `Shipment.safetyTermCustomerAt`/`safetyTermCarrierAt` from `prisma/schema.prisma` (migration) and from `DATABASE-DESIGN.md §6.1`.

**Reason:** the fields are confirmed dead (zero usages in `src/`), duplicate exactly what `SafetyCheckIn` already models, and `SafetyCheckIn` is the more complete mechanism (DB-level unique constraint per role, `ipAddress` for legal record). Removing now is cheap — no code depends on them — and keeps schema/doc from silently diverging.

## Technical Analysis

- **Role resolution:** the route accepts both `CUSTOMER` and `CARRIER` principals (unlike single-role routes like `queue/join`). The use-case branches on `principal.role`:
  - `CUSTOMER` → resolve `customerProfileRepo.findByUserId(userId)`, then `shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)` (existing method, returns `null` if not owner — reused as-is).
  - `CARRIER` → `shipmentRepo.findStatusById(shipmentId)` for status, then `proposalRepo.findAcceptedByShipment(shipmentId)` (new method) and compare `carrierId === userId`.
  - Any other role (`ADMIN`) → `FORBIDDEN` at the route level, same as other shipment-participant routes.
- **New repo method:** `ProposalRepository.findAcceptedByShipment(shipmentId): Promise<{ carrierId: string } | null>` — `prisma.proposal.findFirst({ where: { shipmentId, status: 'ACCEPTED' }, select: { carrierId: true } })`.
- **New repo:** `SafetyCheckInRepository` — `create({ shipmentId, userId, role, ipAddress })`, `findByShipment(shipmentId): Promise<SafetyCheckIn[]>` (both rows or fewer, used by both confirm's duplicate-check and the `GET` status endpoint).
- **IP capture:** new small helper `lib/get-client-ip.ts` — reads `x-forwarded-for` (first entry) falling back to `x-real-ip`, returns `string | null`. Best-effort; not a hard dependency (local dev / no proxy → `null`, which the nullable `ipAddress` column already supports).
- **New error code:** `ALREADY_CONFIRMED` → 409, added to `server/http/error-response.ts`'s `ErrorCode` union + `ERROR_MAP`, and to `server/graphql/errors.ts`'s exhaustive `Record<ErrorCode,string>` (must stay in sync per `CLAUDE.md`).
- **Status gate:** both endpoints require `shipment.status === 'CARRIER_SELECTED'`. `GET /safety` uses the same gate for consistency (no reason to expose check-in state outside the window where it matters) — reusing the 409 `INVALID_STATE_TRANSITION` code already established in this domain.

## Edge Cases

| Case | Behavior |
|---|---|
| Caller not authenticated | 401 (route-level `getPrincipal`) |
| Caller role is `ADMIN` | 403 `FORBIDDEN` |
| Caller is `CUSTOMER` but not this shipment's owner | 404 `NOT_FOUND` |
| Caller is `CARRIER` but not the accepted proposal's carrier (e.g. a carrier who was in the queue but lost) | 404 `NOT_FOUND` |
| Shipment doesn't exist | 404 `NOT_FOUND` |
| Shipment exists but status isn't `CARRIER_SELECTED` (too early — `PROPOSALS_RECEIVED`, or too late — already `COLLECTED`) | 409 `INVALID_STATE_TRANSITION` |
| Same role confirms twice | 409 `ALREADY_CONFIRMED` |
| `ipAddress` unavailable (no proxy header, local dev) | stored as `null` — not a failure |
| Only one side has confirmed | `GET /safety` returns that one row + `null` for the other — no error |

## Blockers

✅ No blockers — decision resolved, proceeding to Plan.

## Next Steps

1. Write `plan.md` + `todo.md` (Phase 3).
