# S3-T3 — Research

## Decision Log

### Fonte do timestamp "virou DELIVERED" (pro prazo de 24h)

**Decision:** Ideal — adicionar `Shipment.deliveredAt`, `collectedAt` e `inTransitAt` (todos `DateTime?`, nullable), setados em `mark-collected.use-case.ts`, `mark-in-transit.use-case.ts` e `mark-delivered.use-case.ts` (S3-T2, já commitada — pequeno ajuste retroativo nos 3 use-cases).

**Reason:** timestamps simétricos por transição dão rastreabilidade completa do lifecycle de trânsito sem depender de `updatedAt` (frágil — qualquer escrita futura no shipment reseta o relógio). `deliveredAt` é o único consumido diretamente por esta task (prazo de 24h); `collectedAt`/`inTransitAt` ficam disponíveis para consultas futuras (duração de cada etapa, métricas operacionais) sem exigir nova migration quando essa necessidade aparecer.

**Follow-up registrado:** quando a S3-T4 (`shipmentEvent`, audit log completo) existir, revisitar se esses 3 campos ficam redundantes com os eventos `COLLECTED`/`IN_TRANSIT`/`DELIVERED` do log — mesmo padrão de limpeza já aplicado aos campos `safetyTermCustomerAt`/`safetyTermCarrierAt` na S3-T1.

## Technical Analysis

- **Migration:** `Shipment.collectedAt`, `inTransitAt`, `deliveredAt` — todos `DateTime?`, nullable, sem default. Additive, não quebra nada existente.
- **Ajuste retroativo na S3-T2:** cada `mark-*.use-case.ts` passa a chamar `shipmentRepo.updateStatus` com o timestamp correspondente também setado — `updateStatus` (assinatura atual: `(id, status) => Promise<void>`) precisa aceitar um terceiro parâmetro opcional `{ [timestampField]: Date }`, ou os 3 use-cases passam a chamar um novo método `markCollectedAt`/`markInTransitAt`/`markDeliveredAt` no repo em vez do genérico `updateStatus`. Mais simples e explícito: 3 métodos novos dedicados no `ShipmentRepository`, cada um atualizando `status` + o timestamp correspondente numa única chamada — evita um `updateStatus` genérico com parâmetro opcional condicional.
- **`DeliveryConfirmationRepository` (novo):**
  ```ts
  findByShipment(shipmentId): Promise<DeliveryConfirmation | null>
  create(shipmentId, customerId, confirmed, issueDescription): Promise<DeliveryConfirmation>
  ```
- **Auto-confirm (lazy, mesmo padrão do `sweepExpiredProposals`):** helper `sweepAutoConfirmDelivery(repos, shipmentId)` — se `shipment.status === 'DELIVERED'`, `shipment.deliveredAt` existe, nenhum `DeliveryConfirmation` existe ainda, e `now() - deliveredAt >= 24h` → cria `DeliveryConfirmation` com `confirmed: true`, `customerId` do dono do shipment. Chamado no início dos 2 use-cases desta task (`confirm-delivery` e `get-delivery-confirmation-status`), igual ao `sweepExpiredProposals` ser chamado no início dos use-cases de proposta.
- **Resolução de acesso:** `POST` reaproveita o padrão `findStatusForOwner` (customer apenas, como `accept-proposal`). `GET` reaproveita `resolveSafetyParticipant` (S3-T1) diretamente — mesmo predicado exato ("dono ou carrier selecionado"), sem necessidade de um helper novo.

## Edge Cases

| Case | Behavior |
|---|---|
| `POST` com `confirmed: false` sem `issueDescription` | 400 validação (Zod `refine`) |
| `POST` chamado por quem não é o customer dono | 404 |
| `GET` chamado por carrier não-selecionado | 404 |
| Shipment não é `DELIVERED` | 409 `INVALID_STATE_TRANSITION` |
| `POST` duas vezes | 409 `ALREADY_CONFIRMED` (reaproveita o código da S3-T1) |
| `GET`/`POST` chamado > 24h depois de `deliveredAt`, sem confirmação prévia | sweep cria a confirmação automática antes de responder; `POST` subsequente vê o registro já existente → 409 `ALREADY_CONFIRMED` |
| `GET` chamado antes de qualquer confirmação e antes de 24h | `null` |

## Blockers

✅ No blockers — decisão resolvida, seguindo pro Plan.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3) — incluindo o ajuste retroativo na S3-T2.
