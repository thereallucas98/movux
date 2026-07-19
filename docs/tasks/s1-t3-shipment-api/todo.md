# S1-T3 — Todo

- [x] `server/repositories/customer-profile.repository.ts` — `findByUserId`
- [x] `server/repositories/pricing.repository.ts` — `resolveNeighborhood`, `findSnapshotForCorridor`, `findModifiersByCodes`
- [x] `server/repositories/shipment.repository.ts` — `createDraft`, `findByIdForOwner`, `findStatusForOwner`, `updateStatus`, `listForCustomer`
- [x] `server/schemas/shipment.schema.ts` — `ShipmentAddressSchema`, `ShipmentModifierInputSchema`, `CreateShipmentSchema`, `ListShipmentsQuerySchema`, `ShipmentIdParamSchema`
- [x] `use-cases/shipments/create-shipment.use-case.ts`
- [x] `use-cases/shipments/publish-shipment.use-case.ts`
- [x] `use-cases/shipments/get-shipment.use-case.ts`
- [x] `use-cases/shipments/list-shipments-for-customer.use-case.ts`
- [x] Registrar repos/use-cases nos barrels (`repositories/index.ts`, `use-cases/index.ts`)
- [x] `app/api/shipments/route.ts` — POST + GET
- [x] `app/api/shipments/[shipmentId]/route.ts` — GET
- [x] `app/api/shipments/[shipmentId]/publish/route.ts` — POST
- [x] `lib/swagger/definitions/shipments.ts` + tag `Shipments` em `lib/swagger.ts` + schema `ShipmentAddressInput` compartilhado
- [x] `docs/insomnia/s1-shipment-api.json`
- [x] QA roteiro (todos os casos do `qa-roteiro.md`) passando via curl
- [x] Typecheck do código tocado sem erros novos
