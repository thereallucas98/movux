# S3-T2 — Plan

## Error code novo

`server/http/error-response.ts`:
- `ErrorCode` union: `+ 'SAFETY_NOT_CONFIRMED'`
- `ERROR_MAP`: `SAFETY_NOT_CONFIRMED: { status: 409, message: 'Both customer and carrier must confirm the safety check-in first' }`

`server/graphql/errors.ts`:
- `Record<ErrorCode,string>`: `SAFETY_NOT_CONFIRMED: 'Both customer and carrier must confirm the safety check-in first'`

## Use-cases (`server/use-cases/shipments/transit/`)

### `resolve-selected-carrier.ts` (helper interno, não exportado no barrel)
```ts
async function resolveSelectedCarrier(repos, userId, shipmentId): Promise<{ status: ShipmentStatus } | null> {
  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) return null
  const accepted = await repos.proposalRepo.findAcceptedByShipment(shipmentId)
  if (!accepted || accepted.carrierId !== userId) return null
  return { status: shipment.status }
}
```

### `mark-collected.use-case.ts`
1. `resolveSelectedCarrier` → `NOT_FOUND`
2. `status !== 'CARRIER_SELECTED'` → `INVALID_STATE_TRANSITION`
3. `safetyCheckInRepo.findByShipment(shipmentId)` → precisa ter `role: CUSTOMER` e `role: CARRIER` → senão `SAFETY_NOT_CONFIRMED`
4. `shipmentRepo.updateStatus(shipmentId, 'COLLECTED')`

### `mark-in-transit.use-case.ts`
1. `resolveSelectedCarrier` → `NOT_FOUND`
2. `status !== 'COLLECTED'` → `INVALID_STATE_TRANSITION`
3. `shipmentRepo.updateStatus(shipmentId, 'IN_TRANSIT')`

### `mark-delivered.use-case.ts`
1. `resolveSelectedCarrier` → `NOT_FOUND`
2. `status !== 'IN_TRANSIT'` → `INVALID_STATE_TRANSITION`
3. `shipmentRepo.updateStatus(shipmentId, 'DELIVERED')`

## Schemas

Nenhum novo — `ShipmentIdParamSchema` já cobre os 3 endpoints.

## Rotas

```
app/api/shipments/[shipmentId]/collect/route.ts   — POST (CARRIER)
app/api/shipments/[shipmentId]/transit/route.ts   — POST (CARRIER)
app/api/shipments/[shipmentId]/deliver/route.ts   — POST (CARRIER)
```

Gate de role único no route (`principal.role !== 'CARRIER'` → `FORBIDDEN`), igual `queue/join`.

## Swagger + Insomnia

- `lib/swagger/definitions/transit.ts` (arquivo novo) — 3 endpoints, tag `Transit`
- `docs/insomnia/s3-t2-transit-status.json` — novo

## Ordem de execução

1. `SAFETY_NOT_CONFIRMED` em `error-response.ts` + `graphql/errors.ts`
2. `resolve-selected-carrier.ts` + 3 use-cases
3. Registrar nos barrels (`use-cases/index.ts`)
4. 3 rotas
5. Swagger
6. Insomnia
7. QA via curl: fluxo feliz completo (collect → transit → deliver); collect sem safety completo (409); fora de ordem (409); carrier não-selecionado (404)
8. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T1
