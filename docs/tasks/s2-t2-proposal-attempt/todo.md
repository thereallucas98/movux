# S2-T2 — Todo

- [x] `shipmentRepository.findForProposal`
- [x] `server/repositories/proposal.repository.ts` — `findByShipmentAndCarrier`, `create`, `addAttempt`, `updateStatus`
- [x] `use-cases/shipments/proposals/submit-proposal.use-case.ts`
- [x] `use-cases/shipments/proposals/add-proposal-attempt.use-case.ts`
- [x] `use-cases/shipments/proposals/withdraw-proposal.use-case.ts`
- [x] `use-cases/shipments/proposals/get-my-proposal.use-case.ts`
- [x] Registrar repo/use-cases nos barrels
- [x] `NOT_CALLED`, `ALREADY_PROPOSED`, `TOO_MANY_ATTEMPTS` em `error-response.ts` **e** `graphql/errors.ts`
- [x] `server/schemas/proposal.schema.ts` — `SubmitProposalSchema`, `AddProposalAttemptSchema`
- [x] `app/api/shipments/[shipmentId]/proposal/route.ts` — POST + GET
- [x] `app/api/shipments/[shipmentId]/proposal/attempts/route.ts` — POST
- [x] `app/api/shipments/[shipmentId]/proposal/withdraw/route.ts` — POST
- [x] `lib/swagger/definitions/proposals.ts` + tag `Proposals`
- [x] `docs/insomnia/s2-proposal-attempt.json`
- [x] QA via curl: submit (CALLED→ok), submit sem estar CALLED (409), submit duplicado (409), queue vira ACTIVE + refill, attempt (contra-oferta), 6ª tentativa (409), withdraw, get/proposal, get 404
- [x] `pnpm exec tsc --noEmit` **sem filtro**, diff contra a baseline da S2-T1 — zero erros novos
