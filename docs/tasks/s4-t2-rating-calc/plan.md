# S4-T2 — Plan

## Schema migration

```prisma
model CarrierProfile {
  // ... adiciona:
  isFlagged Boolean @default(false) @map("is_flagged")
}
```

Nullable? Não — `@default(false)`, aditiva, sem quebra.

## `review.repository.ts` — método novo

```ts
getAverageRatingByReviewee(revieweeId: string): Promise<number | null>
// prisma.review.aggregate({ where: { revieweeId }, _avg: { rating: true } }).then(r => r._avg.rating)
```

## `customer-profile.repository.ts` — método novo

```ts
updateRating(userId: string, avgRating: number): Promise<void>
// prisma.customerProfile.update({ where: { userId }, data: { avgRating } })
```

## `carrier-profile.repository.ts` (novo arquivo)

```ts
export interface CarrierProfileRepository {
  updateRating(userId: string, avgRating: number): Promise<void>
}

export function createCarrierProfileRepository(prisma: PrismaClient): CarrierProfileRepository {
  return {
    async updateRating(userId, avgRating) {
      await prisma.carrierProfile.update({
        where: { userId },
        data: {
          avgRating,
          isActive: avgRating >= 3.5,
          isFlagged: avgRating < 4.0,
        },
      })
    },
  }
}
```

Nota: `isActive` é setado incondicionalmente pra `avgRating >= 3.5` a cada recálculo — isso é **suficiente** pro caso de escopo (só some pra `false` quando cai abaixo de 3.5; nunca volta a `true` sozinho, porque uma vez `false`, o `avgRating` já está abaixo de 3.5, e só reviews futuras poderiam mudar isso — o que **seria** uma reativação automática, contrariando a decisão da Research). Ajuste: `updateRating` só seta `isActive: false` quando `avgRating < 3.5`; não sobrescreve pra `true` se já estava `false`. Ver detalhe abaixo.

```ts
async updateRating(userId, avgRating) {
  const isFlagged = avgRating < 4.0
  const data: { avgRating: number; isFlagged: boolean; isActive?: boolean } = { avgRating, isFlagged }
  if (avgRating < 3.5) {
    data.isActive = false
  }
  await prisma.carrierProfile.update({ where: { userId }, data })
}
```

## Retrofit — `submit-review.use-case.ts` (S4-T1)

Repos ganham `carrierProfileRepo: CarrierProfileRepository`. Depois de `reviewRepo.create(...)`, antes do check de `REVIEWED`:

```ts
const avg = await repos.reviewRepo.getAverageRatingByReviewee(revieweeId)
if (avg !== null) {
  const rounded = Math.round(avg * 100) / 100
  if (participant.role === 'CUSTOMER') {
    await repos.carrierProfileRepo.updateRating(revieweeId, rounded)
  } else {
    await repos.customerProfileRepo.updateRating(revieweeId, rounded)
  }
}
```

## Rota tocada

```
app/api/shipments/[shipmentId]/reviews/route.ts   (POST) — repassar carrierProfileRepository
```

## Ordem de execução

1. Migration — `CarrierProfile.isFlagged`
2. `review.repository.ts` — `getAverageRatingByReviewee`
3. `customer-profile.repository.ts` — `updateRating`
4. `carrier-profile.repository.ts` (novo)
5. Registrar `carrierProfileRepository` em `server/repositories/index.ts`
6. Retrofit `submit-review.use-case.ts`
7. Retrofit rota `reviews/route.ts` (POST)
8. QA via curl: 1ª review de um carrier (avgRating = a nota), 2ª review de outro frete recalcula a média corretamente, carrier caindo abaixo de 3.5 → `isActive: false`, carrier abaixo de 4.0 mas acima de 3.5 → `isFlagged: true` e `isActive: true`, customer sendo avaliado só muda `avgRating`
9. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S4-T1
