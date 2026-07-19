# S2-T3 — SLA Engine (Expiração Automática)

**Sprint:** 2 — Proposals & Queue
**Status:** pending
**Depends on:** S2-T2 (proposal attempt)

---

## User story

Como sistema, quero expirar automaticamente propostas que passaram do `expiresAt` sem resposta do customer, liberando a fila pro próximo carrier, sem depender de um job de background que ainda não existe.

## Escopo já resolvido na S2-T2 (não repetido aqui)

O **cálculo** de `agreedSlaHours = ceil((customerSlaHours + carrierSlaHours) / 2)` e a gravação de `expiresAt` já foram implementados na S2-T2 (é campo obrigatório do schema, não dava pra adiar). Esta task cobre só a **metade que faltava do nome da task no ROADMAP**: a expiração em si.

## Decisão de design: lazy sweep, sem job de background

Mesma limitação de infra da S2-T1/S2-T2 (sem cron ainda). Em vez de um job varrendo o banco periodicamente, um helper compartilhado `sweepExpiredProposals(shipmentId)` roda **no início** de qualquer endpoint que leia ou mexa numa proposta/fila daquele shipment:

- `GET /proposal`
- `GET /queue/me`
- `POST /queue/join`
- `POST /proposal` (submit)
- `POST /proposal/attempts`
- `POST /proposal/withdraw`

Se existe uma `Proposal` `ACTIVE` com `expiresAt < now()`: marca `status = EXPIRED` e a `proposalQueueEntry` correspondente vira `EXHAUSTED` (dispara `refillCalledGroup`, reaproveitado da S2-T1). Isso significa que a expiração só é "percebida" quando alguém interage com aquele shipment — aceitável pro MVP (sem SLA real-time), documentado como limitação conhecida.

## Decisão de design: interpretação de "queue entry → next attempt or EXHAUSTED"

O `DATABASE-DESIGN.md` §12 tem essa frase ambígua sobre o destino da `queueEntry` numa proposta expirada. Resolvido assim: **expiração sempre leva a `EXHAUSTED`**, igual ao caso de rejeição na 5ª tentativa — não existe "próxima tentativa automática" (isso exigiria o carrier agir de novo, o que é uma ação dele via S2-T2, não algo que o sistema dispara sozinho). Uniformiza o comportamento: qualquer jeito da negociação "morrer" (esgotar tentativas, ser rejeitada, ou expirar) leva a `EXHAUSTED` + libera a fila.

## Sem endpoint novo

Esta task não adiciona rota — só o helper de sweep, chamado dos 6 endpoints já existentes acima (que precisam de uma linha a mais cada, no início do use-case).

## Out of scope

- Job de background/cron real (Fase 2+)
- Notificar o carrier/customer quando expira (Sprint 6 — Notifications)
- Accept/reject explícito do customer (S2-T4 — ação diferente de expiração)

## Acceptance criteria

- [ ] Proposta `ACTIVE` com `expiresAt` no passado, ao ser lida via `GET /proposal`, aparece como `EXPIRED` na resposta (sweep rodou antes do read)
- [ ] Queue entry correspondente vira `EXHAUSTED` após o sweep
- [ ] `refillCalledGroup` é chamado após o sweep — próximo `WAITING` é promovido a `CALLED`
- [ ] Sweep é idempotente (rodar 2x não quebra nem duplica efeito)
- [ ] Proposta `ACTIVE` com `expiresAt` no futuro não é afetada pelo sweep
- [ ] Proposta que já é `ACCEPTED`/`REJECTED`/`WITHDRAWN` não é afetada (sweep só mexe em `ACTIVE`)

## Complexity

Low-Medium — um helper novo + inserção em 6 pontos de entrada já existentes; sem endpoint novo, sem schema novo.
