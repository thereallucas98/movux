# S2-T1 — Proposal Queue API

**Sprint:** 2 — Proposals & Queue
**Status:** pending
**Depends on:** S1-T3 (shipment), S1-T4 (browse)

---

## User story

Como carrier, quero entrar na fila de interesse de um frete `OPEN` e acompanhar minha posição/status, para ser chamado em grupos de 3 (FIFO) conforme a fila avança.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments/:id/queue/join` | CARRIER | Entra na fila (`WAITING`), dispara o call-group |
| `POST` | `/api/shipments/:id/queue/withdraw` | CARRIER (próprio) | Sai da fila (`WITHDRAWN`), dispara o call-group |
| `GET` | `/api/shipments/:id/queue/me` | CARRIER | Retorna a própria entrada na fila (status/posição) |

## Decisão de design: "hybrid call group" = síncrono, sem job de background

Não existe infraestrutura de cron/job neste projeto ainda (fica pra Fase 2+). "Híbrido" aqui significa: uma função compartilhada `refillCalledGroup(shipmentId)` roda **de forma síncrona**, dentro da mesma requisição, sempre que `join` ou `withdraw` acontece:

1. Conta quantas entradas estão `CALLED` pro shipment
2. Se `< 3`, pega as próximas `WAITING` (ordenadas por `position` ASC) até completar 3, muda pra `CALLED` e seta `calledAt = now()`

A transição `CALLED → EXHAUSTED` (proposta recusada na 5ª tentativa) é responsabilidade da S2-T2/S2-T3, que vai chamar essa mesma função depois de marcar `EXHAUSTED` — mantendo o "avançar fila" centralizado num lugar só.

## Regras

- `join` só é permitido se `shipment.status === 'OPEN'` — senão `INVALID_STATE_TRANSITION`
- `join` é idempotente-negativo: se o carrier já está na fila (qualquer status), `409 ALREADY_IN_QUEUE` (constraint `UNIQUE(shipmentId, carrierId)` do schema)
- `position` = ordem de entrada (sequencial, nunca reatribuída — `count(*) + 1` das entradas já existentes pro shipment, independente do status)
- `withdraw` só é permitido a partir de `WAITING` ou `CALLED` — de `EXHAUSTED`/`WITHDRAWN` é `409 INVALID_STATE_TRANSITION`
- Sem gate de verificação do carrier nesta task (mesma decisão da S1-T4 — verificação é regra de **propor**, S5)

## Out of scope

- Enviar proposta em si (`proposal`/`proposalAttempt`) — S2-T2
- Cálculo de SLA — S2-T3
- Visão da fila pelo customer (lista completa) — não pedido pelo brief original; se precisar, vira task própria
- Job de background pra re-varrer filas travadas — Fase 2+

## Acceptance criteria

- [ ] `POST /queue/join` em shipment `OPEN` → 201, `status: WAITING` ou `CALLED` (se havia vaga no grupo de 3)
- [ ] `POST /queue/join` em shipment não-`OPEN` → 409 `INVALID_STATE_TRANSITION`
- [ ] `POST /queue/join` duplicado (mesmo carrier, mesmo shipment) → 409 `ALREADY_IN_QUEUE`
- [ ] 4º carrier a entrar (com 3 já `CALLED`) fica `WAITING`
- [ ] `POST /queue/withdraw` de um `CALLED` libera vaga → próximo `WAITING` (por `position`) vira `CALLED`
- [ ] `POST /queue/withdraw` de quem já é `EXHAUSTED`/`WITHDRAWN` → 409
- [ ] `GET /queue/me` retorna a entrada do carrier autenticado; 404 se nunca entrou
- [ ] Swagger documenta os 3 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium — a lógica de "chamar grupo de 3" precisa ser correta e reutilizável (síncrona, chamada de dois pontos diferentes ao longo do Sprint 2).
