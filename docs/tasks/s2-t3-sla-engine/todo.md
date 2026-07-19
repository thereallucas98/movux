# S2-T3 — Todo

- [x] `proposalRepository.findExpiredActiveByShipment`
- [x] `use-cases/shipments/proposals/sweep-expired-proposals.ts` (helper interno)
- [x] `join-proposal-queue.use-case.ts` — + `proposalRepo`, chama sweep
- [x] `get-my-queue-entry.use-case.ts` — + `proposalRepo`, chama sweep
- [x] `submit-proposal.use-case.ts` — chama sweep
- [x] `add-proposal-attempt.use-case.ts` — + `queueRepo`, chama sweep
- [x] `withdraw-proposal.use-case.ts` — chama sweep
- [x] `get-my-proposal.use-case.ts` — + `queueRepo`, chama sweep
- [x] Ajustar rotas cujas assinaturas de use-case mudaram (`queue/join`, `queue/me`, `proposal` GET, `proposal/attempts`)
- [x] QA via curl: simular expiração via `UPDATE` direto no banco, confirmar sweep em cada um dos 6 pontos de entrada
- [x] Confirmar sweep idempotente (rodar 2x)
- [x] Confirmar proposta não-`ACTIVE` ou não-vencida não é afetada
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline — zero erros novos
