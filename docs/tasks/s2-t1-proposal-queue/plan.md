# S2-T1 — Plan

## Arquivos novos

### `server/repositories/proposal-queue.repository.ts`

```ts
interface ProposalQueueRepository {
  findByShipmentAndCarrier(shipmentId, carrierId): Promise<{ id, status, position } | null>
  countByShipment(shipmentId): Promise<number>              // pra calcular position
  countCalledByShipment(shipmentId): Promise<number>          // pro refill
  findNextWaiting(shipmentId, limit): Promise<{ id }[]>        // ordenado por position ASC
  create(shipmentId, carrierId, position): Promise<QueueEntry>
  updateStatus(id, status, extra?: { calledAt? }): Promise<void>
  markManyCalled(ids: string[]): Promise<void>                 // bulk, usado pelo refill
}
```

### `shipmentRepository` — método novo (não owner-scoped)

`findStatusById(id): Promise<{ id, status } | null>` — carrier não é dono do shipment, então não dá pra reusar `findStatusForOwner` (que exige `customerId`).

### `use-cases/shipments/queue/refill-called-group.ts` — helper interno, não exportado no barrel público

```ts
export async function refillCalledGroup(queueRepo: ProposalQueueRepository, shipmentId: string): Promise<void> {
  const calledCount = await queueRepo.countCalledByShipment(shipmentId)
  const slots = 3 - calledCount
  if (slots <= 0) return
  const nextWaiting = await queueRepo.findNextWaiting(shipmentId, slots)
  if (nextWaiting.length > 0) {
    await queueRepo.markManyCalled(nextWaiting.map((e) => e.id))
  }
}
```

Chamada por `join` e `withdraw` (e futuramente pela S2-T2/S2-T3 quando uma entrada vira `EXHAUSTED`).

### Use-cases (`server/use-cases/shipments/queue/`)

- `join-proposal-queue.use-case.ts` — valida `shipment.status === OPEN` (`NOT_FOUND` se shipment não existe, `INVALID_STATE_TRANSITION` se não-OPEN) → valida não duplicado (`ALREADY_IN_QUEUE`) → `position = count + 1` → `create` (`WAITING`) → `refillCalledGroup` → retorna a entrada (já com status atualizado se foi chamada na hora)
- `withdraw-proposal-queue.use-case.ts` — busca entrada do carrier → `NOT_FOUND` se não existe → `INVALID_STATE_TRANSITION` se não é `WAITING`/`CALLED` → `updateStatus(WITHDRAWN)` → `refillCalledGroup`
- `get-my-queue-entry.use-case.ts` — busca entrada do carrier → `NOT_FOUND` se não existe

### Erros novos em `error-response.ts`

`ALREADY_IN_QUEUE` (409)

### Schemas

Reaproveita `ShipmentIdParamSchema` de `shipment.schema.ts` (mesmo formato de param) — sem schema de body novo (`join`/`withdraw` não recebem payload).

### Rotas

```
app/api/shipments/[shipmentId]/queue/join/route.ts      — POST
app/api/shipments/[shipmentId]/queue/withdraw/route.ts   — POST
app/api/shipments/[shipmentId]/queue/me/route.ts          — GET
```

### Swagger + Insomnia

- `lib/swagger/definitions/proposal-queue.ts` — novo, tag `Proposal Queue`
- `docs/insomnia/s2-proposal-queue.json` — novo

## Ordem de execução

1. `shipmentRepository.findStatusById`
2. `proposal-queue.repository.ts`
3. `refill-called-group.ts` (helper)
4. 3 use-cases
5. Registrar no barrel (`repositories/index.ts`, `use-cases/index.ts` — exceto o helper de refill, que fica interno)
6. Erro `ALREADY_IN_QUEUE`
7. 3 rotas
8. Swagger + tag
9. Insomnia
10. QA via curl (roteiro cobrindo: join, 4º fica WAITING, withdraw libera vaga, get/me, duplicado, shipment não-OPEN)
