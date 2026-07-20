# S4-T1 — Todo

- [x] `ALREADY_REVIEWED` em `server/http/error-response.ts`
- [x] `ALREADY_REVIEWED` em `server/graphql/errors.ts`
- [x] `customerProfileRepository.findUserIdById`
- [x] `server/repositories/review.repository.ts` (novo)
- [x] `server/repositories/review-tag.repository.ts` (novo)
- [x] `server/schemas/review.schema.ts` (novo)
- [x] `use-cases/shipments/reviews/submit-review.use-case.ts`
- [x] `use-cases/shipments/reviews/list-reviews-for-shipment.use-case.ts`
- [x] Registrar `reviewRepository`/`reviewTagRepository` em `server/repositories/index.ts`
- [x] Registrar use-cases em `server/use-cases/index.ts`
- [x] `app/api/shipments/[shipmentId]/reviews/route.ts` — POST + GET
- [x] Swagger — `lib/swagger/definitions/reviews.ts` (tag `Reviews`)
- [x] `docs/insomnia/s4-t1-review-api.json`
- [x] QA via curl: inserir 2 `ReviewTag` manuais via SQL primeiro; submit customer, submit carrier (shipment vira REVIEWED), submit 2x (409), tag targetRole errado (400), tag inexistente (400), rating fora de 1-5 (400), submit antes de DELIVERED (409), GET com 0/1/2 reviews
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S3-T4
