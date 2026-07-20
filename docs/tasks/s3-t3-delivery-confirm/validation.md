# S3-T3 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | GET antes de qualquer confirmação | `null` | ✅ |
| 2 | POST `confirmed:false` sem `issueDescription` | 400 (validação) | ✅ |
| 3 | GET por carrier perdedor (não selecionado) | 404 | ✅ |
| 4 | POST `confirmed:true` | 201 | ✅ |
| 5 | POST duas vezes | 409 `ALREADY_CONFIRMED` | ✅ |
| 6 | GET pelo carrier selecionado | registro confirmado | ✅ |
| 7 | POST `confirmed:false` + `issueDescription` | 201, problema registrado | ✅ |
| 8 | Auto-confirm após 24h (`delivered_at` forçado via SQL) | `confirmed:true` criado automaticamente na próxima leitura | ✅ |
| 9 | Confirm com shipment fora de `DELIVERED` | 409 `INVALID_STATE_TRANSITION` | ✅ |
| 10 | Swagger — 2 endpoints sob `Delivery Confirmation` | presentes | ✅ |

Todos os 10 casos do `qa-roteiro.md` passaram de primeira, sem achados de bug. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S3-T2, todos pré-existentes no código legado do Turnora. Zero erros novos em arquivos de `delivery`/`transit`/`safety`/`shipment`/`proposal`.

## Desvios encontrados durante execução

Nenhum desvio de comportamento. Duas decisões de arquitetura, ambas já registradas em `research.md` antes da execução:

1. **`Shipment.collectedAt`/`inTransitAt`/`deliveredAt` (decisão Ideal)** — adicionados via migration, com retrofit retroativo pequeno nos 3 use-cases da S3-T2 (`mark-collected`, `mark-in-transit`, `mark-delivered` passaram a chamar métodos dedicados do repositório em vez do `updateStatus` genérico). Follow-up registrado: revisitar redundância com `shipmentEvent` quando a S3-T4 existir.
2. **`GET /delivery-confirmation` reaproveita `resolveSafetyParticipant` (S3-T1) diretamente** — mesmo predicado exato ("dono ou carrier selecionado"), sem duplicar lógica nem criar um helper novo equivalente.

## Acceptance criteria (brief.md)

- [x] `POST` com `confirmed: true` → cria o registro, `Shipment` permanece `DELIVERED`
- [x] `POST` com `confirmed: false` sem `issueDescription` → 400
- [x] `POST` com `confirmed: false` + `issueDescription` → cria o registro com o problema
- [x] `POST` por quem não é o customer dono → 404
- [x] `POST` com shipment fora de `DELIVERED` → 409
- [x] `POST` duas vezes → 409 `ALREADY_CONFIRMED`
- [x] `GET` antes de qualquer confirmação e antes de 24h → `null`
- [x] `GET` depois de 24h sem confirmação → auto-confirma e retorna o registro
- [x] Swagger documenta os 2 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

- Quando a S3-T4 (`shipmentEvent`, audit log) for implementada, revisitar se `Shipment.collectedAt`/`inTransitAt`/`deliveredAt` ficam redundantes com os eventos correspondentes do log — mesmo padrão de limpeza já aplicado aos campos `safetyTermCustomerAt`/`safetyTermCarrierAt` na S3-T1.
