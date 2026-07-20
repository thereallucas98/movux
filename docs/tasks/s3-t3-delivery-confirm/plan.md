# S3-T3 — Plan

## Schema migration

```prisma
model Shipment {
  // ... adiciona:
  collectedAt  DateTime? @map("collected_at")
  inTransitAt  DateTime? @map("in_transit_at")
  deliveredAt  DateTime? @map("delivered_at")
}
```

Nullable, additive — sem quebra. Via `prisma migrate diff` + migration manual (workaround não-interativo já validado).

## Ajuste retroativo na S3-T2 — `shipment.repository.ts`

Novos métodos dedicados (mesmo padrão de `markCarrierSelected`), substituindo o `updateStatus` genérico usado hoje nos 3 use-cases de trânsito:

```ts
markCollected(id): Promise<void>   // status: COLLECTED, collectedAt: now()
markInTransit(id): Promise<void>   // status: IN_TRANSIT, inTransitAt: now()
markDelivered(id): Promise<void>   // status: DELIVERED, deliveredAt: now()
```

`mark-collected.use-case.ts`, `mark-in-transit.use-case.ts`, `mark-delivered.use-case.ts` (S3-T2) trocam `shipmentRepo.updateStatus(shipmentId, 'X')` pelo método dedicado correspondente. `findStatusById` também passa a selecionar `deliveredAt` (usado pelo sweep desta task).

## Repositório novo — `delivery-confirmation.repository.ts`

```ts
export interface DeliveryConfirmationRepository {
  findByShipment(shipmentId): Promise<DeliveryConfirmation | null>
  create(shipmentId, customerId, confirmed, issueDescription): Promise<DeliveryConfirmation>
}
```

## Schema Zod — `server/schemas/delivery-confirmation.schema.ts` (novo)

```ts
export const DeliveryConfirmationBodySchema = z.object({
  confirmed: z.boolean(),
  issueDescription: z.string().min(1).optional(),
}).refine(
  (data) => data.confirmed || !!data.issueDescription,
  { message: 'issueDescription is required when confirmed is false', path: ['issueDescription'] },
)
```

## Use-cases (`server/use-cases/shipments/delivery/`)

### `sweep-auto-confirm-delivery.ts` (helper interno, mesmo padrão do `sweepExpiredProposals`)
```ts
async function sweepAutoConfirmDelivery(repos, shipmentId, shipment: {status, deliveredAt, customerId}) {
  if (shipment.status !== 'DELIVERED' || !shipment.deliveredAt) return
  const existing = await repos.deliveryConfirmationRepo.findByShipment(shipmentId)
  if (existing) return
  const deadline = new Date(shipment.deliveredAt.getTime() + 24 * 60 * 60 * 1000)
  if (new Date() < deadline) return
  await repos.deliveryConfirmationRepo.create(shipmentId, shipment.customerId, true, undefined)
}
```
Precisa de `shipment.customerId` — `findStatusById` hoje só devolve `{id, status}`; passa a devolver também `customerId` e `deliveredAt` (extensão do select existente).

### `confirm-delivery.use-case.ts` (POST)
1. `customerProfileRepo.findByUserId` → `NOT_FOUND`
2. `shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)` → `NOT_FOUND`
3. `status !== 'DELIVERED'` → `INVALID_STATE_TRANSITION`
4. `sweepAutoConfirmDelivery`
5. `deliveryConfirmationRepo.findByShipment` existente → `ALREADY_CONFIRMED`
6. `deliveryConfirmationRepo.create(shipmentId, customerProfile.id, confirmed, issueDescription)`

### `get-delivery-confirmation-status.use-case.ts` (GET)
1. `resolveSafetyParticipant` (reaproveitado da S3-T1 — mesmo predicado "dono ou carrier selecionado") → `NOT_FOUND`
2. `status !== 'DELIVERED'` → `INVALID_STATE_TRANSITION`
3. `sweepAutoConfirmDelivery`
4. `deliveryConfirmationRepo.findByShipment` → devolve (ou `null`)

## Rotas

```
app/api/shipments/[shipmentId]/delivery-confirmation/route.ts   — POST (CUSTOMER) + GET (CUSTOMER ou CARRIER)
```

Um único arquivo de rota exportando `POST` e `GET`, como já é convenção no projeto (ex.: `proposal/route.ts`).

## Swagger + Insomnia

- `lib/swagger/definitions/delivery-confirmation.ts` (novo) — 2 endpoints, tag `Delivery Confirmation`
- `docs/insomnia/s3-t3-delivery-confirm.json` — novo

## Ordem de execução

1. Migration — `collectedAt`/`inTransitAt`/`deliveredAt` em `Shipment`
2. `shipmentRepo.markCollected`/`markInTransit`/`markDelivered` + `findStatusById` estendido
3. Retrofit dos 3 use-cases da S3-T2 pros métodos dedicados
4. `delivery-confirmation.repository.ts`
5. `DeliveryConfirmationBodySchema`
6. `sweep-auto-confirm-delivery.ts` + 2 use-cases
7. Registrar nos barrels
8. Rota `delivery-confirmation/route.ts`
9. Swagger
10. Insomnia
11. QA via curl: confirm true, confirm false sem issue (400), confirm false com issue, confirm 2x (409), GET por carrier não-selecionado (404), fora de DELIVERED (409), auto-confirm após 24h (forçado via `UPDATE shipment SET delivered_at = now() - interval '25 hours'`)
12. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T2
