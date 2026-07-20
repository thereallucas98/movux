# S3-T3 — Delivery Confirmation API

**Sprint:** 3 — Transit Flow
**Status:** pending
**Depends on:** S3-T2 (Transit status)

---

## User story

Como customer, quero confirmar que recebi o frete (ou reportar um problema) depois que o carrier marca `DELIVERED`, pra fechar o ciclo de entrega. Se eu não responder em 24h, o sistema confirma automaticamente.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments/:id/delivery-confirmation` | CUSTOMER (dono) | Confirma a entrega (`confirmed: true`) ou reporta problema (`confirmed: false` + `issueDescription`) |
| `GET` | `/api/shipments/:id/delivery-confirmation` | CUSTOMER (dono) ou CARRIER (selecionado) | Consulta o status da confirmação |

## Regras

1. Shipment precisa estar `DELIVERED` — senão `NOT_FOUND`/`INVALID_STATE_TRANSITION`
2. `POST` só pelo customer dono do frete — senão `NOT_FOUND`
3. `GET` pelo customer dono **ou** o carrier selecionado (mesma resolução usada na S3-T1/S3-T2)
4. Uma confirmação por shipment (`UNIQUE(shipmentId)`) — confirmar de novo → `ALREADY_CONFIRMED` (409)
5. `confirmed: false` exige `issueDescription` preenchido; `confirmed: true` ignora o campo
6. **Auto-confirm em 24h:** se o customer não confirmou dentro de 24h depois que o shipment virou `DELIVERED`, o sistema cria a confirmação automaticamente (`confirmed: true`) na próxima vez que alguém tocar o endpoint desse shipment — mesmo padrão "lazy sweep" já usado pra expirar propostas (S2-T2/S2-T3, `sweepExpiredProposals`); não existe cron/job de background neste projeto ainda, então o auto-confirm só dispara quando o endpoint é chamado, não exatamente às 24h

## Out of scope

- `shipmentEvent` (audit log) — é a S3-T4
- Resolução de disputa quando `confirmed: false` (fluxo de admin, reembolso, etc.) — não modelado em nenhuma sprint do roadmap ainda
- Transição pra `REVIEWED` / sistema de reviews — Sprint 4
- Job de background real pra rodar o auto-confirm exatamente às 24h — mesma limitação aceita do `sweepExpiredProposals`, documentada como padrão do projeto

## Acceptance criteria

- [ ] `POST /delivery-confirmation` com `confirmed: true` → cria o registro, `Shipment` permanece `DELIVERED`
- [ ] `POST /delivery-confirmation` com `confirmed: false` sem `issueDescription` → 400 (validação)
- [ ] `POST /delivery-confirmation` com `confirmed: false` + `issueDescription` → cria o registro com o problema
- [ ] `POST /delivery-confirmation` chamado por quem não é o customer dono → 404
- [ ] `POST /delivery-confirmation` com shipment fora de `DELIVERED` → 409
- [ ] `POST /delivery-confirmation` duas vezes → 409 `ALREADY_CONFIRMED`
- [ ] `GET /delivery-confirmation` antes de qualquer confirmação e antes de 24h → `null`
- [ ] `GET /delivery-confirmation` depois de 24h sem confirmação do customer → auto-confirma (`confirmed: true`) e retorna o registro
- [ ] Swagger documenta os 2 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium — regras de confirmação são simples, mas o auto-confirm em 24h precisa de uma fonte confiável de "quando o shipment virou `DELIVERED`", que ainda não existe explicitamente no schema (`Shipment` não tem `deliveredAt`) — a ser resolvido na Exploration/Research.
