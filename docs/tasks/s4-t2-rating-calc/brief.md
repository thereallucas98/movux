# S4-T2 — Rating Recalculation

**Sprint:** 4 — Reviews & Ratings
**Status:** pending
**Depends on:** S4-T1 (Review API)

---

## User story

Como plataforma, quero que a média de avaliação (`avgRating`) do customer e do carrier seja recalculada automaticamente toda vez que uma review nova é enviada, pra que a reputação exibida sempre reflita as reviews recebidas — e pra que um carrier com nota muito baixa seja suspenso automaticamente.

## Escopo

Retrofit de **1 use-case já commitada**: `submit-review.use-case.ts` (S4-T1) ganha uma chamada a mais no fim do fluxo de sucesso — recalcula `avgRating` do **avaliado** (`revieweeId`) a partir de todas as reviews que ele já recebeu.

## Regras

1. `avgRating` = média aritmética simples de `Review.rating` onde `revieweeId` = o usuário avaliado (sem peso/decaimento — diferente do `pricingSignal`, que usa EMA; `DATABASE-DESIGN.md` não descreve nenhuma ponderação pra reviews)
2. Recalculado nos dois sentidos: se quem foi avaliado é um carrier, atualiza `CarrierProfile.avgRating`; se é um customer, atualiza `CustomerProfile.avgRating`
3. **Carrier:** `avgRating < 3.5` → `CarrierProfile.isActive = false` (auto-suspensão) — regra e valor exato já documentados no schema (`prisma/schema.prisma`, comentário do model `CarrierProfile`) e em `DATABASE-DESIGN.md §12`
4. **Customer:** nenhuma regra de suspensão — só a média é atualizada

## Out of scope

- `totalShipments` — não tem nenhum produtor no código hoje (não é incrementado em nenhuma use-case de shipment já commitada) e não é claramente a mesma coisa que "total de reviews recebidas" (um frete pode ser `DELIVERED` sem a outra parte deixar review). Fora do escopo desta task; não confundir com `avgRating`
- **"Admin flag" pra `avgRating < 4.0`** (`DATABASE-DESIGN.md §12`) — não existe nenhum campo, tabela ou mecanismo de notificação pra admin no schema atual. Decisão de como implementar (ou se adia) registrada na Research
- Reverter a suspensão automaticamente se a média subir depois — não modelado; reativação é presumivelmente manual via admin (Sprint 5, ainda não construído)
- Notificar o carrier quando suspenso — Sprint 6

## Acceptance criteria

- [ ] Após uma review nova, `avgRating` do avaliado é recalculado corretamente (média simples de todas as reviews que ele recebeu, incluindo as de fretes anteriores)
- [ ] Carrier com `avgRating` resultante `< 3.5` → `CarrierProfile.isActive` vira `false`
- [ ] Carrier com `avgRating >= 3.5` → `isActive` inalterado
- [ ] Customer nunca tem `isActive` alterado (campo nem existe em `CustomerProfile`)
- [ ] Comportamento de `submit-review` (S4-T1) permanece intacto — resposta, códigos de erro, QA anterior continuam válidos

## Complexity

Low-Medium — cálculo simples, mas precisa de um `CarrierProfileRepository` que ainda não existe (só `CustomerProfileRepository`, que também precisa de um método de update).
