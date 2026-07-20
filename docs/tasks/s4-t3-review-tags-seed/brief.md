# S4-T3 — Review Tags Seed

**Sprint:** 4 — Reviews & Ratings
**Status:** pending
**Depends on:** S4-T1 (Review API) — a validação de tags já está em produção, só faltam os dados reais

---

## User story

Como plataforma, quero ter as tags predefinidas de review (carrier e customer) cadastradas no banco, pra que o fluxo de review da S4-T1 funcione com dados reais em vez das linhas manuais inseridas via SQL durante a QA daquela task.

## Escopo

Script de seed idempotente (`prisma/seed/review-tags.ts`), seguindo o padrão já estabelecido em `prisma/seed/geography.ts`/`pricing.ts` (`upsert` por chave única, `main()` + `.catch()`/`.finally()`, registrado em `package.json#db:seed`).

## Dados (`DATABASE-DESIGN.md §10.2`)

**Carrier tags:** `CAREFUL_WITH_ITEMS`, `PUNCTUAL`, `COMMUNICATIVE`, `CLEAN_VEHICLE`, `PROFESSIONAL`
**Customer tags:** `PUNCTUAL`, `CLEAR_DESCRIPTION`, `EASY_ACCESS`, `RESPECTFUL`, `ITEMS_READY`

## Conflito encontrado — `code` duplicado entre as duas listas

`ReviewTag.code` tem `@unique` **global** no schema (`prisma/schema.prisma`), não `@@unique([code, targetRole])`. A lista de `DATABASE-DESIGN.md §10.2` usa `PUNCTUAL` tanto pro lado carrier quanto pro lado customer — inserir os dois como estão especificados viola a constraint (reproduzido literalmente durante a QA manual da S4-T1: `duplicate key value violates unique constraint "reviewTag_code_key"`). Decisão de como resolver (renomear um dos códigos, ou mudar a constraint) registrada na Research.

## Regras

1. Script idempotente — rodar de novo não duplica nem falha (via `upsert` por `code`)
2. Todas as 10 tags (5+5, ajustando a colisão) com `isActive: true`
3. Labels em PT-BR, conforme convenção de UI strings do projeto (`CLAUDE.md`)

## Out of scope

- UI de seleção de tags no formulário de review — não existe frontend ainda (API-first)
- Endpoint de listagem de tags disponíveis (`GET /review-tags` ou similar) — não pedido no `ROADMAP.md`; se o frontend precisar descobrir as tags disponíveis dinamicamente, é uma task futura
- Migrar/limpar as 2 linhas manuais inseridas durante a QA da S4-T1 (`CAREFUL_WITH_ITEMS`/`PUNCTUAL`) — o `upsert` do seed absorve essas duas automaticamente (mesmo `code`, dados batem)

## Acceptance criteria

- [ ] `pnpm db:seed` roda o novo script sem erro, cria as 10 tags (ajustadas)
- [ ] Rodar `pnpm db:seed` de novo não duplica nem falha (idempotente)
- [ ] Cada tag tem `targetRole` correto conforme a lista acima
- [ ] Registrado em `package.json#db:seed`, encadeado com os seeds existentes

## Complexity

Low — é só um script de seed, mas o conflito de `code` único precisa de decisão antes do Plan.
