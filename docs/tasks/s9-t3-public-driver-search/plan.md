# S9-T3 — Plan

## 1. Repository — `server/repositories/carrier-profile.repository.ts` (modificado)

```ts
async findPublicSearchResults(
  cityId: string,
  vehicleType?: VehicleType,
): Promise<Array<{ fullName: string; avgRating: Decimal | null; totalShipments: number; vehicleType: VehicleType | null }>> {
  const acceptedCarrierIds = await prisma.proposal.findMany({
    where: {
      status: 'ACCEPTED',
      shipment: { addresses: { some: { type: 'ORIGIN', cityId } } },
    },
    select: { carrierId: true },
    distinct: ['carrierId'],
  })

  const userIds = acceptedCarrierIds.map((p) => p.carrierId)
  if (userIds.length === 0) return []

  const profiles = await prisma.carrierProfile.findMany({
    where: {
      userId: { in: userIds },
      verificationStatus: 'APPROVED',
      isActive: true,
      isFlagged: false,
    },
    include: {
      user: { select: { fullName: true } },
    },
  })

  const results = await Promise.all(
    profiles.map(async (profile) => {
      const vehicle = await prisma.vehicle.findFirst({
        where: { ownerId: profile.userId, isActive: true },
        select: { type: true },
      })
      return {
        fullName: profile.user.fullName,
        avgRating: profile.avgRating,
        totalShipments: profile.totalShipments,
        vehicleType: vehicle?.type ?? null,
      }
    }),
  )

  return vehicleType ? results.filter((r) => r.vehicleType === vehicleType) : results
}
```

## 2. Use-case — `server/use-cases/carriers/search-public-carriers.use-case.ts` (novo)

```ts
export async function searchPublicCarriers(
  repos: { carrierProfileRepo: CarrierProfileRepository },
  input: { cityId: string; vehicleType?: VehicleType },
) {
  const rows = await repos.carrierProfileRepo.findPublicSearchResults(input.cityId, input.vehicleType)
  return {
    success: true as const,
    data: rows.map((r) => ({
      firstName: r.fullName.split(' ')[0],
      vehicleType: r.vehicleType,
      avgRating: r.avgRating ? Number(r.avgRating) : null,
      totalShipments: r.totalShipments,
    })),
  }
}
```
Sem `principal` na assinatura — não existe (rota pública), diferente do padrão dos demais use-cases.

## 3. GraphQL — tipo + query (novos)

`server/graphql/types/public-carrier-result.type.ts`:
```ts
export const PublicCarrierResult = builder.simpleObject('PublicCarrierResult', {
  fields: (t) => ({
    firstName: t.string(),
    vehicleType: t.field({ type: VehicleTypeEnum, nullable: true }),
    avgRating: t.float({ nullable: true }),
    totalShipments: t.int(),
  }),
})
```

`server/graphql/queries/public-carrier-search.query.ts`:
```ts
builder.queryField('publicCarrierSearch', (t) =>
  t.field({
    type: [PublicCarrierResult],
    args: { cityId: t.arg.string({ required: true }), vehicleType: t.arg({ type: VehicleTypeEnum, required: false }) },
    resolve: async (_root, args, ctx) => {
      const result = await searchPublicCarriers(
        { carrierProfileRepo: ctx.repos.carrierProfileRepo },
        { cityId: args.cityId, vehicleType: args.vehicleType ?? undefined },
      )
      return result.data
    },
  }),
)
```
Registrar em `schema.ts` (import da query + do tipo).

## 4. Hook — `graphql/hooks/use-public-carrier-search.ts` (novo)

React Query hook padrão, mesma forma de `use-browse-shipments.ts` mas sem exigir sessão (nenhuma diferença de implementação — o hook não sabe se é público, só a query GraphQL que não checa `ctx.principal`).

## 5. UI — rota pública

- `app/(public)/buscar-transportadores/page.tsx` — Server Component simples, sem `getServerPrincipal`
- `components/features/public-search/carrier-search-form.tsx` — client component, autocomplete de cidade (reaproveitar o mesmo padrão de busca de `create-shipment-form.tsx:443-446`) + select opcional de `VehicleType`
- `components/features/public-search/carrier-search-results.tsx` — grid de cards: primeiro nome, ícone de veículo, rating (`"—"` se nulo, mesmo tratamento do S8-T7), total de fretes; estado vazio com CTA de cadastro

## 6. Prefill no cadastro e na criação de frete

- `app/(auth)/register/page.tsx` — aceita `searchParams`, repassa `cityId`/`vehicleType` pro `RegisterForm`
- `register-form.tsx` — após `onSubmit` bem-sucedido, se `cityId` presente: `router.push(`/customer/shipments/new?cityId=${cityId}&vehicleTypeRequired=${vehicleType}`)`; senão, comportamento atual (`/customer/dashboard`/`/carrier/dashboard`)
- `app/customer/shipments/new/page.tsx` / `create-shipment-form.tsx` — lê `searchParams.cityId`/`vehicleTypeRequired` e inicializa `defaultValues.origin.cityId`/`defaultValues.vehicleTypeRequired` quando presentes

---

## Ordem de execução (sub-steps)

1. Repository (`findPublicSearchResults`) — sem dependência
2. Use-case — depende de 1
3. Tipo + query GraphQL — depende de 2
4. Hook React Query — depende de 3
5. Rota `/buscar-transportadores` (form + resultados) — depende de 4
6. Prefill no `register-form.tsx`/`register/page.tsx` — independente dos passos 1-5, pode ser feito em paralelo
7. Prefill no `create-shipment-form.tsx`/`shipments/new/page.tsx` — depende de 6 (recebe o redirect)
8. Lint/build + QA manual

## Test Strategy (detalhe)

**GraphQL**: cidade com carriers elegíveis retorna lista correta e anonimizada; cidade sem histórico retorna `[]`; carrier `isFlagged`/`PENDING` nunca aparece mesmo com histórico; inspeção do payload confirma ausência física de PII.
**UI**: acesso sem cookie funciona; fluxo completo busca → resultado → CTA → registro prefilado → criação de frete prefilada; fluxo direto (sem vir da busca) continua idêntico ao atual.
