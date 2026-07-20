# S3-T4 — Todo

- [x] `server/repositories/shipment-event.repository.ts` (novo)
- [x] Registrar `shipmentEventRepository` em `server/repositories/index.ts`
- [x] Retrofit `publish-shipment.use-case.ts` → `PUBLISHED`
- [x] Retrofit `submit-proposal.use-case.ts` → `PROPOSAL_RECEIVED`
- [x] Retrofit `accept-proposal.use-case.ts` → `CARRIER_SELECTED`
- [x] Retrofit `confirm-safety-check-in.use-case.ts` → `SAFETY_CONFIRMED` (condicional)
- [x] Retrofit `mark-collected.use-case.ts` → `COLLECTED`
- [x] Retrofit `mark-in-transit.use-case.ts` → `IN_TRANSIT`
- [x] Retrofit `mark-delivered.use-case.ts` → `DELIVERED`
- [x] Retrofit das 7 rotas correspondentes (passar `shipmentEventRepository`)
- [x] `use-cases/shipments/get-shipment-events.use-case.ts`
- [x] Registrar em `server/use-cases/index.ts`
- [x] `app/api/shipments/[shipmentId]/events/route.ts` — GET
- [x] Swagger — `lib/swagger/definitions/shipment-events.ts` (tag `Shipment Events`)
- [x] `docs/insomnia/s3-t4-event-log.json`
- [x] QA via curl: fluxo completo com os 7 eventos na ordem certa, `SAFETY_CONFIRMED` 1x só, 404 pra não-participante, lista vazia em `DRAFT`
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T3
