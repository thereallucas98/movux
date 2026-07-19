# S1-T1 — Geography Seed

**Sprint:** 1 — Shipment API
**Status:** pending
**Depends on:** S0-T1 (schema)

---

## User story

Como sistema, preciso ter o catálogo geográfico de João Pessoa (estado, cidade, bairros, clusters) populado no banco, para que o motor de pricing (S1-T2) e o cadastro de endereços de frete (S1-T3) tenham dados reais pra referenciar.

## Scope

- Seed de 1 `state` (Paraíba / PB)
- Seed de 1 `city` (João Pessoa)
- Seed de 17 `neighborhood` conhecidos de João Pessoa, com `classification` (POPULAR / MIDDLE / UPSCALE)
- Seed de 5 `neighborhoodCluster` agrupando os bairros por região (M:N via `clusterNeighborhood`)
- Script idempotente (upsert), executável via `pnpm db:seed`
- Remover os scripts de seed antigos do Turnora (`prisma/seed/categories.ts`, `specialties.ts`, `populate.ts` — referenciam models que não existem mais) e o script `db:seed` no `package.json`

### Dataset curado (bairros reais de João Pessoa)

| Cluster | Bairros | Classification |
|---|---|---|
| Orla Norte | Manaíra, Tambaú, Bessa | UPSCALE |
| Orla Sul | Cabo Branco, Miramar, Jardim Oceania | UPSCALE |
| Centro Expandido | Centro, Torre, Tambauzinho, Jaguaribe, Bairro dos Estados | MIDDLE |
| Zona Sul | Bancários, José Américo, Água Fria | MIDDLE |
| Zona Norte | Mangabeira, Cristo Redentor, Padre Zé | POPULAR |

## Out of scope

- Outras cidades (Phase 2+ do produto)
- Dados de pricing (`pricingTemplate`, `pricingModifier` — S1-T2)
- Endpoint de API para consultar geografia (se necessário, é uma task futura)
- IBGE code por bairro (`neighborhood.ibgeCode` é nullable — bairro não tem código IBGE oficial no Brasil, só município)

## Acceptance criteria

- [ ] `pnpm db:seed` roda sem erro e é idempotente (rodar 2x não duplica nem falha)
- [ ] 1 `state` (PB) e 1 `city` (João Pessoa) criados com `ibgeCode` corretos
- [ ] 17 `neighborhood` criados com `classification` correta
- [ ] 5 `neighborhoodCluster` criados, cada um com os bairros vinculados via `clusterNeighborhood`
- [ ] Verificado via `psql`

## Complexity

Low — mapeamento direto de dados curados pro schema já existente (S0-T1).
