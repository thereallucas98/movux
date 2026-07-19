# S0-T1 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| Check | Status | Notes |
|---|---|---|
| Docker postgres up | ✅ | `movux-postgres`, porta 5442 (não 5432 — ver docker-compose.yml) |
| `pnpm prisma migrate dev --name init` | ✅ | migration `20260719142642_init` aplicada sem erros |
| 36 tabelas de domínio visíveis | ✅ | verificado via `psql \dt` (ambiente headless, Prisma Studio não aberto) |
| `pnpm prisma generate` sem erros de tipo | ✅ | client gerado em `apps/web/src/generated/prisma` |
| Nomes de tabela | ⚠️ desvio | `qa-roteiro.md` listava snake_case (`customer_profile`); implementado como camelCase (`customerProfile`) — `plan.md` continha o erro, `CLAUDE.md` e `DATABASE-DESIGN.md` §14 mandam camelCase |
| Partial unique index em `user.email` (`WHERE deleted_at IS NULL`) | ❌ não implementado | Prisma schema DSL não suporta índices parciais — `email` é `@unique` simples; ver Follow-ups |
| 24 enums do brief | ✅ | + 2 adicionais não previstos no brief (`PaymentStatus`, `NotificationDeliveryStatus`), exigidos pelo DATABASE-DESIGN.md §4.3 e §11.1 |

## Deviations from plan.md / brief.md

1. **`@@map` convention** — `plan.md` especificava snake_case; corrigido para camelCase (CLAUDE.md + DATABASE-DESIGN.md §14 são a fonte de verdade real).
2. **2 enums extras** (`PaymentStatus`, `NotificationDeliveryStatus`) — necessários para mapear `subscriptionPayment.status` e `notificationLog.status` fielmente; não estavam na lista de 24 do brief.
3. **Índices parciais (§13)** — implementados como índices completos (sem `WHERE`); a DSL do Prisma não expressa índices filtrados. Constraint "1 membro ativo por company" em `companyMembership` fica só na camada de aplicação (mesmo padrão já usado pelo doc pra regra do OWNER único).
4. **Migration history resetada** — as 17 migrations antigas do domínio Turnora foram apagadas (estavam commitadas, recuperáveis via git) e substituídas por uma única `init`, alinhado com "do zero".
5. **`apps/web/.env`** — `DATABASE_URL`/`DIRECT_URL` corrigidos de `turnora` para `movux` (leftover do clone).
6. **Ambiente** — `node_modules` com link quebrado de `signal-exit` corrigido com reinstall limpo; não relacionado ao schema.

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| Partial unique index em `user.email` | Migration manual em SQL bruto adicionando `WHERE deleted_at IS NULL` | Se soft-delete de usuário virar necessidade real (não é usado no fluxo MVP) |
| Unicidade de `companyMembership` (1 ativo por company) | Enforcement no use-case de join/leave da company | S5 (Carrier Verification) ou quando o fluxo de company for implementado |

## Out of scope (confirmed, per brief.md)

- Seed de dados (S1-T1, S1-T2)
- Triggers / stored procedures
- Índices além dos definidos no DATABASE-DESIGN.md §13
