# S1-T1 — Todo

- [x] `state.uf` → `@unique`
- [x] `city.ibgeCode` → `@unique`
- [x] `neighborhood` → `@@unique([cityId, name])`
- [x] Migration `add_geography_unique_constraints` aplicada sem erros (via `migrate diff` + `migrate deploy`, `migrate dev` não funciona em ambiente não-interativo — ver validation.md)
- [x] Apagar `prisma/seed/categories.ts`, `specialties.ts`, `populate.ts`
- [x] Criar `prisma/seed/geography.ts` — upsert state (PB)
- [x] `geography.ts` — upsert city (João Pessoa)
- [x] `geography.ts` — upsert 17 neighborhoods com classification
- [x] `geography.ts` — upsert 5 neighborhoodCluster
- [x] `geography.ts` — upsert clusterNeighborhood (M:N)
- [x] Atualizar `package.json` → `db:seed` aponta pro novo script (com `dotenv -e .env --`, necessário pro `tsx` carregar `DATABASE_URL`)
- [x] Rodar `pnpm db:seed` 2x seguidas — idempotente (mesma contagem nas duas rodadas)
- [x] Verificar contagens via `psql` (1 state, 1 city, 17 neighborhoods, 5 clusters, vínculos corretos)
