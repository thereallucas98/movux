# S3-T1 — Exploration

## Current code state

- `SafetyCheckIn` model already exists in `prisma/schema.prisma` (lines 807-820), created in S0-T1, never consumed by any use-case or route yet. Matches `DATABASE-DESIGN.md §9.1` exactly: `id`, `shipmentId`, `userId`, `role` (`ReviewerRole`: `CUSTOMER|CARRIER`), `confirmedAt`, `ipAddress` (nullable `Inet`), `@@unique([shipmentId, role])`.
- `ShipmentEvent.eventType` enum already includes `SAFETY_CONFIRMED` — out of scope here (S3-T4 owns writing to `shipmentEvent`).
- No `SafetyCheckInRepository` exists yet — `server/repositories/` has no file for it.
- No use-case, route, schema, or swagger doc references `safetyCheckIn` anywhere in `src/`.

## Key files (patterns to mirror)

- `server/repositories/proposal-queue.repository.ts` / `proposal.repository.ts` — interface + `createXRepository(prisma)` factory pattern to follow for `SafetyCheckInRepository`.
- `app/api/shipments/[shipmentId]/queue/join/route.ts` and `.../queue/me/route.ts` — thin-route pattern: `getPrincipal` → role gate → `ShipmentIdParamSchema.safeParse` → use-case call → `errorResponse`/`NextResponse.json`. `ShipmentIdParamSchema` already exists in `server/schemas/shipment.schema.ts:87`.
- `server/repositories/index.ts` / `server/use-cases/index.ts` — barrels to register the new repo/use-cases in.
- `server/http/error-response.ts` + `server/graphql/errors.ts` — `ErrorCode` union and matching exhaustive `Record<ErrorCode,string>` must stay in sync (per `CLAUDE.md`); no `ALREADY_CONFIRMED` code exists yet, needs to be added following the `ALREADY_IN_QUEUE`/`ALREADY_PROPOSED` pattern.
- `lib/get-principal.ts` — `getPrincipal(req)` returns `{ userId, role: 'CUSTOMER'|'CARRIER'|'ADMIN' } | null`. This route needs to accept **both** `CUSTOMER` and `CARRIER` (unlike queue/proposal routes, which are single-role) — role branching happens inside the use-case, not a route-level role gate.

## Integration points / gaps found

1. **No `carrierId` denormalized on `Shipment`.** `markCarrierSelected` (S2-T4) only sets `status` and `finalPriceInCents` — it never stored which carrier won. To resolve "is this caller the selected carrier" for `CARRIER_SELECTED` shipments, the only path is `Proposal` where `shipmentId` matches and `status = 'ACCEPTED'`, then compare `proposal.carrierId` to the caller's `userId`. `ProposalRepository` has no method for this yet — needs a new `findAcceptedByShipment(shipmentId): Promise<{ carrierId: string } | null>`.
2. **No IP-extraction helper.** `SafetyCheckIn.ipAddress` is meant to be a legal record (`DATABASE-DESIGN.md §9.1`), but nothing in `lib/` reads `x-forwarded-for`/`x-real-ip` from a `Request` today. Needs a small new helper (route-level, reading standard proxy headers, best-effort/nullable — Vercel and most reverse proxies set `x-forwarded-for`).
3. **Duplicate-looking fields on `Shipment` itself:** `safetyTermCustomerAt` / `safetyTermCarrierAt` (nullable `DateTime`, `DATABASE-DESIGN.md §6.1` lines 534-535) describe essentially the same concept as `SafetyCheckIn` ("term accepted at that moment", per role). Confirmed via repo-wide grep (excluding generated Prisma output): **zero usages** anywhere in `src/` — these fields are currently dead. `SafetyCheckIn` is the more complete mechanism (unique constraint enforced at the DB level, `ipAddress` for legal record, matches this task's title in `ROADMAP.md` verbatim: "customer e carrier confirmam termo"). This looks like leftover duplication from the original schema draft rather than an intentional two-tier design — needs a decision before Plan (see Research).

## Risks

- Role-branching logic (customer-owner vs. selected-carrier) lives entirely in the use-case; getting the "who is the carrier" lookup wrong would let an unrelated carrier confirm on someone else's shipment — needs explicit QA coverage for the negative case (carrier not selected → 404).
- If the dead `safetyTermCustomerAt`/`safetyTermCarrierAt` fields are left as-is, future readers of the schema may reasonably assume they're the live mechanism and build against them by mistake.
