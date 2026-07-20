# S5-T2 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `CUSTOMER` tenta acessar rota `/admin/*` | 403 | ✅ |
| 2 | Aprovar 4 dos 5 tipos obrigatórios | `CarrierProfile.verificationStatus` continua `PENDING` | ✅ |
| 3 | Rejeitar 1 das 2 `SELFIE` duplicadas | continua `PENDING` (rejeição isolada não trava o perfil) | ✅ |
| 4 | `reject` sem `rejectionReason` | 400 | ✅ |
| 5 | Aprovar a 2ª `SELFIE` (completa os 5 tipos distintos) | `verificationStatus: APPROVED`, `verified_by` = admin | ✅ |
| 6 | Revisar documento já revisado (a `SELFIE` rejeitada) | 409 | ✅ |
| 7 | `GET` filtrado por `status=REJECTED` | retorna a `SELFIE` rejeitada | ✅ |
| 8 | Swagger — 3 endpoints sob `Carrier Documents` | presentes | ✅ |

Todos os 8 casos passaram de primeira, incluindo o caso de borda da contagem por tipo distinto (2 uploads de `SELFIE`, um rejeitado e outro aprovado, sem inflar nem travar a contagem). Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S5-T1, todos pré-existentes no código legado do Turnora. Zero erros novos em `carrier-document`/`carrier-profile`.

## Desvios encontrados durante execução

Nenhum. Duas decisões de regra de negócio, ambas registradas em `research.md` **antes** do Plan e confirmadas exatamente como esperado na QA:

1. **Auto-approve** — `CarrierProfile.verificationStatus → APPROVED` dispara sozinho quando o 5º tipo distinto é aprovado, sem ação manual extra do admin.
2. **Sem auto-reject** — rejeitar 1 documento nunca move `verificationStatus` pra `REJECTED`; fica `PENDING`, permitindo reenvio.

## Acceptance criteria (brief.md)

- [x] `POST /approve` muda `status` pra `APPROVED`, registra `reviewedBy`/`reviewedAt`
- [x] `POST /reject` exige `rejectionReason`, muda `status` pra `REJECTED`
- [x] Aprovar/rejeitar documento já revisado → 409
- [x] `GET` lista documentos filtrados por `status`
- [x] Endpoints acessíveis só por `ADMIN` — 403 pra `CUSTOMER`/`CARRIER`
- [x] Comportamento de `CarrierProfile.verificationStatus` conforme decisão da Research
- [x] Swagger documenta os 3 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

Nenhum.
