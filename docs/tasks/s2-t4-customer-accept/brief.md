# S2-T4 — Customer Accept API

**Sprint:** 2 — Proposals & Queue
**Status:** pending
**Depends on:** S2-T3 (SLA engine)

---

## User story

Como customer, quero ver as propostas ativas no meu frete, aceitar uma (selecionando o carrier) ou rejeitar uma tentativa específica, pra fechar o frete com o transportador certo.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/shipments/:id/proposals` | CUSTOMER (dono) | Lista todas as propostas (+ tentativas) do frete |
| `POST` | `/api/shipments/:id/proposals/:proposalId/accept` | CUSTOMER (dono) | Aceita a proposta — seleciona o carrier |
| `POST` | `/api/shipments/:id/proposals/:proposalId/reject` | CUSTOMER (dono) | Rejeita a tentativa atual da proposta |

## Gap encontrado: `OPEN → PROPOSALS_RECEIVED` nunca foi implementado

O lifecycle do `DATABASE-DESIGN.md` tem `OPEN → (proposta chega) → PROPOSALS_RECEIVED → (customer aceita) → CARRIER_SELECTED`. A S2-T2 (`submitProposal`) nunca atualizava o `status` do shipment — só criava a proposta. Como o ROADMAP já atribui **"atualizar status do shipment"** à S2-T4, essa transição entra aqui: `submitProposal` ganha uma linha a mais (`shipment.status: OPEN → PROPOSALS_RECEIVED` na primeira proposta que chegar).

## Regras — accept

1. Shipment precisa estar `PROPOSALS_RECEIVED` e pertencer ao customer autenticado — senão `NOT_FOUND`/`INVALID_STATE_TRANSITION`
2. A proposta precisa existir, pertencer a esse shipment, e estar `ACTIVE` — senão `NOT_FOUND`/`INVALID_STATE_TRANSITION`
3. A **tentativa atual** (`currentAttempt`) da proposta vira `responseType: ACCEPTED`
4. `Proposal.status → ACCEPTED`
5. `Shipment.status → CARRIER_SELECTED`, `finalPriceInCents = ` preço da tentativa aceita
6. **Todas as outras propostas `ACTIVE`** desse shipment (outros carriers) → `REJECTED` (tentativa atual também vira `REJECTED`) — o frete já foi pra outra pessoa
7. **Todas as `proposalQueueEntry`** desse shipment que ainda não estão num estado terminal (`WAITING`/`CALLED`/`ACTIVE`) → `EXHAUSTED` — a vaga acabou

## Regras — reject

1. Mesmas checagens de dono/status/proposta ativa do accept
2. Tentativa atual → `responseType: REJECTED`
3. Se `currentAttempt >= 5`: era a última chance → `Proposal.status: REJECTED`, queue entry → `EXHAUSTED`, dispara `refillCalledGroup` (próximo `WAITING` é chamado)
4. Se `currentAttempt < 5`: proposta continua `ACTIVE` — carrier pode contra-ofertar via `POST /proposal/attempts` (S2-T2), nada mais muda

## Out of scope

- `shipmentEvent` (audit log de transições) — é a S3-T4, ainda não existe em nenhuma task anterior
- Notificar o carrier aceito/rejeitado — Sprint 6
- Chat entre customer/carrier — não modelado ainda nesta fase
- Safety check-in / transição pra `COLLECTED` — Sprint 3

## Acceptance criteria

- [ ] `GET /proposals` retorna todas as propostas `ACTIVE` (e outras) do shipment, com tentativas
- [ ] `GET /proposals` de quem não é dono → 404
- [ ] `POST /proposals/:id/accept` → `Proposal` vira `ACCEPTED`, `Shipment` vira `CARRIER_SELECTED` com `finalPriceInCents` correto
- [ ] Accept rejeita automaticamente as outras propostas `ACTIVE` do mesmo shipment
- [ ] Accept esgota (`EXHAUSTED`) as `proposalQueueEntry` que ainda estavam `WAITING`/`CALLED`/`ACTIVE`
- [ ] Accept em proposta que não é `ACTIVE` → 409
- [ ] `POST /proposals/:id/reject` na tentativa < 5 → proposta continua `ACTIVE`
- [ ] `POST /proposals/:id/reject` na 5ª tentativa → `Proposal.status: REJECTED`, queue `EXHAUSTED`, próximo `WAITING` chamado
- [ ] `submitProposal` (S2-T2) agora também muda `shipment.status: OPEN → PROPOSALS_RECEIVED` na 1ª proposta
- [ ] Swagger documenta os 3 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium-High — accept tem efeito cascata (rejeita outras propostas + esgota fila inteira); é o encerramento do Sprint 2.
