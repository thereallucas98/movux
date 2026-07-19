# S2-T3 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Resultado |
|---|---|---|
| 1 | Proposta antes de expirar | ✅ `ACTIVE` |
| 2 | Expiração forçada via SQL | ✅ |
| 3 | `queue/join` de outro carrier dispara o sweep | ✅ 201 |
| 4 | Proposta expirada, lida via `GET /proposal` | ✅ `EXPIRED` |
| 5 | Queue entry correspondente | ✅ `EXHAUSTED` |
| 6 | Sweep rodado 2x | ✅ idempotente, sem erro |
| 7 | Proposta não vencida (outro carrier) | ✅ permanece `ACTIVE`, não afetada |
| — | Typecheck completo, sem filtro | ✅ 422 linhas, idêntico à baseline (só diferença cosmética de ordenação no mesmo erro pré-existente) |

## Deviations from plan.md / brief.md

Nenhum — execução seguiu o plan.md exatamente como escrito.

## Out of scope (confirmed, per brief.md)

- Job de background/cron real
- Notificação de expiração pro carrier/customer
- Accept/reject explícito do customer (S2-T4)

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| Lazy sweep só expira quando alguém interage com o shipment | Se precisar de expiração "em tempo real" (sem esperar uma requisição), trocar por job de background | Fase 2+ (quando cron/Vercel Cron entrar em pauta, per `ROADMAP.md` antigo §3.10) |

Sprint 2 completo após esta task (S2-T1 fila, S2-T2 propostas, S2-T3 expiração automática). Falta só a S2-T4 (customer accept).
