# S3-T2 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Collect sem nenhum safety check-in | 409 `SAFETY_NOT_CONFIRMED` | ✅ |
| 2 | Collect com só 1 dos 2 confirmados | 409 `SAFETY_NOT_CONFIRMED` | ✅ |
| 3 | Collect por carrier perdedor (não selecionado) | 404 | ✅ |
| 4 | Transit antes de collect | 409 `INVALID_STATE_TRANSITION` | ✅ |
| 5 | Collect com os dois confirmados | 200, `Shipment.status: COLLECTED` | ✅ |
| 6 | Deliver antes de transit | 409 `INVALID_STATE_TRANSITION` | ✅ |
| 7 | Transit | 200, `Shipment.status: IN_TRANSIT` | ✅ |
| 8 | Deliver | 200, `Shipment.status: DELIVERED` | ✅ |
| 9 | Collect de novo após DELIVERED | 409 | ✅ |
| 10 | Swagger — 3 endpoints sob `Transit` | presentes | ✅ |

Todos os 10 casos do `qa-roteiro.md` passaram de primeira, sem achados de bug. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S3-T1, todos pré-existentes no código legado do Turnora. Zero erros novos em arquivos de `transit`/`collect`/`deliver`/`safety`/`shipment`/`proposal`.

## Desvios encontrados durante execução

Nenhum. Task de baixa complexidade — todos os métodos de repositório necessários já existiam (`findStatusById`, `updateStatus`, `findAcceptedByShipment`, `safetyCheckInRepo.findByShipment`), reaproveitados sem alteração. Único código novo: `SAFETY_NOT_CONFIRMED` (409) e o helper `resolveSelectedCarrier` (deliberadamente separado do `resolveSafetyParticipant` da S3-T1, já que este domínio não precisa do campo `role`).

## Acceptance criteria (brief.md)

- [x] `POST /collect` com as duas confirmações de segurança → `Shipment.status: COLLECTED`
- [x] `POST /collect` sem as duas confirmações → 409 `SAFETY_NOT_CONFIRMED`
- [x] `POST /collect` por carrier não-selecionado → 404
- [x] `POST /transit` a partir de `COLLECTED` → `Shipment.status: IN_TRANSIT`
- [x] `POST /deliver` a partir de `IN_TRANSIT` → `Shipment.status: DELIVERED`
- [x] Qualquer transição fora de ordem → 409 `INVALID_STATE_TRANSITION`
- [x] Swagger documenta os 3 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

Nenhum.
