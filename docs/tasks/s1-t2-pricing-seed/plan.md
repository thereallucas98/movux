# S1-T2 — Plan

## Nota sobre idempotência do `pricingModifier`

`pricingTemplate` já tem `@@unique([originClusterId, destinationClusterId, shipmentType, vehicleType])` e `pricingSnapshot` já tem `templateId @unique` (ambos definidos na S0-T1) — `upsert()` funciona direto pros dois.

`pricingModifier` **não tem** unique constraint. Não vou adicionar um `@@unique([cityId, code])` porque, no Postgres, `NULL` conta como distinto de `NULL` em constraint único — não bloquearia duplicata de modificador global (`cityId = null`), que é exatamente o caso que estou semeando agora. Resolver isso direito exigiria um índice parcial (`WHERE city_id IS NULL`), que o Prisma schema DSL não expressa (mesma limitação documentada na S0-T1 pro `companyMembership`). Como ainda não existe necessidade real de modificador por cidade (só temos 1 cidade), não vou adicionar constraint nenhuma agora — o seed script garante idempotência sozinho via `findFirst` + `create` condicional, sem depender de constraint de banco.

## Ordem de execução

1. Criar `prisma/seed/pricing.ts`:
   - Buscar os 5 `neighborhoodCluster` (por `slug`, já existentes da S1-T1)
   - Loop sobre os 25 pares (origem × destino) × 2 `shipmentType` (`RESIDENTIAL_MOVING`, `DELIVERY`) → `upsert` `pricingTemplate` (tier 0 se origem=destino, tier 1 se diferente) → `upsert` `pricingSnapshot` correspondente (`basePriceInCents` = mesmo valor, `sampleSize: 0`, `lastTrigger: MANUAL`)
   - Seed dos 6 `pricingModifier` globais (`cityId: null`) via `findFirst({ code, cityId: null })` + `create` condicional
2. Atualizar `package.json`: `"db:seed": "dotenv -e .env -- tsx prisma/seed/geography.ts && dotenv -e .env -- tsx prisma/seed/pricing.ts"` (pricing depende dos clusters já existirem — ordem importa)
3. Rodar `pnpm db:seed` duas vezes seguidas — confirmar idempotência
4. Verificar contagens via `psql`

## Arquivos alterados

```
apps/web/
  prisma/seed/pricing.ts   — novo
  package.json             — db:seed roda geography.ts && pricing.ts
```

## Tabela de preços (do brief.md)

| Tier | RESIDENTIAL_MOVING | DELIVERY |
|---|---|---|
| 0 (mesmo cluster) | 15000 (R$ 150,00) | 2500 (R$ 25,00) |
| 1 (clusters diferentes) | 25000 (R$ 250,00) | 4000 (R$ 40,00) |

## Modificadores (do brief.md)

| Code | Tipo | Valor |
|---|---|---|
| FLOOR | FIXED | 1500 |
| HELPER | FIXED | 4000 |
| DISASSEMBLY | FIXED | 3000 |
| PACKING | FIXED | 5000 |
| DIFFICULT_ACCESS | PERCENTAGE | 1500 (15%) |
| NIGHT_WEEKEND | PERCENTAGE | 2000 (20%) |
