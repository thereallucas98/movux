# S2-T2 — Plan

## Repositório novo: `server/repositories/proposal.repository.ts`

```ts
interface ProposalRepository {
  findByShipmentAndCarrier(shipmentId, carrierId): Promise<ProposalWithAttempts | null>
  create(data: {
    shipmentId, carrierId, queueEntryId, customerSlaHours, carrierSlaHours,
    agreedSlaHours, expiresAt, priceInCents, message?
  }): Promise<ProposalWithAttempts>   // nested write: proposal + attempt #1
  addAttempt(proposalId, attemptNumber, priceInCents, expiresAt, message?): Promise<ProposalWithAttempts>
  updateStatus(id, status): Promise<void>
}
```

`ProposalWithAttempts` = `Proposal & { attempts: ProposalAttempt[] }`.

## `shipmentRepository` — método novo

`findForProposal(id): Promise<{ status: ShipmentStatus; customerSlaHours: number } | null>` — só os dois campos que o submit precisa.

## Sem transação SQL cross-repository

`submit`/`withdraw` fazem `proposalRepo.create/updateStatus` e depois `queueRepo.updateStatus` como duas chamadas sequenciais, não uma transação Prisma única — mesmo padrão pragmático já usado no `join`/`withdraw` da fila (S2-T1: criar entrada, depois chamar `refillCalledGroup` como passo separado). Não existe precedente de transação cross-repository estabelecido no projeto; não introduzo um agora.

## Use-cases (`server/use-cases/shipments/proposals/`)

- `submit-proposal.use-case.ts`:
  1. `shipmentRepo.findForProposal` → `NOT_FOUND` se não existe
  2. `queueRepo.findByShipmentAndCarrier` → `NOT_CALLED` se não existe ou `status !== 'CALLED'`
  3. `proposalRepo.findByShipmentAndCarrier` → `ALREADY_PROPOSED` se já existe
  4. `agreedSlaHours = Math.ceil((customerSlaHours + carrierSlaHours) / 2)`
  5. `expiresAt = now + agreedSlaHours horas`
  6. `proposalRepo.create(...)` (proposal + attempt #1, `queueEntryId` da entrada encontrada no passo 2)
  7. `queueRepo.updateStatus(entry.id, 'ACTIVE')`
  8. `refillCalledGroup(queueRepo, shipmentId)` (reaproveitado da S2-T1)
- `add-proposal-attempt.use-case.ts`:
  1. `proposalRepo.findByShipmentAndCarrier` → `NOT_FOUND` se não existe
  2. `status !== 'ACTIVE'` → `INVALID_STATE_TRANSITION`
  3. `currentAttempt >= 5` → `TOO_MANY_ATTEMPTS`
  4. `expiresAt` recalculado (`now + agreedSlaHours` da proposta já existente)
  5. `proposalRepo.addAttempt(...)`
- `withdraw-proposal.use-case.ts`:
  1. `proposalRepo.findByShipmentAndCarrier` → `NOT_FOUND`
  2. `status !== 'ACTIVE'` → `INVALID_STATE_TRANSITION`
  3. `proposalRepo.updateStatus(id, 'WITHDRAWN')`
  4. `queueRepo.updateStatus(queueEntryId, 'WITHDRAWN')`
  5. `refillCalledGroup(queueRepo, shipmentId)`
- `get-my-proposal.use-case.ts`: `proposalRepo.findByShipmentAndCarrier` → `NOT_FOUND` se não existe

## Erros novos em `error-response.ts` (+ `graphql/errors.ts`, aprendido na S2-T1)

`NOT_CALLED` (409), `ALREADY_PROPOSED` (409), `TOO_MANY_ATTEMPTS` (409)

## Schemas (`server/schemas/proposal.schema.ts`)

- `SubmitProposalSchema`: `priceInCents` (int positivo), `carrierSlaHours` (`4|6|8|12|24`, mesmo domínio do `customerSlaHours`), `message?`
- `AddProposalAttemptSchema`: `priceInCents`, `message?` (sem `carrierSlaHours` — não muda depois da 1ª tentativa)

## Rotas

```
app/api/shipments/[shipmentId]/proposal/route.ts           — POST (submit), GET (get mine)
app/api/shipments/[shipmentId]/proposal/attempts/route.ts   — POST (counter-offer)
app/api/shipments/[shipmentId]/proposal/withdraw/route.ts   — POST
```

## Swagger + Insomnia

- `lib/swagger/definitions/proposals.ts` — novo, tag `Proposals`
- `docs/insomnia/s2-proposal-attempt.json` — novo

## Ordem de execução

1. `shipmentRepository.findForProposal`
2. `proposal.repository.ts`
3. 4 use-cases
4. Registrar nos barrels
5. 3 erros novos (`error-response.ts` **e** `graphql/errors.ts` — checklist explícito desta vez)
6. `proposal.schema.ts`
7. 3 rotas (join do POST+GET na mesma rota base)
8. Swagger + tag
9. Insomnia
10. QA via curl completo, **incluindo `tsc --noEmit` sem filtro** (lição da S2-T1)
