# Carrier — Fretes e Propostas (UI) — EXPLORATION

**Date**: 2026-07-20
**Phase**: EXPLORATION
**Status**: COMPLETE

---

## Context

A API REST do fluxo carrier (browse de fretes abertos, fila de propostas, envio/contra-oferta/desistência de proposta) foi construída e validada nos Sprints 1-2 (`S1-T4`, `S2-T1`, `S2-T2`), toda com use-cases isolados dos repositórios. O que falta é só a camada GraphQL (padrão Sprint 8, decisão `D-004`) + as 3 telas do carrier, que hoje são placeholders.

---

## Goals

- Confirmar que toda a regra de negócio necessária já existe em `server/use-cases/shipments/{browse-open-shipments,queue/*,proposals/*}` — nenhuma lógica nova no backend, só exposição
- Levantar exatamente quais repositórios faltam no `GraphQLContext` (bloqueador direto se não corrigido)
- Levantar o contrato exato dos 4 modelos Prisma envolvidos (`ProposalQueueEntry`, `Proposal`, `ProposalAttempt`) pra desenhar os GraphQL types
- Confirmar o padrão de autorização (role check) que os resolvers GraphQL precisam replicar
- Mapear os componentes de UI já validados no `S8-T1` que dá pra reaproveitar sem modificação

---

## Current Architecture

### Backend — já pronto, só falta expor

| Camada | Arquivo | Status |
|---|---|---|
| REST routes | `app/api/shipments/browse/route.ts`, `app/api/shipments/[shipmentId]/queue/{join,withdraw,me}/route.ts`, `app/api/shipments/[shipmentId]/proposal/{,attempts,withdraw}/route.ts` | ✅ prontos, validados (Sprints 1-2) |
| Use-cases | `browse-open-shipments.use-case.ts`; `queue/{join-proposal-queue,withdraw-proposal-queue,get-my-queue-entry}.use-case.ts`; `proposals/{submit-proposal,add-proposal-attempt,withdraw-proposal,get-my-proposal}.use-case.ts` | ✅ prontos, retornam union discriminada `{success, data|code}` — mesmo formato que `shipments.query.ts` já consome |
| Repos | `shipmentRepository.listOpenForBrowse`, `proposalQueueRepository`, `proposalRepository` | ✅ prontos |
| Validação | `server/schemas/proposal.schema.ts` (`SubmitProposalSchema`, `AddProposalAttemptSchema`) | ✅ pronto, reaproveitável no client (mesmo padrão do `CreateShipmentSchema` no `S8-T1`) |
| Erros | `server/graphql/errors.ts` `CODE_TO_MESSAGE` | ✅ já mapeia `ALREADY_IN_QUEUE`, `NOT_CALLED`, `ALREADY_PROPOSED`, `TOO_MANY_ATTEMPTS`, `INVALID_STATE_TRANSITION`, `NOT_FOUND` — nenhum código novo a adicionar |

### Backend — gaps reais

1. **`GraphQLContext.repos` não tem `proposalQueueRepo`, `proposalRepo`, `notificationLogRepo` nem `shipmentEventRepo`.** Os 4 já existem como export em `server/repositories/index.ts` (`proposalQueueRepository`, `proposalRepository`, `notificationLogRepository`, `shipmentEventRepository`) mas nunca foram adicionados ao `GraphQLContext` (`server/graphql/context.ts:37-65` e `:105-131`). Todo use-case de fila/proposta depende de pelo menos `queueRepo` + `userRepo` + `notificationLogRepo`; `submitProposal` também precisa de `shipmentEventRepo` e `customerProfileRepo` (esse último já está no context). **Sem esse fix, nenhum resolver novo compila/roda** — é o mesmo tipo de bug (repo faltando no context) que já apareceu no `S8-T1` com `customerProfileRepo`, então checar isso primeiro evita repetir o mesmo ciclo de debug.
2. **Os use-cases de fila/proposta não validam role internamente** — recebem `carrierId: string` cru e nunca consultam `carrierProfileRepo`. Quem garante que só um `CARRIER` chama isso é o check explícito `principal.role !== 'CARRIER'` em **toda** REST route (`browse/route.ts:11`, `queue/join/route.ts:19`, `proposal/route.ts:20,50`). Os resolvers GraphQL precisam replicar esse mesmo check explícito — diferente do `createShipment` (que não checa role porque o use-case falha sozinho via `customerProfileRepo` lookup), aqui não existe essa rede de segurança implícita.

### Modelos Prisma envolvidos (contrato exato pros GraphQL types)

```
ProposalQueueEntry: id, shipmentId, carrierId, status (QueueEntryStatus), position,
  calledAt?, exhaustedAt?, createdAt
Proposal: id, shipmentId, carrierId, queueEntryId, status (ProposalStatus),
  currentAttempt, customerSlaHours, carrierSlaHours, agreedSlaHours, expiresAt,
  createdAt, updatedAt, attempts: ProposalAttempt[]
ProposalAttempt: id, proposalId, attemptNumber, priceInCents, message?,
  proposedAt, respondedAt?, responseType (ResponseType)

enum QueueEntryStatus: WAITING | CALLED | ACTIVE | EXHAUSTED | WITHDRAWN
enum ProposalStatus:   ACTIVE | ACCEPTED | REJECTED | WITHDRAWN | EXPIRED
enum ResponseType:     PENDING | ACCEPTED | REJECTED
```

`BrowseShipmentItem` (retorno de `listOpenForBrowse`, já com endereço redigido):
```
id, type, description, estimatedWeightKg?, estimatedVolumeM3?, vehicleTypeRequired,
scheduledDate, timeWindow, specificTime?, suggestedPriceInCents, customerSlaHours,
createdAt, addresses: { type: 'ORIGIN'|'DESTINATION', neighborhoodName, cityId, state }[]
```

### Frontend — rotas e padrões já validados no S8-T1 (reaproveitáveis sem alteração)

| Peça | Arquivo | Reuso |
|---|---|---|
| Páginas placeholder | `app/carrier/{dashboard,shipments,proposals}/page.tsx` | Existem, vazias ("Em breve.") — role já gated pelo `middleware.ts` (`/carrier` → `CARRIER`, redireciona senão) |
| Layout | `app/carrier/layout.tsx` | `requireMe()` + `AppShell` — igual ao customer, nada a mudar |
| Client GraphQL | `lib/graphql-client.ts` | Pronto, genérico — mesmo client pros novos hooks |
| Codegen | `codegen.ts` | Já varre `src/graphql/operations/**/*.graphql` — só adicionar os novos arquivos `.graphql` |
| Hook de mutation (padrão) | `graphql/hooks/use-create-shipment.ts` | Modelo pra `use-join-queue`, `use-withdraw-queue`, `use-submit-proposal`, `use-add-proposal-attempt`, `use-withdraw-proposal` — `useMutation` + `ERROR_MESSAGES: Record<code, string>` PT-BR + `getGraphQLErrorCode` |
| Lista responsiva (padrão) | `components/features/shipments/shipments-list.tsx` | Modelo pro browse (`Card` mobile / `Table` desktop), já resolve `useMediaQuery('(max-width: 720px)')`, `EmptyState`, `Skeleton`, `formatScheduledDate` (UTC-anchored), `formatPriceInCents` |
| Badge de status (padrão) | `components/features/shipments/shipment-status-badge.tsx` | Modelo pro badge de `QueueEntryStatus`/`ProposalStatus` — `Record<Status, {label, variant}>` sobre o `Badge` do design system |
| Labels PT-BR | `components/features/shipments/shipment-labels.ts` | Já tem `SHIPMENT_TYPE_LABELS`/`TIME_WINDOW_LABELS`/`VEHICLE_TYPE_LABELS` reaproveitáveis pro card de browse |
| Filtro de browse | `components/ui/adaptive-select.tsx` | Mesmo componente do S8-T1 (agora `h-12`, já corrigido) pro filtro de cidade/tipo |
| Modal de proposta | `components/ui/adaptive-dialog.tsx` | Mesmo componente do S8-T1 pro formulário de enviar/contra-ofertar proposta |

---

## Blockers

✅ Nenhum blocker de fato — os dois gaps (repos faltando no `GraphQLContext`, role check explícito nos resolvers) são conhecidos e têm solução direta, viram sub-steps do Plan.

---

## Next Steps

1. Research: decidir estrutura exata das queries/mutations GraphQL (nomes de campo, se `myQueueEntry`/`myProposal` recebem `shipmentId` como arg ou se view agregada por lista faz mais sentido pra `/carrier/proposals`) e a função pura `resolveCardAction` (já prevista no brief como mitigação de risco)
2. Plan + Todo: sub-steps ordenados (context.ts primeiro, depois enums → types → queries/mutations → codegen → hooks → UI)
3. Execution
