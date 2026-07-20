# S4-T1 — Plan

## Error code novo

`server/http/error-response.ts`:
- `ErrorCode` union: `+ 'ALREADY_REVIEWED'`
- `ERROR_MAP`: `ALREADY_REVIEWED: { status: 409, message: 'This role has already reviewed this shipment' }`

`server/graphql/errors.ts`:
- `Record<ErrorCode,string>`: `ALREADY_REVIEWED: 'This role has already reviewed this shipment'`

## Repositório — `customer-profile.repository.ts` (método novo)

```ts
findUserIdById(customerProfileId): Promise<{ userId: string } | null>
```

## Repositórios novos

### `review.repository.ts`
```ts
export interface CreateReviewInput {
  shipmentId: string
  reviewerId: string
  revieweeId: string
  reviewerRole: ReviewerRole
  rating: number
  tagIds: string[]
}

export interface ReviewRepository {
  findByShipment(shipmentId): Promise<ReviewWithTags[]>
  findByShipmentAndRole(shipmentId, reviewerRole): Promise<Review | null>
  create(data: CreateReviewInput): Promise<ReviewWithTags>
}
```
`create` — `prisma.review.create({ data: { ..., tagSelections: { create: tagIds.map(tagId => ({ tagId })) } }, include: { tagSelections: { include: { tag: true } } } })`.

### `review-tag.repository.ts`
```ts
export interface ReviewTagRepository {
  findByIds(tagIds: string[]): Promise<{ id: string; targetRole: ReviewerRole }[]>
}
```

## Schema Zod — `server/schemas/review.schema.ts` (novo)

```ts
export const SubmitReviewSchema = z.object({
  rating: z.int().min(1).max(5),
  tagIds: z.array(z.uuid()).optional(),
})
```

## Use-cases (`server/use-cases/shipments/reviews/`)

### `submit-review.use-case.ts`
1. `resolveSafetyParticipant` → `NOT_FOUND`
2. `status !== 'DELIVERED' && status !== 'REVIEWED'` → `INVALID_STATE_TRANSITION`
3. `reviewRepo.findByShipmentAndRole(shipmentId, participant.role)` existente → `ALREADY_REVIEWED`
4. Resolve `revieweeId`:
   - `role === 'CUSTOMER'` → `proposalRepo.findAcceptedByShipment(shipmentId).carrierId`
   - `role === 'CARRIER'` → `customerProfileRepo.findUserIdById(shipment.customerId).userId` (precisa de `shipment.customerId`, via `shipmentRepo.findStatusById`)
5. Se `tagIds` informado: `reviewTagRepo.findByIds(tagIds)` → cada tag precisa existir **e** ter `targetRole` == papel do **avaliado** (o oposto de `participant.role`) → senão `VALIDATION_ERROR`-like 400 (reaproveita `errorResponse('VALIDATION_ERROR')` manual, não via Zod)
6. `reviewRepo.create(...)`
7. `reviewRepo.findByShipment(shipmentId)` de novo → se agora tem `CUSTOMER` e `CARRIER` → `shipmentRepo.updateStatus(shipmentId, 'REVIEWED')`

### `list-reviews-for-shipment.use-case.ts`
1. `resolveSafetyParticipant` → `NOT_FOUND`
2. Sem gate de status adicional (histórico legível a qualquer momento, como o `GET /events`)
3. `reviewRepo.findByShipment(shipmentId)`

## Rotas

```
app/api/shipments/[shipmentId]/reviews/route.ts   — POST (CUSTOMER ou CARRIER) + GET (CUSTOMER ou CARRIER)
```

## Swagger + Insomnia

- `lib/swagger/definitions/reviews.ts` (novo) — 2 endpoints, tag `Reviews`
- `docs/insomnia/s4-t1-review-api.json` — novo

## Ordem de execução

1. `ALREADY_REVIEWED` em `error-response.ts` + `graphql/errors.ts`
2. `customerProfileRepo.findUserIdById`
3. `review.repository.ts` + `review-tag.repository.ts`
4. `SubmitReviewSchema`
5. 2 use-cases
6. Registrar nos barrels
7. Rota `reviews/route.ts`
8. Swagger
9. Insomnia
10. QA via curl — **passo extra**: inserir 2 `ReviewTag` manualmente via SQL antes de testar (1 `targetRole: CARRIER`, 1 `targetRole: CUSTOMER`), já que a S4-T3 (seed) ainda não existe. Casos: submit customer com tag certa, submit carrier com tag certa (shipment vira `REVIEWED`), submit 2x mesmo papel (409), tag de `targetRole` errado (400), tag inexistente (400), rating fora de 1-5 (400), submit antes de `DELIVERED` (409), `GET /reviews` com 0/1/2 reviews
11. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T4
