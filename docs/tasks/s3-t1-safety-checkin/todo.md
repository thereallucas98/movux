# S3-T1 — Todo

- [x] Migration — remover `safetyTermCustomerAt`/`safetyTermCarrierAt` de `prisma/schema.prisma`
- [x] Atualizar `docs/DATABASE-DESIGN.md §6.1` (remover as 2 linhas)
- [x] `proposalRepository.findAcceptedByShipment`
- [x] `server/repositories/safety-check-in.repository.ts` (novo)
- [x] `lib/get-client-ip.ts` (novo)
- [x] `ALREADY_CONFIRMED` em `server/http/error-response.ts`
- [x] `ALREADY_CONFIRMED` em `server/graphql/errors.ts`
- [x] `use-cases/shipments/safety/resolve-safety-participant.ts`
- [x] `use-cases/shipments/safety/confirm-safety-check-in.use-case.ts`
- [x] `use-cases/shipments/safety/get-safety-check-in-status.use-case.ts`
- [x] Registrar `safetyCheckInRepository` em `server/repositories/index.ts`
- [x] Registrar use-cases em `server/use-cases/index.ts`
- [x] `app/api/shipments/[shipmentId]/safety/confirm/route.ts` — POST
- [x] `app/api/shipments/[shipmentId]/safety/route.ts` — GET
- [x] Swagger — `lib/swagger/definitions/safety.ts` (tag `Safety`)
- [x] `docs/insomnia/s3-t1-safety-checkin.json`
- [x] QA via curl: confirm customer, confirm carrier, GET com os dois, confirm 2x (409), carrier não-selecionado (404), status errado (409), ADMIN (403)
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S2-T4
