# S1-T4 — Todo

- [x] `shipmentRepository.listOpenForBrowse` — status OPEN, filtro `cityId` (via origin) + `type`, endereços redigidos via `select`
- [x] `BrowseShipmentsQuerySchema` em `shipment.schema.ts`
- [x] `use-cases/shipments/browse-open-shipments.use-case.ts`
- [x] Registrar no barrel `use-cases/index.ts`
- [x] `app/api/shipments/browse/route.ts` — GET, 401/403/200
- [x] Swagger — endpoint novo em `lib/swagger/definitions/shipments.ts`
- [x] Insomnia — request novo em `docs/insomnia/s1-shipment-api.json`
- [x] QA via curl: sem auth (401), como CUSTOMER (403), como CARRIER (200), filtro cityId, filtro type, paginação, DRAFT nunca aparece, endereço sem street/number
- [x] Typecheck sem erros novos
