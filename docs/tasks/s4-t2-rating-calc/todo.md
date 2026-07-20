# S4-T2 — Todo

- [x] Migration — `CarrierProfile.isFlagged`
- [x] `review.repository.ts` — `getAverageRatingByReviewee`
- [x] `customer-profile.repository.ts` — `updateRating`
- [x] `server/repositories/carrier-profile.repository.ts` (novo)
- [x] Registrar `carrierProfileRepository` em `server/repositories/index.ts`
- [x] Retrofit `submit-review.use-case.ts` — recalcular `avgRating`/`isActive`/`isFlagged` após criar a review
- [x] Retrofit rota `app/api/shipments/[shipmentId]/reviews/route.ts` (POST) — passar `carrierProfileRepository`
- [x] QA via curl: 1ª review, 2ª review recalcula média, carrier < 3.5 → isActive false, carrier < 4.0 e >= 3.5 → isFlagged true, customer só muda avgRating
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S4-T1
