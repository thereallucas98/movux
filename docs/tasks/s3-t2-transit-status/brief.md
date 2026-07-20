# S3-T2 — Transit Status API

**Sprint:** 3 — Transit Flow
**Status:** pending
**Depends on:** S3-T1 (Safety check-in)

---

## User story

Como carrier selecionado de um frete, quero marcar a coleta, o início do transporte e a entrega, pra que o frete avance pelo lifecycle e o customer acompanhe o progresso.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments/:id/collect` | CARRIER (selecionado) | `CARRIER_SELECTED → COLLECTED` |
| `POST` | `/api/shipments/:id/transit` | CARRIER (selecionado) | `COLLECTED → IN_TRANSIT` |
| `POST` | `/api/shipments/:id/deliver` | CARRIER (selecionado) | `IN_TRANSIT → DELIVERED` |

Lifecycle de referência (`DATABASE-DESIGN.md §6.1`):
```
CARRIER_SELECTED → (safety check-in dos dois lados) → collect → COLLECTED
                 → transit → IN_TRANSIT → deliver → DELIVERED
```

## Regras

1. Quem chama precisa ser o carrier da proposta `ACCEPTED` do shipment — qualquer outro (incluindo carrier de outro frete) → `NOT_FOUND`. Mesma resolução da S3-T1 (`Shipment` não tem `carrierId` direto; lookup via `Proposal.status = ACCEPTED`)
2. Cada endpoint só aceita a transição a partir do status anterior exato — fora de ordem (ex.: `/transit` antes de `/collect`) → `INVALID_STATE_TRANSITION`
3. `/collect` tem uma pré-condição extra: as **duas** confirmações de `SafetyCheckIn` (customer e carrier, da S3-T1) precisam existir — senão `SAFETY_NOT_CONFIRMED` (409)
4. `/transit` e `/deliver` não têm pré-condição além do status
5. Nenhuma dessas rotas grava em `shipmentEvent` (S3-T4, ainda não existe) nem cria `deliveryConfirmation` (S3-T3) — só atualizam `Shipment.status`

## Out of scope

- `deliveryConfirmation` (double-confirm do customer, auto-confirm 24h) — é a S3-T3; `/deliver` só marca o status, não cria o registro de confirmação
- `shipmentEvent` (audit log) — é a S3-T4
- `etaMinutes` / `windowExpiresAt` / evento `WINDOW_ALERT` — dependem de integração com Google Maps Distance Matrix, não existe no projeto ainda; fora do horizonte atual
- Notificar o customer em cada transição — Sprint 6
- Cancelamento — o lifecycle documentado só permite `CANCELLED` a partir de `DRAFT`/`OPEN`/`PROPOSALS_RECEIVED`/`CARRIER_SELECTED`, não a partir de `COLLECTED`/`IN_TRANSIT`; não modelado nesta task

## Acceptance criteria

- [ ] `POST /collect` com as duas confirmações de segurança → `Shipment.status: COLLECTED`
- [ ] `POST /collect` sem as duas confirmações → 409 `SAFETY_NOT_CONFIRMED`
- [ ] `POST /collect` por carrier não-selecionado → 404
- [ ] `POST /transit` a partir de `COLLECTED` → `Shipment.status: IN_TRANSIT`
- [ ] `POST /deliver` a partir de `IN_TRANSIT` → `Shipment.status: DELIVERED`
- [ ] Qualquer transição fora de ordem → 409 `INVALID_STATE_TRANSITION`
- [ ] Swagger documenta os 3 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Low — 3 endpoints quase idênticos (guard de participante + guard de status + `updateStatus`), reaproveitando a resolução de carrier já criada na S3-T1. A única regra especial é a pré-condição de safety check-in no `/collect`.
