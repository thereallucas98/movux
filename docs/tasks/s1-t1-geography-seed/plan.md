# S1-T1 — Plan

## Pré-requisito descoberto: unique constraints faltando

Pra seed ser idempotente (`upsert`), Prisma precisa de um campo `@unique` pra casar contra. O schema atual (S0-T1) não tem nenhum — foi proposital na época, pra ficar estrito ao mapeamento do `DATABASE-DESIGN.md` sem inventar constraints não especificadas. Agora que a idempotência é um requisito real (acceptance criteria do brief), adiciono:

- `state.uf` → `@unique` (UF é único por natureza)
- `city.ibgeCode` → `@unique` (código IBGE de município é único nacionalmente)
- `neighborhood` → `@@unique([cityId, name])` (nome de bairro é único dentro da cidade, não globalmente)
- `neighborhoodCluster` já tem `@@unique([cityId, slug])` desde S0-T1 — nenhuma mudança necessária ali

## Ordem de execução

1. Adicionar os 3 unique constraints acima no `schema.prisma`
2. `pnpm prisma migrate dev --name add_geography_unique_constraints`
3. Apagar `prisma/seed/categories.ts`, `specialties.ts`, `populate.ts` (Turnora, referenciam models que não existem mais)
4. Criar `prisma/seed/geography.ts`:
   - `upsert` do `state` (Paraíba/PB)
   - `upsert` da `city` (João Pessoa)
   - `upsert` dos 17 `neighborhood` (com `classification`)
   - `upsert` dos 5 `neighborhoodCluster`
   - `upsert` dos vínculos `clusterNeighborhood` (M:N)
5. Atualizar `package.json`: `"db:seed": "tsx prisma/seed/geography.ts"`
6. Rodar `pnpm db:seed` duas vezes seguidas — confirmar que a segunda rodada não duplica nem falha
7. Verificar contagens via `psql`

## Arquivos alterados

```
apps/web/
  prisma/
    schema.prisma                          — +3 unique constraints
    migrations/<ts>_add_geography_unique_constraints/  — nova
    seed/
      geography.ts                          — novo
      categories.ts                         — apagado
      specialties.ts                        — apagado
      populate.ts                           — apagado
  package.json                              — script db:seed atualizado
```

## Dados (do brief.md)

State: Paraíba / PB / IBGE 25
City: João Pessoa / IBGE 2507507

| Cluster (slug) | Bairros | Classification |
|---|---|---|
| orla-norte | Manaíra, Tambaú, Bessa | UPSCALE |
| orla-sul | Cabo Branco, Miramar, Jardim Oceania | UPSCALE |
| centro-expandido | Centro, Torre, Tambauzinho, Jaguaribe, Bairro dos Estados | MIDDLE |
| zona-sul | Bancários, José Américo, Água Fria | MIDDLE |
| zona-norte | Mangabeira, Cristo Redentor, Padre Zé | POPULAR |
