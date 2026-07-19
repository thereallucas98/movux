# S1-T2 — Pricing Seed

**Sprint:** 1 — Shipment API
**Status:** pending
**Depends on:** S1-T1 (geography)

---

## User story

Como sistema, preciso ter os corredores de preço (origem × destino × tipo de frete) e os modificadores de preço populados no banco, para que a criação de um frete (S1-T3) consiga calcular um `suggestedPriceInCents` sem depender de dado real de mercado ainda inexistente.

## Scope

### `pricingTemplate` — 50 corredores

- 25 pares de cluster (5×5, incluindo mesmo cluster — matriz completa, direção importa pro schema mas o preço é simétrico)
- × 2 `shipmentType`: `RESIDENTIAL_MOVING` e `DELIVERY` (as duas verticais de lançamento do `BUSINESS-FOUNDATION.md` §3 — `COMMERCIAL_FREIGHT` e `OTHER` ficam sem preço-base por enquanto, fora do escopo desta seed)
- `vehicleType = ANY` pra todos (preço não varia por veículo no template-base; isso é modelado depois via `carrierPricingConfig`/modifiers, não nesta seed)

**Fórmula de preço (2 tiers, sem dado real de distância ainda):**

| Tier | Regra | RESIDENTIAL_MOVING | DELIVERY |
|---|---|---|---|
| 0 | mesmo cluster (origem = destino) | R$ 150,00 | R$ 25,00 |
| 1 | clusters diferentes | R$ 250,00 | R$ 40,00 |

### `pricingModifier` — 6 modificadores globais (`cityId = null`)

| Code | Nome | Tipo | Valor |
|---|---|---|---|
| `FLOOR` | Andar sem elevador (por andar) | FIXED | R$ 15,00 |
| `HELPER` | Ajudante extra | FIXED | R$ 40,00 |
| `DISASSEMBLY` | Desmontagem de móveis | FIXED | R$ 30,00 |
| `PACKING` | Embalagem | FIXED | R$ 50,00 |
| `DIFFICULT_ACCESS` | Acesso difícil (rua estreita, sem vaga) | PERCENTAGE | 15% |
| `NIGHT_WEEKEND` | Horário noturno / fim de semana | PERCENTAGE | 20% |

### `pricingSnapshot` — 1 por template

- `basePriceInCents` = mesmo valor do `pricingTemplate` correspondente (sem sinais reais ainda, o snapshot inicial é o próprio valor seed)
- `sampleSize = 0`
- `lastTrigger = MANUAL`

Script idempotente (upsert), roda junto do `pnpm db:seed` (mesmo comando da S1-T1, adicionando este step).

## Out of scope

- `COMMERCIAL_FREIGHT` e `OTHER` no `pricingTemplate` (sem preço-base por enquanto — frete desses tipos precisará de cotação manual até termos dado real)
- Preço diferenciado por `vehicleType` no template-base
- `carrierPricingConfig` (config por transportador — não é seed, é criado pelo carrier depois)
- `pricingSignal` (log de eventos reais — só existe depois que fretes acontecerem)
- Fórmula de distância real (tiers são um placeholder até termos geocoding real ligado ao endereço)

## Acceptance criteria

- [ ] `pnpm db:seed` cria 50 `pricingTemplate` (25 corredores × 2 tipos)
- [ ] 6 `pricingModifier` globais criados
- [ ] 50 `pricingSnapshot` criados (1 por template, `sampleSize = 0`)
- [ ] Idempotente (rodar 2x não duplica)
- [ ] Verificado via `psql`

## Complexity

Low-Medium — volume maior que S1-T1 (50 templates vs 17 bairros), mas é geração programática (loop sobre os pares de cluster), não hand-typed linha a linha.
