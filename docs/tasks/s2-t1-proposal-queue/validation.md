# S2-T1 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Resultado |
|---|---|---|
| 1-3 | 3 primeiros carriers entram | ✅ todos `CALLED`, `position` 1-3 |
| 4 | 4º carrier entra | ✅ `WAITING`, `position: 4` |
| 5 | Join duplicado | ✅ 409 `ALREADY_IN_QUEUE` |
| 6 | Withdraw de um `CALLED` | ✅ 200; carrier 4 (`WAITING`) promovido a `CALLED` automaticamente pelo `refillCalledGroup` |
| 7 | Withdraw 2x | ✅ 409 `INVALID_STATE_TRANSITION` |
| 8 | `GET /queue/me` sem ter entrado | ✅ 404 |
| 9 | Join em shipment `DRAFT` | ✅ 409 `INVALID_STATE_TRANSITION` |
| 10 | Swagger | ✅ 3 endpoints sob a tag `Proposal Queue` |
| — | Typecheck | ✅ sem erros novos |

## Deviations from plan.md / brief.md

1. **Achado (e corrigido) um typecheck error que já vinha da S1-T3**: `server/graphql/errors.ts` tem um `Record<ErrorCode, string>` exaustivo que precisa de todas as chaves do tipo `ErrorCode` (compartilhado entre REST e GraphQL). Ao adicionar `CUSTOMER_PROFILE_NOT_FOUND`/`INVALID_ADDRESS`/`NO_PRICING_AVAILABLE` na S1-T3, esse arquivo devia ter sido atualizado junto — meu grep do typecheck daquela task foi estreito demais (`grep -i shipment`) e não pegou o erro porque o arquivo se chama `graphql/errors.ts`, sem "shipment" no nome/path. Corrigido agora junto com `ALREADY_IN_QUEUE`. Rodei um typecheck **sem filtro** desta vez pra confirmar que não sobrou mais nada fora do domínio antigo (Turnora) já conhecido.

## Out of scope (confirmed, per brief.md)

- Envio de proposta (S2-T2)
- Cálculo de SLA (S2-T3)
- Visão da fila pelo customer
- Job de background

## Follow-ups

Nenhum novo. A função `refillCalledGroup` já está pronta pra ser reaproveitada pela S2-T2/S2-T3 quando uma entrada virar `EXHAUSTED`.
