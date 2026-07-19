# S1-T2 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| Critério | Resultado |
|---|---|
| 50 `pricingTemplate` (25 corredores × 2 tipos) | ✅ |
| 6 `pricingModifier` globais | ✅ |
| 50 `pricingSnapshot` (1 por template, `sampleSize=0`) | ✅ |
| Idempotente (2 rodadas seguidas) | ✅ `{ templates: 50, modifiers: 6 }` nas duas |
| Distribuição de preço correta (5 same-cluster + 20 cross-cluster por tipo) | ✅ verificado via psql |
| Typecheck do seed script | ✅ sem erros |

## Deviations from plan.md / brief.md

Nenhum desvio — execução seguiu o plan.md exatamente como escrito.

## Out of scope (confirmed, per brief.md)

- `COMMERCIAL_FREIGHT` e `OTHER` sem preço-base
- Preço por `vehicleType`
- `carrierPricingConfig` e `pricingSignal` (não são dado de seed)
- Fórmula de distância real (tiers são placeholder)

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| `pricingModifier` sem constraint de unicidade real (idempotência só no seed script) | Se algum dia existir modificador por cidade específica, revisitar com índice parcial `WHERE city_id IS NULL` via SQL bruto | Quando houver 2ª cidade com necessidade de override |
| Tiers de preço são um placeholder (2 níveis, sem distância real) | Substituir por cálculo real (Google Maps Distance Matrix ou geodésica entre clusters) quando o pricing engine (`pricingSignal`/`pricingSnapshot` recalculado) entrar em pauta | Fase 2+ do pricing engine |
