# S2-T1 — Todo

- [x] `shipmentRepository.findStatusById` (não owner-scoped)
- [x] `server/repositories/proposal-queue.repository.ts` — todos os métodos do plan.md
- [x] `use-cases/shipments/queue/refill-called-group.ts` (helper interno)
- [x] `use-cases/shipments/queue/join-proposal-queue.use-case.ts`
- [x] `use-cases/shipments/queue/withdraw-proposal-queue.use-case.ts`
- [x] `use-cases/shipments/queue/get-my-queue-entry.use-case.ts`
- [x] Registrar repo/use-cases nos barrels
- [x] `ALREADY_IN_QUEUE` em `error-response.ts` (409) + `graphql/errors.ts` (ver validation.md)
- [x] `app/api/shipments/[shipmentId]/queue/join/route.ts` — POST
- [x] `app/api/shipments/[shipmentId]/queue/withdraw/route.ts` — POST
- [x] `app/api/shipments/[shipmentId]/queue/me/route.ts` — GET
- [x] `lib/swagger/definitions/proposal-queue.ts` + tag `Proposal Queue`
- [x] `docs/insomnia/s2-proposal-queue.json`
- [x] QA via curl: join (WAITING), 4º carrier fica WAITING com 3 CALLED, withdraw libera vaga pro próximo, get/me, join duplicado (409), join em shipment não-OPEN (409)
- [x] Typecheck sem erros novos
