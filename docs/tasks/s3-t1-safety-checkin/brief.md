# S3-T1 — Safety Check-in API

**Sprint:** 3 — Transit Flow
**Status:** pending
**Depends on:** S2-T4 (Customer accept)

---

## User story

Como customer ou carrier de um frete com transportador selecionado, quero confirmar o termo de segurança antes da coleta, pra que o frete só siga pra `COLLECTED` depois que as duas partes tiverem confirmado.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments/:id/safety/confirm` | CUSTOMER (dono) ou CARRIER (selecionado) | Confirma o termo de segurança para o papel do usuário autenticado |
| `GET` | `/api/shipments/:id/safety` | CUSTOMER (dono) ou CARRIER (selecionado) | Consulta o status das duas confirmações |

## Regras

1. Shipment precisa existir e estar `CARRIER_SELECTED` — senão `NOT_FOUND`/`INVALID_STATE_TRANSITION`
2. Quem chama precisa ser o customer dono do frete, **ou** o carrier da proposta `ACCEPTED` desse frete — qualquer outro (incluindo outro carrier que só participou da fila) → `NOT_FOUND`
3. O papel (`CUSTOMER`/`CARRIER`) é derivado de quem está chamando — não é um campo enviado pelo client
4. Uma confirmação por papel por frete (`UNIQUE(shipmentId, role)`) — confirmar de novo → `ALREADY_CONFIRMED` (409)
5. `ipAddress` é capturado do request (registro legal) e salvo junto — nullable se não disponível
6. `GET /safety` retorna as duas confirmações (ou `null` pra quem falta), sem transicionar nada — é só leitura de estado

## Out of scope

- A transição real do shipment pra `COLLECTED` — é a S3-T2 (`Transit status API`), que vai exigir as duas confirmações desta task como pré-condição
- `shipmentEvent` (audit log, incluindo o evento `SAFETY_CONFIRMED`) — é a S3-T4, ainda não existe
- Notificar a outra parte quando alguém confirma — Sprint 6
- SOS button, verificação biométrica, câmera — Fase 3+ do differentiator de segurança (`BUSINESS-FOUNDATION.md §4`), fora do horizonte atual

## Acceptance criteria

- [ ] `POST /safety/confirm` cria o `SafetyCheckIn` do papel correto com `confirmedAt` e `ipAddress`
- [ ] `POST /safety/confirm` chamado por quem não é dono nem carrier selecionado → 404
- [ ] `POST /safety/confirm` com shipment fora de `CARRIER_SELECTED` → 409
- [ ] `POST /safety/confirm` duas vezes pro mesmo papel → 409 `ALREADY_CONFIRMED`
- [ ] `GET /safety` retorna as confirmações existentes (customer/carrier), com `null` pra quem ainda não confirmou
- [ ] Swagger documenta os 2 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Low-Medium — CRUD simples de confirmação, mas precisa resolver "quem é o carrier selecionado" (não existe `carrierId` direto no `Shipment`; requer lookup na `Proposal` com `status = ACCEPTED`).
