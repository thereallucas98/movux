# S4-T2 — Research

## Decision Log

### "Admin flag" pra `avgRating < 4.0`

**Decision:** Good — adicionar `CarrierProfile.isFlagged Boolean @default(false)`, recalculado (setado **e** limpo) toda vez que `avgRating` muda, junto com o `isActive`.

**Reason:** ao contrário do `CARRIER_CALLED` (S3-T4), que exigiria tocar ~12 arquivos já commitados por um evento sem consumidor, aqui o custo é mínimo — 1 campo booleano, 1 migration aditiva, escrito no mesmo retrofit que já vai tocar `submit-review.use-case.ts`. Fica pronto pro dashboard de admin (Sprint 5+) consumir sem exigir uma segunda migration nessa altura.

**Nota de assimetria (intencional):** `isFlagged` é bidirecional (liga e desliga conforme `avgRating` sobe/desce), mas `isActive` (auto-suspensão, `< 3.5`) só desliga automaticamente — reativar depois de suspenso continua manual (fora do escopo, conforme `brief.md`). Isso é proposital: `isFlagged` é só um sinalizador informativo pro admin, sem custo de reverter; `isActive = false` bloqueia o carrier de operar, e reverter isso automaticamente sem revisão humana seria arriscado (carrier oscilando entre suspenso/ativo a cada review).

## Technical Analysis

- **Migration:** `CarrierProfile.isFlagged Boolean @default(false) @map("is_flagged")`.
- **`review.repository.ts` — método novo:**
  ```ts
  getAverageRatingByReviewee(revieweeId): Promise<number | null>
  // prisma.review.aggregate({ where: { revieweeId }, _avg: { rating: true } })._avg.rating
  ```
- **`CarrierProfileRepository` (novo arquivo):**
  ```ts
  export interface CarrierProfileRepository {
    updateRating(userId: string, avgRating: number): Promise<void>
    // seta avgRating, isActive = avgRating >= 3.5, isFlagged = avgRating < 4.0
    // update via where: { userId } — userId é @unique, não precisa resolver id antes
  }
  ```
- **`CustomerProfileRepository` — método novo:**
  ```ts
  updateRating(userId: string, avgRating: number): Promise<void>
  // só seta avgRating — sem isActive/isFlagged (CustomerProfile não tem esses campos)
  ```
- **Retrofit em `submit-review.use-case.ts`:** depois de `reviewRepo.create(...)`, antes do check de `REVIEWED`:
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
  (`avg` nunca é `null` aqui na prática — acabamos de criar uma review pra esse `revieweeId` — mas o aggregate do Prisma tipa `_avg.rating` como `number | null`, então o guard fica por completude de tipo.)
- **Arredondamento:** `Decimal(3,2)` no schema permite até 2 casas decimais — arredondar em JS antes de persistir (`Math.round(avg * 100) / 100`) evita depender de conversão implícita do Prisma.

## Edge Cases

| Case | Behavior |
|---|---|
| Reviewee recebendo a 1ª review de todos os tempos | `avgRating` = a própria nota |
| Carrier cai pra `avgRating` exatamente `3.5` | `isActive` permanece `true` (regra é `< 3.5`, não `<=`) |
| Carrier cai pra `avgRating` exatamente `4.0` | `isFlagged` permanece `false` (regra é `< 4.0`) |
| Carrier sobe de `avgRating < 4.0` pra `>= 4.0` numa review seguinte (de outro frete) | `isFlagged` volta pra `false` |
| Carrier sobe de `avgRating < 3.5` pra `>= 3.5` | `isActive` **não** volta pra `true` automaticamente (fora de escopo, decisão documentada acima) |
| Customer sendo avaliado | só `avgRating` muda; sem `isActive`/`isFlagged` (campos não existem em `CustomerProfile`) |

## Blockers

✅ No blockers — decisão resolvida em chat.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
