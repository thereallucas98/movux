# S1-T3 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Resultado |
|---|---|---|
| 1 | Create mesmo cluster | ✅ 201, `suggestedPriceInCents = 23000` (15000 base + 2×4000 HELPER) |
| 2 | Create sem `neighborhoodId` | ✅ 400 |
| 3 | Publish DRAFT→OPEN | ✅ 200 |
| 4 | Publish já OPEN | ✅ 409 `INVALID_STATE_TRANSITION` |
| 5 | Get do dono | ✅ 200, com `addresses`(2) + `modifiers`(1) |
| 6 | Get de outro customer | ✅ 404 |
| 7 | List (só os próprios) | ✅ 200 |
| 8 | Swagger (3 paths) | ✅ |
| extra | Create cross-cluster, DELIVERY | ✅ `suggestedPriceInCents = 4000` (tier 1) |
| — | Typecheck do código tocado | ✅ sem erros novos |

## Deviations from plan.md / brief.md

1. **Descobri e adotei o padrão `errorResponse`/`ERROR_MAP`** (`server/http/error-response.ts`) já estabelecido nas tasks antigas (02-16) — centraliza o mapeamento código→status HTTP. Não estava sendo usado em S0-T2 (auth routes usam `NextResponse.json` manual); não voltei lá pra refatorar (fora de escopo), mas todas as rotas novas desta task usam o padrão certo. Adicionei 3 códigos novos ao `ERROR_MAP`: `CUSTOMER_PROFILE_NOT_FOUND` (404), `INVALID_ADDRESS` (400), `NO_PRICING_AVAILABLE` (422).
2. **`ShipmentAddressInput` virou schema compartilhado no Swagger** (`components.schemas`) em vez de inline duas vezes (origin/destination) — só uma pequena limpeza, não estava no plan.md original mas é natural dado que o mesmo shape se repete.

## Out of scope (confirmed, per brief.md)

- Edição de DRAFT (`PATCH`)
- Upload de fotos
- Visibilidade pra carrier/admin (S1-T4)
- Cancelamento

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| S0-T2 auth routes não usam `errorResponse`/`ERROR_MAP` | Refatorar pra consistência, se/quando mexer nessas rotas de novo | Oportunista, não urgente |
| `expiresAt` do shipment fica sempre `null` | Definir política de expiração automática + job de background | Fase 2+ (fora do Sprint 1) |
