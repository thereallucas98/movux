# S4-T3 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `pnpm db:seed` roda sem erro | `[seed:review-tags] done { count: 10 }` | ✅ |
| 2 | 10 tags no banco com `targetRole` correto | confirmado | ✅ |
| 3 | Idempotência — rodar `pnpm db:seed` de novo | sem erro, sem duplicata | ✅ |
| 4 | Review real usando `tagId` de uma tag do seed | 201 | ✅ |

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S4-T2, todos pré-existentes no código legado do Turnora. Zero erros novos em `prisma/seed/review-tags.ts`.

## Desvios encontrados durante execução

### Linha residual de QA anterior não absorvida pelo upsert

`SELECT count(*) FROM "reviewTag"` retornou **11**, não 10. Causa: a QA manual da S4-T1 tinha inserido uma linha `code: 'PUNCTUAL', target_role: CUSTOMER` — como a decisão desta task (Research) renomeou o code real pra `PUNCTUAL_CUSTOMER` (pra evitar a colisão com o carrier), o `upsert` por `code` não reconhece a linha antiga como a mesma e cria a nova ao lado, deixando a `PUNCTUAL` manual órfã. A tentativa de removê-la manualmente falhou: ela está referenciada por uma `ReviewTagSelection` de uma review criada durante a QA da S4-T2 (`onDelete: Restrict` na FK). Como é dado de teste local (não produção) e as 10 tags reais do seed foram criadas e validadas corretamente (caso 2 e 4), não bloqueia a entrega — registrado como observação, sem ação necessária (a linha `CAREFUL_WITH_ITEMS`, que manteve o mesmo `code`, foi absorvida normalmente pelo `upsert`, confirmando que o mecanismo funciona quando o `code` não muda).

## Acceptance criteria (brief.md)

- [x] `pnpm db:seed` roda o novo script sem erro, cria as 10 tags (ajustadas)
- [x] Rodar `pnpm db:seed` de novo não duplica nem falha (idempotente)
- [x] Cada tag tem `targetRole` correto conforme a lista
- [x] Registrado em `package.json#db:seed`, encadeado com os seeds existentes

## Follow-ups

Nenhum.
