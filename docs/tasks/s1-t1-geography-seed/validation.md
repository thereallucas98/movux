# S1-T1 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| Critério | Resultado |
|---|---|
| Unique constraints adicionadas e migration aplicada | ✅ |
| `pnpm db:seed` roda sem erro | ✅ |
| Idempotente (2 rodadas seguidas, mesma contagem) | ✅ `{ states: 1, cities: 1, neighborhoods: 17, clusters: 5 }` nas duas |
| 1 `state` (PB) + 1 `city` (João Pessoa) com `ibgeCode` corretos | ✅ verificado via psql |
| 17 `neighborhood` com `classification` correta | ✅ |
| 5 `neighborhoodCluster` com vínculos corretos | ✅ |
| Typecheck do seed script | ✅ sem erros |

## Deviations from plan.md / brief.md

1. **Contagem de bairros: 17, não 15** — o brief.md original estimava "~15 bairros" antes de eu montar a lista curada real; a soma dos 5 clusters deu 17 (3+3+5+3+3). Corrigido em brief.md/plan.md/todo.md para refletir o dado real, não o número estimado.
2. **`pnpm prisma migrate dev` não funciona neste ambiente (não-interativo)** — mesmo com tabelas vazias, o Prisma exige confirmação interativa sempre que uma migration adiciona `UNIQUE` constraint (mesmo sem risco real de dado duplicado). Usei o mesmo workaround da S0-T1: gerei o SQL via `prisma migrate diff --from-config-datasource ... --to-schema ... --script`, criei a pasta de migration manualmente, e apliquei via `prisma migrate deploy` (não-interativo). Resultado idêntico ao que `migrate dev` teria gerado.
3. **`db:seed` precisou de `dotenv -e .env --`** — `tsx` não carrega `.env` automaticamente (diferente do Next.js dev server); sem isso, `DATABASE_URL` não é encontrada. Segui o mesmo padrão já usado em `test:api`/`test:api:ui` no `package.json`.

## Out of scope (confirmed, per brief.md)

- Outras cidades
- Dados de pricing (S1-T2)
- Endpoint de API para consultar geografia
- IBGE code por bairro (campo nullable, sem código oficial no Brasil)

## Follow-ups

Nenhum — task pequena e autocontida.
