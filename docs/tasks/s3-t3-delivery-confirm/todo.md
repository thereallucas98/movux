# S3-T3 — Todo

- [x] Migration — `collectedAt`/`inTransitAt`/`deliveredAt` em `Shipment`
- [x] `shipmentRepository.markCollected` / `markInTransit` / `markDelivered` (dedicados)
- [x] `shipmentRepository.findStatusById` — estender select (`customerId`, `deliveredAt`)
- [x] Retrofit `mark-collected.use-case.ts` (S3-T2) → `shipmentRepo.markCollected`
- [x] Retrofit `mark-in-transit.use-case.ts` (S3-T2) → `shipmentRepo.markInTransit`
- [x] Retrofit `mark-delivered.use-case.ts` (S3-T2) → `shipmentRepo.markDelivered`
- [x] `server/repositories/delivery-confirmation.repository.ts` (novo)
- [x] `server/schemas/delivery-confirmation.schema.ts` (novo)
- [x] `use-cases/shipments/delivery/sweep-auto-confirm-delivery.ts`
- [x] `use-cases/shipments/delivery/confirm-delivery.use-case.ts`
- [x] `use-cases/shipments/delivery/get-delivery-confirmation-status.use-case.ts`
- [x] Registrar `deliveryConfirmationRepository` em `server/repositories/index.ts`
- [x] Registrar use-cases em `server/use-cases/index.ts`
- [x] `app/api/shipments/[shipmentId]/delivery-confirmation/route.ts` — POST + GET
- [x] Swagger — `lib/swagger/definitions/delivery-confirmation.ts` (tag `Delivery Confirmation`)
- [x] `docs/insomnia/s3-t3-delivery-confirm.json`
- [x] QA via curl: confirm true, confirm false sem issue (400), confirm false com issue, confirm 2x (409), GET por carrier não-selecionado (404), fora de DELIVERED (409), auto-confirm após 24h (via SQL)
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T2
