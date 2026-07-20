# TODO: S8-T2 — Carrier: Fretes e Propostas

**Date**: 2026-07-20
**Phase**: EXECUTION
**Status**: IN_PROGRESS

---

## Implementation Checklist

### Step 1: Contexto GraphQL (bloqueador)

- [x] **1.1** `server/graphql/context.ts` — adicionar `proposalQueueRepo`, `proposalRepo`, `notificationLogRepo`, `shipmentEventRepo` à interface `GraphQLContext.repos`
- [x] **1.2** `server/graphql/context.ts` — wireá-los em `createGraphQLContext`

### Step 2: Repositório e use-case novos

- [x] **2.1** `server/repositories/shipment.repository.ts` — exportar `BROWSE_SELECT` como `SHIPMENT_BROWSE_SELECT`
- [x] **2.2** `server/repositories/proposal-queue.repository.ts` — tipo `CarrierQueueEntryRow` + método `listByCarrier` (interface + implementação, cursor pagination)
- [x] **2.3** `server/use-cases/shipments/queue/list-my-queue-entries.use-case.ts` (novo)
- [x] **2.4** Exportar `listMyQueueEntries` em `server/use-cases/index.ts`

### Step 3: Enums Pothos

- [x] **3.1** `server/graphql/enums/proposal.enum.ts` (novo) — `QueueEntryStatusEnum`, `ProposalStatusEnum`, `ResponseTypeEnum`

### Step 4: Types Pothos

- [x] **4.1** `server/graphql/types/browse-shipment.type.ts` (novo) — `BrowseAddressType`, `BrowseShipmentType`, `BrowseShipmentConnectionType`, `toGraphQLBrowseShipment`
- [x] **4.2** `server/graphql/types/proposal.type.ts` (novo) — `ProposalAttemptType`, `ProposalType`
- [x] **4.3** `server/graphql/types/queue-entry.type.ts` (novo) — `QueueEntryType`, `CarrierQueueEntryType`, `CarrierQueueEntryConnectionType`

### Step 5: Queries

- [x] **5.1** `server/graphql/queries/browse-shipments.query.ts` (novo) — `browseShipments`
- [x] **5.2** `server/graphql/queries/queue.query.ts` (novo) — `myQueueEntry`, `myProposals`
- [x] **5.3** `server/graphql/queries/proposal.query.ts` (novo) — `myProposal`

### Step 6: Mutations

- [x] **6.1** `server/graphql/mutations/queue.mutation.ts` (novo) — `joinProposalQueue`, `withdrawFromQueue`
- [x] **6.2** `server/graphql/mutations/proposal.mutation.ts` (novo) — `SubmitProposalInput`, `AddProposalAttemptInput`, `submitProposal`, `addProposalAttempt`, `withdrawProposal`

### Step 7: Wiring e checkpoint de schema

- [x] **7.1** `server/graphql/schema.ts` — imports dos 3 enums, 3 types, 3 queries, 2 mutations novos
- [x] **7.2** `pnpm lint`/`pnpm typecheck` escopo isolado dos arquivos GraphQL novos — limpo
- [x] **7.3** `pnpm codegen` (export-graphql-schema + graphql-codegen) — schema exporta sem erro

### Step 8: Operações GraphQL do client + codegen

- [x] **8.1** `graphql/operations/shipments/browse-shipments.graphql`
- [x] **8.2** `graphql/operations/proposals/{my-queue-entry,my-proposals,my-proposal}.graphql`
- [x] **8.3** `graphql/operations/proposals/{join-proposal-queue,withdraw-from-queue,submit-proposal,add-proposal-attempt,withdraw-proposal}.graphql`
- [x] **8.4** `pnpm codegen` — gera tipos/documentos sem erro

### Step 9: Hooks React Query

- [x] **9.1** `graphql/hooks/use-browse-shipments.ts`
- [x] **9.2** `graphql/hooks/use-queue-entry.ts`
- [x] **9.3** `graphql/hooks/use-my-proposals.ts`
- [x] **9.4** `graphql/hooks/use-my-proposal.ts`
- [x] **9.5** `graphql/hooks/use-join-queue.ts` (+ `ERROR_MESSAGES` PT-BR)
- [x] **9.6** `graphql/hooks/use-withdraw-queue.ts` (+ `ERROR_MESSAGES` PT-BR)
- [x] **9.7** `graphql/hooks/use-submit-proposal.ts` (+ `ERROR_MESSAGES` PT-BR)
- [x] **9.8** `graphql/hooks/use-add-proposal-attempt.ts` (+ `ERROR_MESSAGES` PT-BR)
- [x] **9.9** `graphql/hooks/use-withdraw-proposal.ts` (+ `ERROR_MESSAGES` PT-BR)

### Step 10: Componentes

- [x] **10.1** `components/features/proposals/resolve-card-action.ts` — função pura, matriz de estado→ação
- [x] **10.2** `components/features/proposals/queue-status-badge.tsx`
- [x] **10.3** `components/features/proposals/proposal-status-badge.tsx`
- [x] **10.4** `components/features/proposals/proposal-form-dialog.tsx`
- [x] **10.5** `components/features/proposals/withdraw-confirm-dialog.tsx`
- [x] **10.6** `components/features/shipments/browse-shipment-card.tsx`

### Step 11: Páginas

- [x] **11.1** `app/carrier/shipments/page.tsx` — filtro + lista de cards de browse
- [x] **11.2** `app/carrier/proposals/page.tsx` — lista de `myProposals` + ações + `EmptyState`
- [x] **11.3** `app/carrier/dashboard/page.tsx` — atalho + resumo

### Step 12: Validation

- [x] **12.1** `pnpm lint` escopo isolado desta task — limpo
- [x] **12.2** `pnpm typecheck` escopo isolado desta task — limpo
- [x] **12.3** QA manual no navegador (roteiro no chat, Fase 5)
- [x] **12.4** `validation.md` registrado após aprovação do QA

## Não previsto no plan original (necessário durante a Execution)

- [x] `components/ui/masked-input.tsx` — `CurrencyInput` novo (preço da proposta digitado em centavos, formatado como BRL em tempo real — mesmo motivo do `S8-T1`: `type="number"` descarta vírgula decimal)
- [x] `components/features/proposals/shipment-action-button.tsx` (novo, não estava no plan) — único ponto que resolve fila+proposta (2 queries) e decide os botões via `resolveCardAction`; reaproveitado tanto no card de browse quanto na lista de propostas, em vez de duplicar essa lógica nos dois lugares
- [x] `components/features/shipments/browse-shipments-list.tsx` (novo) — lista com filtro de cidade/tipo (cidade derivada do catálogo de bairros já existente, sem query nova)
- [x] `components/features/proposals/my-proposals-list.tsx` (novo) — lista da tela `/carrier/proposals`
- [x] `server/schemas/sla-hours.schema.ts` (novo) — corrige bug real de mensagem técnica do Zod (`z.union` + `zodResolver`) encontrado no QA, também aplicado em `shipment.schema.ts` (bug dormente do S8-T1)
- [x] Botões de ação dos cards movidos pro `CardFooter` + `size="sm"` — feedback do usuário pós-QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1–1.2 | ✅ | |
| 2.1–2.4 | ✅ | |
| 3.1 | ✅ | |
| 4.1–4.3 | ✅ | |
| 5.1–5.3 | ✅ | |
| 6.1–6.2 | ✅ | |
| 7.1–7.3 | ✅ | |
| 8.1–8.4 | ✅ | |
| 9.1–9.9 | ✅ | |
| 10.1–10.6 | ✅ | |
| 11.1–11.3 | ✅ | |
| 12.1–12.4 | ✅ | |
| 12.3–12.4 | ⬜ | Aguardando QA manual no navegador |
