# S3-T4 — Plan

## Repositório novo — `shipment-event.repository.ts`

```ts
export interface ShipmentEventRepository {
  create(
    shipmentId: string,
    eventType: EventType,
    triggeredBy: string | null,
    metadata?: object,
  ): Promise<void>
  listByShipment(shipmentId: string): Promise<ShipmentEvent[]>
}
```

`listByShipment` ordena por `occurredAt asc`.

## Retrofit — 7 use-cases, 6 `eventType` distintos (`SAFETY_CONFIRMED` condicional)

Cada arquivo ganha `shipmentEventRepo: ShipmentEventRepository` no seu `XRepos` interface, e uma chamada `.create(...)` no fim do fluxo de sucesso — sem mudar assinatura pública, retorno ou comportamento existente.

| Arquivo | Inserção | `eventType` | `triggeredBy` | `metadata` |
|---|---|---|---|---|
| `shipments/publish-shipment.use-case.ts` | após `updateStatus(id, 'OPEN')` | `PUBLISHED` | `userId` | — |
| `shipments/proposals/submit-proposal.use-case.ts` | após `proposalRepo.create(...)` | `PROPOSAL_RECEIVED` | `carrierId` | `{ proposalId: proposal.id }` |
| `shipments/proposals/accept-proposal.use-case.ts` | após `markCarrierSelected(...)` | `CARRIER_SELECTED` | `userId` | — |
| `shipments/safety/confirm-safety-check-in.use-case.ts` | após `safetyCheckInRepo.create(...)`, só se `findByShipment` mostrar os dois papéis presentes | `SAFETY_CONFIRMED` | `null` | — |
| `shipments/transit/mark-collected.use-case.ts` | após `shipmentRepo.markCollected(...)` | `COLLECTED` | `userId` | — |
| `shipments/transit/mark-in-transit.use-case.ts` | após `shipmentRepo.markInTransit(...)` | `IN_TRANSIT` | `userId` | — |
| `shipments/transit/mark-delivered.use-case.ts` | após `shipmentRepo.markDelivered(...)` | `DELIVERED` | `userId` | — |

## Use-case novo — `get-shipment-events.use-case.ts`

1. `resolveSafetyParticipant` (reaproveitado da S3-T1, 3ª reutilização) → `NOT_FOUND`
2. Sem gate de status — histórico legível em qualquer momento do lifecycle
3. `shipmentEventRepo.listByShipment(shipmentId)`

## Rotas tocadas (repassar `shipmentEventRepository` no objeto de repos)

```
app/api/shipments/[shipmentId]/publish/route.ts
app/api/shipments/[shipmentId]/proposal/route.ts                          (POST)
app/api/shipments/[shipmentId]/proposals/[proposalId]/accept/route.ts
app/api/shipments/[shipmentId]/safety/confirm/route.ts
app/api/shipments/[shipmentId]/collect/route.ts
app/api/shipments/[shipmentId]/transit/route.ts
app/api/shipments/[shipmentId]/deliver/route.ts
```

## Rota nova

```
app/api/shipments/[shipmentId]/events/route.ts   — GET (CUSTOMER ou CARRIER)
```

## Swagger + Insomnia

- `lib/swagger/definitions/shipment-events.ts` (novo) — 1 endpoint, tag `Shipment Events`
- `docs/insomnia/s3-t4-event-log.json` — novo

## Ordem de execução

1. `server/repositories/shipment-event.repository.ts`
2. Registrar `shipmentEventRepository` em `server/repositories/index.ts`
3. Retrofit dos 7 use-cases (tabela acima)
4. Retrofit das 7 rotas correspondentes (passar `shipmentEventRepository`)
5. `use-cases/shipments/get-shipment-events.use-case.ts`
6. Registrar em `server/use-cases/index.ts`
7. Rota `app/api/shipments/[shipmentId]/events/route.ts`
8. Swagger
9. Insomnia
10. QA via curl: fluxo completo (publish → propose → accept → safety×2 → collect → transit → deliver) e `GET /events` confirmando os 7 eventos na ordem certa, com `triggeredBy` correto em cada um; `SAFETY_CONFIRMED` só aparece 1x mesmo com 2 confirmações; `GET /events` por não-participante (404); `GET /events` num shipment `DRAFT` (lista vazia)
11. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T3
