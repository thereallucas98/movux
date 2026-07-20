# S4-T1 — Review API

**Sprint:** 4 — Reviews & Ratings
**Status:** pending
**Depends on:** S3-T3 (Delivery confirmation) — não depende da S4-T3 (seed de tags), mas QA precisa de tags manuais no banco até lá

---

## User story

Como customer ou carrier de um frete entregue, quero avaliar a outra parte (nota de 1 a 5 + tags predefinidas), pra alimentar a reputação de quem prestou o serviço.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments/:id/reviews` | CUSTOMER (dono) ou CARRIER (selecionado) | Envia a review do papel do usuário autenticado |
| `GET` | `/api/shipments/:id/reviews` | CUSTOMER (dono) ou CARRIER (selecionado) | Lista as reviews existentes do frete (0, 1 ou 2) |

## Regras

1. Papel derivado de quem chama (como a S3-T1) — customer avalia o carrier selecionado, carrier avalia o customer
2. `rating`: inteiro entre 1 e 5 (obrigatório)
3. Tags: 0 ou mais `reviewTagId`, cada uma precisa existir em `ReviewTag` com `targetRole` igual ao papel **avaliado** (ex.: customer avaliando carrier só pode usar tags com `targetRole: CARRIER`) — tag errada ou inexistente → 400
4. Uma review por papel por frete (`UNIQUE(shipmentId, reviewerRole)`) — enviar de novo → `ALREADY_CONFIRMED`-like 409 (código específico a definir no Plan)
5. Sem campo de texto livre — só nota + tags (v1, conforme `DATABASE-DESIGN.md §10.1`)
6. **Sem recálculo de `avgRating`** nesta task — é a S4-T2, task separada e sequente

## Out of scope

- Recalcular `avgRating`/`totalShipments` em `CustomerProfile`/`CarrierProfile` — S4-T2
- Seed dos `ReviewTag` (5 tags de carrier + 5 de customer) — S4-T3; QA desta task usa tags inseridas manualmente via SQL até lá
- Comentário em texto livre — fora do v1 por design (`DATABASE-DESIGN.md §10.1`)
- Lembrete de review (notificação) — Sprint 6
- `shipmentEvent` pra reviews — o enum `EventType` (`DATABASE-DESIGN.md §9.2`) não tem um tipo pra isso; não modelado

## Acceptance criteria

- [ ] `POST /reviews` cria a review com `rating` e tags válidas do papel avaliado
- [ ] `POST /reviews` com tag de `targetRole` errado ou inexistente → 400
- [ ] `POST /reviews` de quem não é participante do frete → 404
- [ ] `POST /reviews` duas vezes pro mesmo papel → 409
- [ ] `GET /reviews` retorna as reviews existentes (0, 1 ou 2) com as tags de cada uma
- [ ] Swagger documenta os 2 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium — CRUD com validação cruzada de tags (`targetRole`), mas duas questões de regra de negócio genuinamente contraditórias entre `DATABASE-DESIGN.md §10.1` e `§12` precisam de decisão na Research antes do Plan (ver abaixo).

## Contradição encontrada nos docs (a resolver na Research)

- `§10.1`: "Reviews only allowed when `shipment.status = REVIEWED`"
- `§12` (Review rules): "Reviews only enabled after `shipment.status = DELIVERED` confirmed"
- Diagrama de lifecycle (`§6.1`): `DELIVERED → (both leave reviews) → REVIEWED` — ou seja, `REVIEWED` é o *resultado* de enviar as reviews, não uma pré-condição pra enviá-las

Essas três fontes não podem estar todas certas ao mesmo tempo — decisão registrada em `research.md`.
