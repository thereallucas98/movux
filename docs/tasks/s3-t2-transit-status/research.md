# S3-T2 — Research

## Decision Log

Nenhuma decisão de arquitetura pendente — a Exploration não encontrou ambiguidade. Todos os métodos de repositório necessários já existem (reaproveitados da S3-T1); a única escolha de design (3 use-cases separados vs. 1 genérico parametrizado) segue o precedente já estabelecido na S2-T4 (`accept`/`reject` como arquivos distintos), sem tradeoff novo a resolver.

## Technical Analysis

- **Resolução do carrier:** novo helper dedicado `resolve-selected-carrier.ts` (não o `resolveSafetyParticipant` da S3-T1, que devolve `role` — irrelevante aqui, já que só `CARRIER` age nesta task):
  ```ts
  async function resolveSelectedCarrier(repos, userId, shipmentId): Promise<{status: ShipmentStatus} | null> {
    const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
    if (!shipment) return null
    const accepted = await repos.proposalRepo.findAcceptedByShipment(shipmentId)
    if (!accepted || accepted.carrierId !== userId) return null
    return { status: shipment.status }
  }
  ```
- **`markCollected`:** `resolveSelectedCarrier` → `NOT_FOUND`; `status !== 'CARRIER_SELECTED'` → `INVALID_STATE_TRANSITION`; `safetyCheckInRepo.findByShipment` → precisa ter uma linha `role: CUSTOMER` E uma `role: CARRIER` → senão `SAFETY_NOT_CONFIRMED`; `shipmentRepo.updateStatus(id, 'COLLECTED')`.
- **`markInTransit`:** mesma resolução; `status !== 'COLLECTED'` → `INVALID_STATE_TRANSITION`; `updateStatus(id, 'IN_TRANSIT')`.
- **`markDelivered`:** mesma resolução; `status !== 'IN_TRANSIT'` → `INVALID_STATE_TRANSITION`; `updateStatus(id, 'DELIVERED')`.
- **Novo código de erro:** `SAFETY_NOT_CONFIRMED` → 409, em `error-response.ts` (`ErrorCode` + `ERROR_MAP`) e `graphql/errors.ts` (`Record` exaustivo).
- **Rotas:** `principal.role !== 'CARRIER'` → `FORBIDDEN` (gate de role único, como `queue/join`), depois o use-case decide `NOT_FOUND` se não é o carrier selecionado deste shipment.

## Edge Cases

| Case | Behavior |
|---|---|
| Caller não é `CARRIER` | 403 `FORBIDDEN` |
| Caller é `CARRIER` mas não é o selecionado deste shipment | 404 `NOT_FOUND` |
| Shipment não existe | 404 `NOT_FOUND` |
| `/collect` com só 1 dos 2 safety check-ins | 409 `SAFETY_NOT_CONFIRMED` |
| `/collect` com 0 check-ins | 409 `SAFETY_NOT_CONFIRMED` |
| `/transit` chamado com status ainda `CARRIER_SELECTED` (pulou `/collect`) | 409 `INVALID_STATE_TRANSITION` |
| `/deliver` chamado com status `COLLECTED` (pulou `/transit`) | 409 `INVALID_STATE_TRANSITION` |
| Qualquer endpoint chamado 2x seguidas (já no status alvo) | 409 `INVALID_STATE_TRANSITION` (idempotência não é objetivo aqui — mesma convenção do resto do domínio) |

## Blockers

✅ No blockers.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
