# S1-T2 — Todo

- [x] Criar `prisma/seed/pricing.ts` — buscar os 5 clusters existentes
- [x] Loop 25 pares × 2 tipos → upsert `pricingTemplate` (tier 0/1)
- [x] Upsert `pricingSnapshot` correspondente pra cada template
- [x] Seed dos 6 `pricingModifier` globais (findFirst + create condicional)
- [x] Atualizar `package.json` — `db:seed` roda `geography.ts && pricing.ts`
- [x] Rodar `pnpm db:seed` 2x seguidas — idempotente
- [x] Verificar via `psql`: 50 templates, 50 snapshots, 6 modifiers
