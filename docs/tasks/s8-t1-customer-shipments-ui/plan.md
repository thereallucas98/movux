# S8-T1 — Plan

## Repositório de geografia (novo)

`server/repositories/geography.repository.ts`:
```ts
export interface NeighborhoodListItem {
  id: string
  name: string
  cityId: string
  cityName: string
  stateUf: string
}

export interface GeographyRepository {
  listNeighborhoods(): Promise<NeighborhoodListItem[]>
}
```
`listNeighborhoods` — `prisma.neighborhood.findMany({ select: { id, name, cityId, city: { select: { name, state: { select: { uf } } } } }, orderBy: { name: 'asc' } })`, mapeado pro shape flat acima (`city.name` → `cityName`, `city.state.uf` → `stateUf`).

## Wiring dos repos

`server/repositories/index.ts` — exportar `geographyRepository = createGeographyRepository(prisma)` (mesmo padrão de `shipmentRepository`/`pricingRepository`).

`server/graphql/context.ts` — em `GraphQLContext.repos`, adicionar `shipmentRepo`, `customerProfileRepo`, `pricingRepo`, `geographyRepo` (tipos `typeof shipmentRepository` etc.) e wireá-los em `createGraphQLContext`, mesmo padrão das linhas 97-119 hoje.

## Enums Pothos — `server/graphql/enums/shipment.enum.ts` (novo)

```ts
export const ShipmentStatusEnum = builder.enumType('ShipmentStatus', {
  values: ['DRAFT','OPEN','PROPOSALS_RECEIVED','CARRIER_SELECTED','COLLECTED','IN_TRANSIT','DELIVERED','REVIEWED','CANCELLED','EXPIRED'] as const,
})
export const ShipmentTypeEnum = builder.enumType('ShipmentType', {
  values: ['RESIDENTIAL_MOVING','COMMERCIAL_FREIGHT','DELIVERY','OTHER'] as const,
})
export const VehicleTypeEnum = builder.enumType('VehicleType', {
  values: ['ANY','MOTORCYCLE','VAN','TRUCK_SMALL','TRUCK_LARGE'] as const,
})
export const TimeWindowEnum = builder.enumType('TimeWindow', {
  values: ['MORNING','AFTERNOON','EVENING','SPECIFIC'] as const,
})
```
Nome do export do objeto (próxima seção) é `ShipmentType` (`builder.simpleObject('Shipment', ...)`, mesmo padrão de `RequestType`/`ShiftType`) — sem colisão com `ShipmentTypeEnum` acima, que é o wrapper Pothos do enum Prisma.

## Types Pothos — `server/graphql/types/shipment.type.ts` (novo)

```ts
export const ShipmentAddressType = builder.simpleObject('ShipmentAddress', {
  fields: (t) => ({
    id: t.id(), type: t.string(), street: t.string(), number: t.string(),
    complement: t.string({ nullable: true }), neighborhoodId: t.id(),
    neighborhoodName: t.string(), cityId: t.id(), state: t.string(), zipCode: t.string(),
  }),
})

export const ShipmentType = builder.simpleObject('Shipment', {
  fields: (t) => ({
    id: t.id(), status: t.field({ type: ShipmentStatusEnum }),
    type: t.field({ type: ShipmentTypeEnum }), description: t.string(),
    estimatedWeightKg: t.float({ nullable: true }), estimatedVolumeM3: t.float({ nullable: true }),
    vehicleTypeRequired: t.field({ type: VehicleTypeEnum }),
    scheduledDate: t.field({ type: 'DateTime' }), timeWindow: t.field({ type: TimeWindowEnum }),
    specificTime: t.field({ type: 'DateTime', nullable: true }),
    customerSlaHours: t.int(), suggestedPriceInCents: t.int(),
    finalPriceInCents: t.int({ nullable: true }),
    addresses: t.field({ type: [ShipmentAddressType] }),
    createdAt: t.field({ type: 'DateTime' }),
  }),
})
```
`server/graphql/types/neighborhood.type.ts` (novo):
```ts
export const NeighborhoodType = builder.simpleObject('Neighborhood', {
  fields: (t) => ({
    id: t.id(), name: t.string(), cityId: t.id(), cityName: t.string(), stateUf: t.string(),
  }),
})
```

## Queries — `server/graphql/queries/shipments.query.ts` (novo)

```
myShipments(status?: ShipmentStatusEnum, cursor?: ID, limit?: Int): { data: [ShipmentType], nextCursor }
shipment(id: ID!): ShipmentType
```
Ambas: `if (!ctx.principal) throw gqlError('UNAUTHENTICATED')`; chamam `listShipmentsForCustomer`/`getShipment` de `~/server/use-cases` com `{ customerProfileRepo: ctx.repos.customerProfileRepo, shipmentRepo: ctx.repos.shipmentRepo }`, `ctx.principal.userId`, input; `if (!result.success) throw gqlError(result.code)` (usa o helper — decisão da Research).

`server/graphql/queries/neighborhoods.query.ts` (novo):
```
neighborhoods: [NeighborhoodType]
```
Só exige `ctx.principal` (qualquer role autenticada) — `ctx.repos.geographyRepo.listNeighborhoods()`.

## Mutation — `server/graphql/mutations/shipments.mutation.ts` (novo)

```ts
const ShipmentAddressInput = builder.inputType('ShipmentAddressInput', {
  fields: (t) => ({
    street: t.string({ required: true }), number: t.string({ required: true }),
    complement: t.string(), neighborhoodId: t.id({ required: true }),
    cityId: t.id({ required: true }), state: t.string({ required: true }),
    zipCode: t.string({ required: true }),
  }),
})

const CreateShipmentInput = builder.inputType('CreateShipmentInput', {
  fields: (t) => ({
    type: t.field({ type: ShipmentTypeEnum, required: true }),
    description: t.string({ required: true }),
    estimatedWeightKg: t.float(), estimatedVolumeM3: t.float(),
    vehicleTypeRequired: t.field({ type: VehicleTypeEnum, required: true }),
    scheduledDate: t.string({ required: true }), // 'YYYY-MM-DD'
    timeWindow: t.field({ type: TimeWindowEnum, required: true }),
    specificTime: t.string(), // 'HH:mm'
    customerSlaHours: t.int({ required: true }),
    origin: t.field({ type: ShipmentAddressInput, required: true }),
    destination: t.field({ type: ShipmentAddressInput, required: true }),
  }),
})

builder.mutationField('createShipment', (t) => t.field({
  type: ShipmentType,
  args: { input: t.arg({ type: CreateShipmentInput, required: true }) },
  resolve: async (_root, args, ctx) => {
    if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
    const result = await createShipment(
      { customerProfileRepo: ctx.repos.customerProfileRepo, pricingRepo: ctx.repos.pricingRepo, shipmentRepo: ctx.repos.shipmentRepo },
      ctx.principal.userId,
      { ...args.input, modifiers: [] }, // modifiers fora do v1 (Research)
    )
    if (!result.success) throw gqlError(result.code)
    return result.shipment
  },
}))
```
`gqlError` precisa cobrir `'UNAUTHENTICATED'` — conferir em `errors.ts` se já existe esse code no `CODE_TO_MESSAGE`; se não, adicionar (mesmo padrão do `ALREADY_REVIEWED` na S4-T1).

## `schema.ts` — wiring

Adicionar, na ordem certa (enums → types → queries → mutations, mesmo padrão do arquivo):
```
import './enums/shipment.enum'
import './types/neighborhood.type'
import './types/shipment.type'
import './queries/neighborhoods.query'
import './queries/shipments.query'
import './mutations/shipments.mutation'
```

## Client GraphQL infra (greenfield)

- `apps/web/scripts/export-graphql-schema.ts` (novo) — importa `schema` de `~/server/graphql/schema`, `printSchema(schema)` (biblioteca `graphql`), escreve em `apps/web/src/server/graphql/schema.graphql`.
- `apps/web/codegen.ts` (novo) — `CodegenConfig` do `@graphql-codegen/cli`: `schema: 'src/server/graphql/schema.graphql'`, `documents: 'src/graphql/operations/**/*.graphql'`, output `src/graphql/generated/types.ts` via `typescript` + `typescript-operations` plugins.
- `apps/web/package.json` — script `"codegen": "tsx scripts/export-graphql-schema.ts && graphql-codegen --config codegen.ts"`.
- `apps/web/src/lib/graphql-client.ts` (novo) — `new GraphQLClient('/api/graphql', { credentials: 'include' })` (mesmo cookie de sessão da REST, sem token).

## Operations — `apps/web/src/graphql/operations/shipments/*.graphql` (novo, 4 arquivos)

`my-shipments.graphql`, `shipment.graphql`, `create-shipment.graphql`, `neighborhoods.graphql` — cada um com a query/mutation correspondente, campos batendo com os types acima.

## Hooks — `apps/web/src/graphql/hooks/` (novo, path documentado no CLAUDE.md, ainda sem uso)

- `use-my-shipments.ts` — `useQuery({ queryKey: ['shipments', filter], queryFn: () => graphqlClient.request(MyShipmentsDocument, {filter}) })`
- `use-shipment.ts` — `useQuery` por id
- `use-create-shipment.ts` — `useMutation`, `onSuccess` → `queryClient.invalidateQueries({queryKey: ['shipments']})` + `router.push` pro detalhe/lista
- `use-neighborhoods.ts` — `useQuery({ queryKey: ['neighborhoods'], staleTime: Infinity })` (dado quase estático, 17 linhas)

## UI

- `components/features/shipments/` (novo, primeira pasta Movux-domain em `features/`):
  - `shipment-status-badge.tsx` — `Badge` colorido por `ShipmentStatus`
  - `shipments-list.tsx` — `useMediaQuery('(max-width: 720px)')`; ≤720px renderiza cards, senão `Table` (CLAUDE.md mobile pattern); usa `EmptyState` quando `data.length === 0`, `Skeleton` durante loading
  - `neighborhood-select-field.tsx` — `FormField` + `AdaptiveSelect` alimentado por `useNeighborhoods()`, `onValueChange` seta `neighborhoodId`/`cityId`/`state` no form (3 campos do schema a partir de 1 seleção)
  - `create-shipment-form.tsx` — `useForm({ resolver: zodResolver(CreateShipmentSchema) })` (schema reaproveitado do server, ver Research — confirmar zero import server-only antes de montar este arquivo), `Form`/`FormField` shadcn, `DatePicker` pra `scheduledDate`, `NeighborhoodSelectField` x2 (origin/destination), `specificTime` condicional via `form.watch('timeWindow') === 'SPECIFIC'`
- `app/customer/dashboard/page.tsx` — client component, `useMyShipments({limit: 5})`, CTA "Criar frete" (`Link` pra `/customer/shipments/new`)
- `app/customer/shipments/page.tsx` — client component, `<ShipmentsList />`
- `app/customer/shipments/new/page.tsx` — client component, `<CreateShipmentForm />`, sticky bottom action bar no mobile (CLAUDE.md)

## Test strategy

- Backend: exercitar `myShipments`/`shipment`/`createShipment`/`neighborhoods` via GraphiQL (`/api/graphql`, dev only) antes de ligar a UI — mesmo espírito do Swagger/Insomnia pras rotas REST.
- Frontend: os 4 cenários do brief (dashboard com atalho, lista vazia/com dados, criação com sucesso, erro de validação/servidor) + responsivo em 375/720/1024/1440 (checklist mobile do CLAUDE.md).
- `pnpm lint` + `pnpm build` no final.

## Ordem de execução

1. `GeographyRepository` + wiring em `repositories/index.ts`
2. `GraphQLContext.repos` (context.ts) — 4 repos novos
3. `enums/shipment.enum.ts`
4. `types/neighborhood.type.ts` + `types/shipment.type.ts`
5. `queries/neighborhoods.query.ts` + `queries/shipments.query.ts`
6. `mutations/shipments.mutation.ts` (+ `UNAUTHENTICATED` em `errors.ts` se faltar)
7. Wiring em `schema.ts`
8. Testar as 4 operações via GraphiQL manualmente antes de seguir
9. `scripts/export-graphql-schema.ts` + `codegen.ts` + script `codegen` no `package.json`
10. `lib/graphql-client.ts`
11. `graphql/operations/shipments/*.graphql` (4 arquivos)
12. `pnpm codegen` — gerar `graphql/generated/types.ts`
13. `graphql/hooks/` (4 hooks)
14. `components/features/shipments/` (5 componentes)
15. 3 páginas (`dashboard`, `shipments`, `shipments/new`)
16. QA manual passo a passo local (dev server + browser) — roteiro em `todo.md`
17. `pnpm lint` + `pnpm build`
