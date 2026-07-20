# S3-T2 — Todo

- [x] `SAFETY_NOT_CONFIRMED` em `server/http/error-response.ts`
- [x] `SAFETY_NOT_CONFIRMED` em `server/graphql/errors.ts`
- [x] `use-cases/shipments/transit/resolve-selected-carrier.ts`
- [x] `use-cases/shipments/transit/mark-collected.use-case.ts`
- [x] `use-cases/shipments/transit/mark-in-transit.use-case.ts`
- [x] `use-cases/shipments/transit/mark-delivered.use-case.ts`
- [x] Registrar use-cases em `server/use-cases/index.ts`
- [x] `app/api/shipments/[shipmentId]/collect/route.ts` — POST
- [x] `app/api/shipments/[shipmentId]/transit/route.ts` — POST
- [x] `app/api/shipments/[shipmentId]/deliver/route.ts` — POST
- [x] Swagger — `lib/swagger/definitions/transit.ts` (tag `Transit`)
- [x] `docs/insomnia/s3-t2-transit-status.json`
- [x] QA via curl: fluxo feliz (collect → transit → deliver), collect sem safety completo (409), fora de ordem (409), carrier não-selecionado (404)
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T1
