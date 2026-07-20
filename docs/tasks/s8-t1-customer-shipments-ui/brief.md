# S8-T1 — Customer: fretes (GraphQL + telas)

**Sprint:** 8 — UI (customer shipments)
**Status:** pending
**Depends on:** S1-T3 (Shipment API), S2-T4 (Customer accept), S0-T3 (App shell) — reaproveita middleware, layout e nav já existentes

---

## User story

Como customer, quero ver meus fretes e criar um novo frete pela interface, sem precisar do Insomnia/API direto.

## Decisões (aceitas pelo usuário, 2026-07-20)

| # | Decisão | Escolha |
|---|---|---|
| 1 | Fluxo inicial do Sprint 8 | Customer: dashboard + lista de fretes + criação de frete (em vez de carrier ou admin primeiro) |
| 2 | Data layer da UI nova | GraphQL (não REST) — hoje o schema Pothos só tem `tenant`/`me`, domínio Movux inexistente ali |
| 3 | Escopo do S8-T1 | Inclui criar as queries/mutations Pothos de shipment do zero, não só consumir |
| 4 | HTTP client do GraphQL | `graphql-request` + React Query — sem Axios; mantém a regra "no Axios" do CLAUDE.md como está |

## Telas

| Rota | Status atual | Descrição |
|---|---|---|
| `/customer/dashboard` | placeholder "Em breve" | Resumo — atalho pra criar frete + últimos fretes |
| `/customer/shipments` | placeholder "Em breve" | Lista de fretes do customer autenticado |
| `/customer/shipments/new` | placeholder "Em breve" | Formulário de criação de frete |

## Escopo GraphQL novo (Pothos)

- Query `myShipments` — lista fretes do customer autenticado (paginada)
- Query `shipment(id)` — detalhe de um frete
- Mutation `createShipment` — cria frete

Campos exatos e nomes de tipo Pothos ficam para a Research, com base no
schema Prisma real de `Shipment` (`docs/DATABASE-DESIGN.md`).

## Regras

1. Contexto do Pothos restringe `myShipments`/`shipment(id)` ao customer
   autenticado — nunca listar/mostrar frete de outro usuário.
2. Segue os campos e enums já definidos no Prisma — não inventar campo
   novo sem checar o schema primeiro.
3. Mobile-first (CLAUDE.md): `/customer/shipments/new` usa `min-h-12`
   touch targets, sticky bottom action bar, `Drawer` em vez de
   `Dialog`/`Select` em ≤720px.

## Out of scope

- Fluxo do carrier (buscar fretes abertos, propor) — próxima task (S8-T2)
- Fluxo do admin (verificação de documentos) — task futura (S8-T3)
- Página de detalhe do frete com timeline completa de eventos — avaliar
  na Plan se cabe nesta task ou vira S8-T1b
- Páginas de "verify"/"reset" de auth — mencionadas no CLAUDE.md mas nunca
  implementadas; não fazem parte do domínio de fretes

## Acceptance criteria

- [ ] Customer logado vê `/customer/dashboard` com atalho de criar frete
- [ ] `/customer/shipments` lista os fretes do customer autenticado
      (vazio → empty state; com dados → cards mobile / tabela desktop)
- [ ] `/customer/shipments/new` cria um frete válido e redireciona
- [ ] Formulário valida campos obrigatórios com Zod + react-hook-form,
      mostra erro de campo
- [ ] Erro de rede/servidor mostrado sem quebrar a tela (estado de erro
      do React Query)
- [ ] Responsivo: 375px, 720px, 1024px, 1440px, sem scroll horizontal
- [ ] `pnpm lint` e `pnpm build` passam

## Complexity

Medium — não é só UI: inclui schema Pothos novo (query/mutation), client
GraphQL layer (`graphql/hooks`, `graphql/operations`) que ainda não existe
no projeto, e telas com formulário mobile-first. Detalhamento de campos e
regras de validação fica para a Research.
