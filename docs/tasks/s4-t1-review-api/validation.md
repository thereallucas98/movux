# S4-T1 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Submit antes de `DELIVERED` (ainda `CARRIER_SELECTED`) | 409 `INVALID_STATE_TRANSITION` | ✅ |
| 2 | GET antes de qualquer review | `[]` | ✅ |
| 3 | Customer avalia o carrier com tag `CARRIER` | 201 | ✅ |
| 4 | Shipment continua `DELIVERED` (só 1 review) | confirmado | ✅ |
| 5 | Customer avalia de novo | 409 `ALREADY_REVIEWED` | ✅ |
| 6 | Carrier avalia com tag `targetRole: CARRIER` (errado — devia ser `CUSTOMER`) | 400 | ✅ |
| 7 | Carrier avalia com `tagId` inexistente | 400 | ✅ |
| 8 | `rating: 6` (fora de 1-5) | 400 | ✅ |
| 9 | Carrier avalia com tag `CUSTOMER` — completa o par | 201, `Shipment.status: REVIEWED` | ✅ |
| 10 | GET com as duas reviews | `revieweeId` cruzado corretamente (cada um aponta pro `User.id` do avaliado) | ✅ |
| 11 | Swagger — 2 endpoints sob `Reviews` | presentes | ✅ |

Todos os 11 casos do `qa-roteiro.md` passaram de primeira. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S3-T4, todos pré-existentes no código legado do Turnora. Zero erros novos em arquivos de `review`/`customer-profile`.

## Desvios encontrados durante execução

Nenhum desvio de comportamento. Três decisões de arquitetura/regra de negócio, todas registradas em `research.md` **antes** do Plan:

1. **Gate de elegibilidade é `DELIVERED`, não `REVIEWED`** — corrigindo uma contradição lógica no `DATABASE-DESIGN.md §10.1` (reviews não podiam depender de um status que elas mesmas produzem).
2. **`REVIEWED` dispara só quando as duas reviews existem** — mesmo padrão do `SAFETY_CONFIRMED` (S3-T4).
3. **QA precisou inserir 2 `ReviewTag` manualmente via SQL** — a S4-T3 (seed) ainda não existe; a lógica de validação de tags foi exercitada normalmente com as linhas manuais.

## Acceptance criteria (brief.md)

- [x] `POST /reviews` cria a review com `rating` e tags válidas do papel avaliado
- [x] `POST /reviews` com tag de `targetRole` errado ou inexistente → 400
- [x] `POST /reviews` de quem não é participante do frete → 404 (coberto pela reutilização de `resolveSafetyParticipant`, já validado nas tasks anteriores)
- [x] `POST /reviews` duas vezes pro mesmo papel → 409
- [x] `GET /reviews` retorna as reviews existentes (0, 1 ou 2) com as tags de cada uma
- [x] Swagger documenta os 2 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

- S4-T3 (seed de `ReviewTag`) deve substituir as 2 linhas manuais inseridas durante esta QA por dados reais — sem impacto no código desta task.
