# S2-T4 — Plan

## Fix na S2-T2: `submit-proposal.use-case.ts`

Dois ajustes na função já existente:
1. Guard novo: `shipment.status` precisa ser `OPEN` **ou** `PROPOSALS_RECEIVED` (não mais só "existe") — outros status (`CARRIER_SELECTED`+) bloqueiam `NOT_CALLED`... na verdade um código mais preciso: reaproveita `INVALID_STATE_TRANSITION`, já que "shipment não aceita mais proposta" é isso.
2. Transição: se `shipment.status === 'OPEN'`, depois de criar a proposta, `shipmentRepo.updateStatus(shipmentId, 'PROPOSALS_RECEIVED')`. Só na 1ª proposta (dali em diante já está `PROPOSALS_RECEIVED`, outros carriers `CALLED` continuam podendo propor sem re-disparar).

## Sem transação SQL cross-repository (mesma decisão da S2-T1/S2-T2)

`acceptProposal` mexe em `shipment`, `proposal` (várias), `proposalAttempt` e `proposalQueueEntry` (várias) — é a operação mais "larga" do Sprint 2. Ainda assim, sigo o mesmo padrão pragmático (chamadas sequenciais, não uma transação Prisma única) por consistência com o resto do sprint — não existe precedente de transação cross-repository neste projeto. **Risco aceito e documentado**: uma falha no meio da sequência deixa estado parcial (ex: shipment `CARRIER_SELECTED` mas outra proposta ainda `ACTIVE`). Fica como follow-up pra quando o projeto introduzir um padrão de `tx` compartilhado entre repositórios.

## Repositórios — métodos novos

### `proposal.repository.ts`
```ts
listByShipment(shipmentId): Promise<ProposalWithAttempts[]>
findByIdForShipment(proposalId, shipmentId): Promise<ProposalWithAttempts | null>
respondToAttempt(proposalId, attemptNumber, responseType: 'ACCEPTED' | 'REJECTED'): Promise<void>
findOtherActiveByShipment(shipmentId, exceptProposalId): Promise<{ id, currentAttempt, queueEntryId }[]>
```
(`updateStatus` já existe, reaproveitado pra `ACCEPTED`/`REJECTED` do `Proposal`.)

### `proposal-queue.repository.ts`
```ts
exhaustOthers(shipmentId, exceptQueueEntryId): Promise<void>
// updateMany: shipmentId=X, id != except, status IN (WAITING, CALLED, ACTIVE) -> EXHAUSTED
```

### `shipment.repository.ts`
```ts
markCarrierSelected(id, finalPriceInCents): Promise<void>
// status: CARRIER_SELECTED, finalPriceInCents: X
```

## Use-cases (`server/use-cases/shipments/proposals/`)

- `list-proposals-for-shipment.use-case.ts` — resolve `customerProfileId` → `shipmentRepo.findStatusForOwner` (`NOT_FOUND`) → `sweepExpiredProposals` → `proposalRepo.listByShipment`
- `accept-proposal.use-case.ts`:
  1. resolve `customerProfileId` → `findStatusForOwner` → `NOT_FOUND`
  2. `status !== 'PROPOSALS_RECEIVED'` → `INVALID_STATE_TRANSITION`
  3. `sweepExpiredProposals`
  4. `proposalRepo.findByIdForShipment` → `NOT_FOUND`
  5. `status !== 'ACTIVE'` → `INVALID_STATE_TRANSITION`
  6. Preço da tentativa atual (`attempts.find(a => a.attemptNumber === proposal.currentAttempt)`)
  7. `respondToAttempt(ACCEPTED)` + `updateStatus(ACCEPTED)`
  8. `shipmentRepo.markCarrierSelected(shipmentId, priceInCents)`
  9. `findOtherActiveByShipment` → pra cada uma: `respondToAttempt(REJECTED)` + `updateStatus(REJECTED)`
  10. `queueRepo.exhaustOthers(shipmentId, proposal.queueEntryId)`
- `reject-proposal.use-case.ts`:
  1-5. mesmas checagens do accept (owner/status/proposta ativa)
  6. `sweepExpiredProposals`
  7. `respondToAttempt(REJECTED)`
  8. se `currentAttempt >= 5`: `updateStatus(REJECTED)` + `queueRepo.updateStatus(EXHAUSTED)` + `refillCalledGroup`

## Schemas

`server/schemas/proposal.schema.ts` — schema novo:
```ts
ProposalIdParamSchema = z.object({ shipmentId: z.uuid(), proposalId: z.uuid() })
```

## Rotas

```
app/api/shipments/[shipmentId]/proposals/route.ts                        — GET (list, customer)
app/api/shipments/[shipmentId]/proposals/[proposalId]/accept/route.ts     — POST
app/api/shipments/[shipmentId]/proposals/[proposalId]/reject/route.ts     — POST
```

Nota: `proposals` (plural, visão do customer) coexiste com `proposal` (singular, já existente, visão do carrier) — rotas diferentes, sem conflito.

## Swagger + Insomnia

- `lib/swagger/definitions/proposals.ts` (arquivo já existe da S2-T2) — 3 endpoints novos
- `docs/insomnia/s2-customer-accept.json` — novo

## Ordem de execução

1. Fix em `submit-proposal.use-case.ts`
2. Métodos novos nos 3 repositórios
3. `ProposalIdParamSchema`
4. 3 use-cases novos
5. Registrar nos barrels
6. 3 rotas
7. Swagger
8. Insomnia
9. QA via curl completo (fluxo: 2 carriers propõem → customer lista → aceita um → confirma o outro rejeitado + fila esgotada + shipment CARRIER_SELECTED; fluxo separado de reject < 5 e reject na 5ª)
10. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S2-T3
