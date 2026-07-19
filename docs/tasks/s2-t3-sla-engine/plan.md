# S2-T3 — Plan

## Repositório — método novo em `proposal.repository.ts`

```ts
findExpiredActiveByShipment(shipmentId: string): Promise<{ id: string; queueEntryId: string }[]>
// where: shipmentId, status: 'ACTIVE', expiresAt: { lt: new Date() }
```

## Helper novo: `use-cases/shipments/proposals/sweep-expired-proposals.ts` (interno, não exportado no barrel público)

```ts
export async function sweepExpiredProposals(
  proposalRepo: ProposalRepository,
  queueRepo: ProposalQueueRepository,
  shipmentId: string,
): Promise<void> {
  const expired = await proposalRepo.findExpiredActiveByShipment(shipmentId)
  for (const proposal of expired) {
    await proposalRepo.updateStatus(proposal.id, 'EXPIRED')
    await queueRepo.updateStatus(proposal.queueEntryId, 'EXHAUSTED')
  }
  if (expired.length > 0) {
    await refillCalledGroup(queueRepo, shipmentId)
  }
}
```

Shipment-scoped (não carrier-scoped) — várias propostas `ACTIVE` de carriers diferentes podem existir em paralelo pro mesmo shipment (grupos de 3 chamados), então o sweep varre todas de uma vez, não só a do carrier que fez a requisição.

## Pontos de chamada — 6 use-cases existentes ganham uma linha no início

| Use-case | Repos atuais | Muda pra |
|---|---|---|
| `join-proposal-queue` | `{ shipmentRepo, queueRepo }` | `+ proposalRepo` |
| `get-my-queue-entry` | `(queueRepo, carrierId, shipmentId)` | `({ queueRepo, proposalRepo }, carrierId, shipmentId)` |
| `submit-proposal` | `{ shipmentRepo, queueRepo, proposalRepo }` | sem mudança de assinatura, só a chamada |
| `add-proposal-attempt` | `(proposalRepo, carrierId, shipmentId, input)` | `({ proposalRepo, queueRepo }, carrierId, shipmentId, input)` |
| `withdraw-proposal` | `{ proposalRepo, queueRepo }` | sem mudança de assinatura, só a chamada |
| `get-my-proposal` | `(proposalRepo, carrierId, shipmentId)` | `({ proposalRepo, queueRepo }, carrierId, shipmentId)` |

Assinaturas que mudam obrigam ajustar as rotas correspondentes (`queue/me`, `queue/join`, `proposal/attempts`, `proposal` GET) pra passar o repo extra.

## Ordem de execução

1. `proposalRepository.findExpiredActiveByShipment`
2. `sweep-expired-proposals.ts` (helper)
3. Ajustar as 6 use-cases (adicionar `proposalRepo`/`queueRepo` onde falta + chamar o sweep primeiro)
4. Ajustar as 4 rotas cujas use-cases mudaram de assinatura
5. QA via curl: forçar expiração manipulando `expires_at` direto no banco (via `docker exec psql`, já que não dá pra esperar horas de verdade) e confirmar que o próximo `GET`/`POST` sweepa corretamente
6. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline

## Nota sobre teste de expiração

Sem esperar o SLA real (4-24h), o QA vai fazer `UPDATE proposal SET expires_at = now() - interval '1 hour' WHERE id = '...'` direto no Postgres pra simular uma proposta vencida, depois chamar `GET /proposal` e confirmar que virou `EXPIRED` + queue `EXHAUSTED` + o próximo `WAITING` foi chamado.
