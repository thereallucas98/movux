# S4-T3 — Research

## Decision Log

### Colisão de `code` entre `PUNCTUAL` (carrier) e `PUNCTUAL` (customer)

**Decision:** renomear os `code` internos — `PUNCTUAL_CARRIER` e `PUNCTUAL_CUSTOMER` — mantendo o mesmo `label` PT-BR ("Pontual") pros dois.

**Reason:** `code` nunca é exibido ao usuário nem referenciado por valor literal em nenhuma lógica de negócio (confirmado por grep em toda a Exploration) — é só um identificador interno/seed. Renomear resolve a colisão sem exigir migration nem mudar a constraint `@unique` já existente no schema, mantendo o menor blast radius possível pra uma task de seed.

## Technical Analysis

- **Arquivo novo:** `prisma/seed/review-tags.ts`, seguindo exatamente o padrão de `prisma/seed/pricing.ts` (array tipado → `upsert` por `code` → `main()` com `.catch`/`.finally`).
- **Dados finais (10 tags):**

  | `code` | `label` | `targetRole` |
  |---|---|---|
  | `CAREFUL_WITH_ITEMS` | Cuidadoso com os itens | `CARRIER` |
  | `PUNCTUAL_CARRIER` | Pontual | `CARRIER` |
  | `COMMUNICATIVE` | Comunicativo | `CARRIER` |
  | `CLEAN_VEHICLE` | Veículo limpo | `CARRIER` |
  | `PROFESSIONAL` | Profissional | `CARRIER` |
  | `PUNCTUAL_CUSTOMER` | Pontual | `CUSTOMER` |
  | `CLEAR_DESCRIPTION` | Descrição clara dos itens | `CUSTOMER` |
  | `EASY_ACCESS` | Acesso fácil | `CUSTOMER` |
  | `RESPECTFUL` | Respeitoso | `CUSTOMER` |
  | `ITEMS_READY` | Itens prontos pra coleta | `CUSTOMER` |

- **Idempotência:** `upsert({ where: { code }, create: {...}, update: { label, targetRole, isActive: true } })` — absorve as 2 linhas manuais da QA da S4-T1 (mesmos `code`/`targetRole`, valores batem, nenhuma duplicata criada).
- **`package.json#db:seed`:** encadear `&& dotenv -e .env -- tsx prisma/seed/review-tags.ts` no final da linha existente.

## Edge Cases

| Case | Behavior |
|---|---|
| Rodar `pnpm db:seed` 2x seguidas | 2ª rodada não duplica nem falha (upsert por `code`) |
| Linhas manuais da QA da S4-T1 já existentes | absorvidas pelo `upsert` (mesmo `code`, mesmos valores) |

## Blockers

✅ No blockers — decisão resolvida em chat.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
