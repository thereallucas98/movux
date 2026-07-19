# S1-T4 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Resultado |
|---|---|---|
| 1 | Sem auth | ✅ 401 |
| 2 | Como CUSTOMER | ✅ 403 |
| 3 | Como CARRIER | ✅ 200, endereço redigido (só `type`/`neighborhoodName`/`cityId`/`state`) |
| 4 | Filtro `type` | ✅ vazio quando não há match; retorna o item certo depois de publicar um `DELIVERY` |
| 5 | Filtro `cityId` | ✅ |
| 6 | Paginação (`limit=1`) | ✅ `nextCursor: null` quando não há mais itens |
| 7 | `DRAFT` não aparece | ✅ confirmado via psql — frete `DELIVERY` ficou em `DRAFT` (nunca publicado no teste da S1-T3) e não apareceu no browse até eu publicar |
| — | Swagger | ✅ path `/api/shipments/browse` presente |
| — | Typecheck | ✅ sem erros novos |

## Deviations from plan.md / brief.md

Nenhum — execução seguiu o plan.md exatamente como escrito. O teste do caso 7 acabou reaproveitando, sem querer, um frete `DRAFT` que já existia de um teste anterior da S1-T3 (nunca publicado) — serviu como confirmação real (não só teórica) de que o filtro de status funciona.

## Out of scope (confirmed, per brief.md)

- Entrar na fila de propostas
- Endereço completo pós-seleção
- Gate de verificação/frota pra navegar

## Follow-ups

Nenhum — Sprint 1 completo após esta task.
