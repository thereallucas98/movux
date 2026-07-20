# S8-T2 — Plan

## 1. Fix do gap de contexto GraphQL

`server/graphql/context.ts` — adicionar ao `GraphQLContext.repos` (interface e `createGraphQLContext`): `proposalQueueRepo: typeof proposalQueueRepository`, `proposalRepo: typeof proposalRepository`, `notificationLogRepo: typeof notificationLogRepository`, `shipmentEventRepo: typeof shipmentEventRepository` — mesmo padrão das linhas já existentes, importando os 4 de `~/server/repositories`. **Primeiro sub-step** — todo resolver novo depende disso pra compilar.

## 2. Novo repo method — `listByCarrier`

`server/repositories/shipment.repository.ts` — exportar o `BROWSE_SELECT` hoje privado (renomear pra `SHIPMENT_BROWSE_SELECT` no export) pra reuso sem duplicar a lista de campos (Anti-Duplication).

`server/repositories/proposal-queue.repository.ts` — novo método na interface e na implementação:
```ts
export interface CarrierQueueEntryRow extends QueueEntry {
  shipment: BrowseShipmentItem
  proposal: ProposalWithAttempts | null
}

listByCarrier(
  carrierId: string,
  filter: { cursor?: string; limit?: number },
): Promise<{ data: CarrierQueueEntryRow[]; nextCursor: string | null }>
```
Implementação (mesmo padrão de cursor de `shipmentRepository.listForCustomer`):
```ts
async listByCarrier(carrierId, filter) {
  const limit = filter.limit ?? 20
  const rows = await prisma.proposalQueueEntry.findMany({
    where: { carrierId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: {
      shipment: { select: SHIPMENT_BROWSE_SELECT },
      proposal: { include: { attempts: { orderBy: { attemptNumber: 'asc' } } } },
    },
  })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1].id : null
  return { data: page, nextCursor }
}
```

## 3. Novo use-case — `list-my-queue-entries.use-case.ts`

`server/use-cases/shipments/queue/list-my-queue-entries.use-case.ts` (novo):
```ts
export interface ListMyQueueEntriesResult {
  success: true
  data: CarrierQueueEntryRow[]
  nextCursor: string | null
}

export async function listMyQueueEntries(
  queueRepo: ProposalQueueRepository,
  carrierId: string,
  filter: { cursor?: string; limit?: number },
): Promise<ListMyQueueEntriesResult> {
  const { data, nextCursor } = await queueRepo.listByCarrier(carrierId, filter)
  return { success: true, data, nextCursor }
}
```
Sempre sucesso (lista pode vir vazia) — sem código de erro, mesmo padrão de `browseOpenShipments`. Exportar em `server/use-cases/index.ts` junto com os demais.

## 4. Enums Pothos — `server/graphql/enums/proposal.enum.ts` (novo)

```ts
export const QueueEntryStatusEnum = builder.enumType('QueueEntryStatus', {
  values: ['WAITING', 'CALLED', 'ACTIVE', 'EXHAUSTED', 'WITHDRAWN'] as const,
})
export const ProposalStatusEnum = builder.enumType('ProposalStatus', {
  values: ['ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'] as const,
})
export const ResponseTypeEnum = builder.enumType('ResponseType', {
  values: ['PENDING', 'ACCEPTED', 'REJECTED'] as const,
})
```

## 5. Types Pothos

`server/graphql/types/browse-shipment.type.ts` (novo) — reaproveita `ShipmentTypeEnum`/`VehicleTypeEnum`/`TimeWindowEnum` já existentes em `enums/shipment.enum.ts`:
```ts
export const BrowseAddressType = builder.simpleObject('BrowseAddress', {
  fields: (t) => ({ type: t.string(), neighborhoodName: t.string(), cityId: t.id(), state: t.string() }),
})

export const BrowseShipmentType = builder.simpleObject('BrowseShipment', {
  fields: (t) => ({
    id: t.id(), type: t.field({ type: ShipmentTypeEnum }), description: t.string(),
    estimatedWeightKg: t.float({ nullable: true }), estimatedVolumeM3: t.float({ nullable: true }),
    vehicleTypeRequired: t.field({ type: VehicleTypeEnum }), scheduledDate: t.field({ type: 'DateTime' }),
    timeWindow: t.field({ type: TimeWindowEnum }), specificTime: t.field({ type: 'DateTime', nullable: true }),
    suggestedPriceInCents: t.int(), customerSlaHours: t.int(), createdAt: t.field({ type: 'DateTime' }),
    addresses: t.field({ type: [BrowseAddressType] }),
  }),
})

export const BrowseShipmentConnectionType = builder.simpleObject('BrowseShipmentConnection', {
  fields: (t) => ({ data: t.field({ type: [BrowseShipmentType] }), nextCursor: t.id({ nullable: true }) }),
})

// mesmo padrão de toGraphQLShipment (shipment.type.ts) — Decimal → number antes do builder
export function toGraphQLBrowseShipment<T extends { estimatedWeightKg: unknown; estimatedVolumeM3: unknown }>(item: T) { /* idêntico a toGraphQLShipment */ }
```

`server/graphql/types/proposal.type.ts` (novo):
```ts
export const ProposalAttemptType = builder.simpleObject('ProposalAttempt', {
  fields: (t) => ({
    id: t.id(), attemptNumber: t.int(), priceInCents: t.int(), message: t.string({ nullable: true }),
    proposedAt: t.field({ type: 'DateTime' }), respondedAt: t.field({ type: 'DateTime', nullable: true }),
    responseType: t.field({ type: ResponseTypeEnum }),
  }),
})

export const ProposalType = builder.simpleObject('Proposal', {
  fields: (t) => ({
    id: t.id(), status: t.field({ type: ProposalStatusEnum }), currentAttempt: t.int(),
    customerSlaHours: t.int(), carrierSlaHours: t.int(), agreedSlaHours: t.int(),
    expiresAt: t.field({ type: 'DateTime' }), createdAt: t.field({ type: 'DateTime' }),
    attempts: t.field({ type: [ProposalAttemptType] }),
  }),
})
```

`server/graphql/types/queue-entry.type.ts` (novo):
```ts
export const QueueEntryType = builder.simpleObject('QueueEntry', {
  fields: (t) => ({
    id: t.id(), status: t.field({ type: QueueEntryStatusEnum }), position: t.int(),
    calledAt: t.field({ type: 'DateTime', nullable: true }), exhaustedAt: t.field({ type: 'DateTime', nullable: true }),
  }),
})

export const CarrierQueueEntryType = builder.simpleObject('CarrierQueueEntry', {
  fields: (t) => ({
    id: t.id(), status: t.field({ type: QueueEntryStatusEnum }), position: t.int(),
    calledAt: t.field({ type: 'DateTime', nullable: true }), exhaustedAt: t.field({ type: 'DateTime', nullable: true }),
    shipment: t.field({ type: BrowseShipmentType }), proposal: t.field({ type: ProposalType, nullable: true }),
  }),
})

export const CarrierQueueEntryConnectionType = builder.simpleObject('CarrierQueueEntryConnection', {
  fields: (t) => ({ data: t.field({ type: [CarrierQueueEntryType] }), nextCursor: t.id({ nullable: true }) }),
})
```

## 6. Queries

Toda query/mutation desta task abre com o mesmo guard (decisão da Research — use-cases não validam role sozinhos):
```ts
if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')
```

`server/graphql/queries/browse-shipments.query.ts` (novo) — `browseShipments(cityId?, type?, cursor?, limit?): BrowseShipmentConnectionType`, chama `browseOpenShipments(ctx.repos.shipmentRepo, input)`, mapeia `result.data.map(toGraphQLBrowseShipment)`.

`server/graphql/queries/queue.query.ts` (novo):
- `myQueueEntry(shipmentId!): QueueEntryType` (nullable) — chama `getMyQueueEntry`; `NOT_FOUND` vira `return null` (não é erro — "ainda não entrou na fila" é estado esperado, não exceção)
- `myProposals(cursor?, limit?): CarrierQueueEntryConnectionType` — chama `listMyQueueEntries(ctx.repos.proposalQueueRepo, ...)`, mapeia `shipment` de cada linha com `toGraphQLBrowseShipment`

`server/graphql/queries/proposal.query.ts` (novo) — `myProposal(shipmentId!): ProposalType` (nullable) — chama `getMyProposal`; `NOT_FOUND` vira `null`, mesma lógica de `myQueueEntry`.

## 7. Mutations

`server/graphql/mutations/queue.mutation.ts` (novo):
- `joinProposalQueue(shipmentId!): QueueEntryType` — chama `joinProposalQueue` use-case com os 5 repos (`shipmentRepo, queueRepo: proposalQueueRepo, proposalRepo, userRepo, notificationLogRepo`); erro via `gqlErrorFromResult`
- `withdrawFromQueue(shipmentId!): Boolean` — chama `withdrawProposalQueue`; retorna `true` em sucesso

`server/graphql/mutations/proposal.mutation.ts` (novo):
```ts
const SubmitProposalInput = builder.inputType('SubmitProposalInput', {
  fields: (t) => ({ priceInCents: t.int({ required: true }), carrierSlaHours: t.int({ required: true }), message: t.string() }),
})
const AddProposalAttemptInput = builder.inputType('AddProposalAttemptInput', {
  fields: (t) => ({ priceInCents: t.int({ required: true }), message: t.string() }),
})
```
- `submitProposal(shipmentId!, input!): ProposalType` — chama `submitProposal` use-case (repos: `shipmentRepo, queueRepo: proposalQueueRepo, proposalRepo, shipmentEventRepo, customerProfileRepo, userRepo, notificationLogRepo`)
- `addProposalAttempt(shipmentId!, input!): ProposalType` — chama `addProposalAttempt` use-case
- `withdrawProposal(shipmentId!): Boolean` — chama `withdrawProposal` use-case

## 8. Wiring — `server/graphql/schema.ts`

Adicionar os 3 imports de enum, 3 de type, 3 de query, 2 de mutation na ordem já usada (enums → types → queries → mutations), mesmo padrão das linhas de shipment já existentes.

## 9. Client — operações `.graphql`

`src/graphql/operations/shipments/browse-shipments.graphql` (mesma pasta do domínio shipment já existente).

`src/graphql/operations/proposals/` (nova pasta): `my-queue-entry.graphql`, `my-proposals.graphql`, `my-proposal.graphql`, `join-proposal-queue.graphql`, `withdraw-from-queue.graphql`, `submit-proposal.graphql`, `add-proposal-attempt.graphql`, `withdraw-proposal.graphql`.

`codegen.ts` já varre `src/graphql/operations/**/*.graphql` — nenhuma mudança de config necessária, só rodar `pnpm codegen` depois de criar os arquivos.

## 10. Client — hooks React Query

`src/graphql/hooks/`:
- `use-browse-shipments.ts` — `useQuery`, `queryKey: ['browse-shipments', filter]`
- `use-queue-entry.ts` — `useQuery`, `queryKey: ['queue-entry', shipmentId]`, `enabled: !!shipmentId`
- `use-my-proposals.ts` — `useQuery`, `queryKey: ['my-proposals', filter]`
- `use-my-proposal.ts` — `useQuery`, `queryKey: ['my-proposal', shipmentId]`, `enabled: !!shipmentId`
- `use-join-queue.ts`, `use-withdraw-queue.ts`, `use-submit-proposal.ts`, `use-add-proposal-attempt.ts`, `use-withdraw-proposal.ts` — `useMutation` (mesmo padrão de `use-create-shipment.ts`: `ERROR_MESSAGES: Record<code, string>` PT-BR + `getGraphQLErrorCode`), cada um invalidando as `queryKey`s afetadas (`browse-shipments`, `queue-entry`, `my-proposals`, `my-proposal`) no `onSuccess`

`ERROR_MESSAGES` PT-BR a cobrir (códigos já mapeados em `errors.ts`, faltam só as frases do client): `ALREADY_IN_QUEUE`, `NOT_CALLED`, `ALREADY_PROPOSED`, `TOO_MANY_ATTEMPTS`, `INVALID_STATE_TRANSITION`, `NOT_FOUND`.

## 11. Client — componentes

`src/components/features/proposals/` (nova pasta):
- `resolve-card-action.ts` — função pura, implementa a matriz de estado→ação da Research (`{ queueStatus, proposalStatus, currentAttempt }` → `{ primaryAction, secondaryAction, readOnly, label }`)
- `queue-status-badge.tsx` — mesmo padrão de `shipment-status-badge.tsx`, `Record<QueueEntryStatus, {label, variant}>`
- `proposal-status-badge.tsx` — idem pra `ProposalStatus`
- `proposal-form-dialog.tsx` — `AdaptiveDialog` com form (`priceInCents` via `AdaptiveSelect` de faixas ou input mascarado de moeda, `carrierSlaHours` via `AdaptiveSelect` reaproveitando `CUSTOMER_SLA_HOURS_OPTIONS`, `message` via `Textarea` opcional) — usa `zodResolver(SubmitProposalSchema)` pro envio inicial, `zodResolver(AddProposalAttemptSchema)` pra contra-oferta (mesmo dialog, schema trocado por prop)
- `withdraw-confirm-dialog.tsx` — `AdaptiveDialog` de confirmação reaproveitado tanto pra sair da fila quanto pra desistir da proposta (prop `title`/`description`/`onConfirm` diferentes)

`src/components/features/shipments/` (pasta existente):
- `browse-shipment-card.tsx` (novo) — card de frete `OPEN` com bairros de origem/destino, preço sugerido, botão de ação (via `resolveCardAction`, usando `useQueueEntry(shipment.id)` pra saber se o carrier já está na fila daquele item)

## 12. Páginas

`app/carrier/shipments/page.tsx` — filtro (`AdaptiveSelect` cidade + tipo) + lista de `browse-shipment-card.tsx` (mobile: `Card` empilhado; desktop: grid — não é tabular como a lista do customer, cada item tem ação própria, então `Card` nos dois breakpoints, só muda colunas)

`app/carrier/proposals/page.tsx` — lista de `myProposals`, cada linha renderiza `queue-status-badge`/`proposal-status-badge` + ação via `resolveCardAction`; `EmptyState` com CTA pra `/carrier/shipments` quando vazio

`app/carrier/dashboard/page.tsx` — atalho "Buscar fretes" + resumo (3 primeiros itens de `browseShipments` e de `myProposals`, reaproveitando os componentes de card/lista com `limit`)

## Ordem de execução (sub-steps)

1. `context.ts` (bloqueia tudo)
2. Repo (`SHIPMENT_BROWSE_SELECT` export + `listByCarrier`) + use-case novo
3. Enums → Types → Queries → Mutations → wiring `schema.ts`
4. `pnpm codegen` roda limpo (checkpoint intermediário — GraphQL schema + resolvers precisam compilar antes de escrever `.graphql` operations)
5. Operações `.graphql` + `pnpm codegen` de novo (gera os hooks tipados)
6. Hooks React Query
7. Componentes (`resolve-card-action` primeiro — os outros dependem dele)
8. Páginas
9. Lint/typecheck escopo isolado + QA manual no navegador
