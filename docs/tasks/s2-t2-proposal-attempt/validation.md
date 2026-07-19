# S2-T2 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Resultado |
|---|---|---|
| 1 | Carrier join | ✅ `CALLED` |
| 2 | Propor sem estar `CALLED` | ✅ 409 `NOT_CALLED` |
| 3 | Submeter proposta | ✅ 201, `agreedSlaHours = ceil((8+6)/2) = 7` |
| 4 | Queue entry vira `ACTIVE` | ✅ |
| 5 | Submeter de novo | ✅ 409 `ALREADY_PROPOSED` |
| 6 | Contra-oferta (attempt 2) | ✅ `currentAttempt: 2`, 2 attempts |
| 7 | Esgotar até 5, 6ª bloqueada | ✅ attempts 3/4/5 → 201; 6ª → 409 `TOO_MANY_ATTEMPTS` |
| 8 | `GET /proposal` | ✅ `currentAttempt: 5`, 5 attempts |
| 9 | Withdraw | ✅ proposal `WITHDRAWN`, queue entry `WITHDRAWN` |
| 10 | Swagger | ✅ 3 paths sob a tag `Proposals` |
| — | Typecheck completo, sem filtro | ✅ 422 linhas, idênticas à baseline da S2-T1 (só diferença cosmética de ordenação num erro pré-existente) |

## Deviations from plan.md / brief.md

Nenhum — execução seguiu o plan.md exatamente como escrito. A lição da S2-T1 (atualizar `error-response.ts` **e** `graphql/errors.ts` juntos, e rodar typecheck sem filtro) foi aplicada preventivamente e confirmou zero regressão.

## Out of scope (confirmed, per brief.md)

- Accept/reject de tentativa pelo customer (S2-T4)
- Expiração automática de propostas (S2-T3)
- Limite de propostas ativas por plano

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| `expiresAt` da proposta nunca é varrido/checado | S2-T3 (SLA engine) implementa o mecanismo de expiração automática | Próxima task |
