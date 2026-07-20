# S4-T2 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Carrier A — 1 review (rating 5) | `avgRating 5.00, isActive t, isFlagged f` | ✅ |
| 2 | Carrier B — 2 reviews (4, 3) — boundary `avgRating = 3.5` exato | `avgRating 3.50, isActive t, isFlagged t` | ✅ |
| 3 | Carrier C — 2 reviews (2, 3) | `avgRating 2.50, isActive f, isFlagged t` | ✅ |
| 4 | Carrier avalia o customer | `CustomerProfile.avgRating` atualizado, sem `isActive`/`isFlagged` (campos não existem nessa tabela) | ✅ |
| 5 | Regressão — comportamento do S4-T1 (`ALREADY_REVIEWED`) | 409, igual antes do retrofit | ✅ |

Todos os 5 casos do `qa-roteiro.md` passaram de primeira, incluindo o boundary exato (`avgRating = 3.5` mantendo `isActive: true`, confirmando que a regra é `< 3.5` e não `<= 3.5`). Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S4-T1, todos pré-existentes no código legado do Turnora. Zero erros novos em arquivos de `review`/`carrier-profile`/`customer-profile`.

## Desvios encontrados durante execução

Nenhum desvio de comportamento. Uma decisão de arquitetura, registrada em `research.md` **antes** do Plan:

- **`CarrierProfile.isFlagged` (novo campo)** — implementa a regra "admin flag" pra `avgRating < 4.0` do `DATABASE-DESIGN.md §12`, que não tinha nenhuma infraestrutura antes. Bidirecional (liga/desliga a cada recálculo), diferente do `isActive` (auto-suspensão em `< 3.5`), que é só de mão única por design — reativar um carrier suspenso continua manual.

## Acceptance criteria (brief.md)

- [x] Após uma review nova, `avgRating` do avaliado é recalculado corretamente (média simples de todas as reviews recebidas, incluindo fretes anteriores — confirmado nos casos 2 e 3, cada um com 2 reviews de fretes diferentes)
- [x] Carrier com `avgRating` resultante `< 3.5` → `CarrierProfile.isActive` vira `false`
- [x] Carrier com `avgRating >= 3.5` → `isActive` inalterado (confirmado no boundary exato de 3.5)
- [x] Customer nunca tem `isActive` alterado (campo nem existe em `CustomerProfile`)
- [x] Comportamento de `submit-review` (S4-T1) permanece intacto

## Follow-ups

- `isFlagged` fica pronto no banco pra um dashboard de admin (Sprint 5+) consumir; nenhuma UI/API de leitura foi criada nesta task (fora de escopo).
