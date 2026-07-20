# S6-T3 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Não-admin tenta listar | 403 | ✅ |
| 2 | Listar `FAILED` | inclui a notificação simulada | ✅ |
| 3 | Retry em notificação inexistente | 404 | ✅ |
| 4 | Retry com sucesso | 200, `status: SENT`, console mostra o HTML original reenviado | ✅ |
| 5 | Retry em notificação já `SENT` | 409 | ✅ |
| 6 | Fluxo real (registro de usuário) grava `html` em `metadata` | confirmado | ✅ |
| 7 | Swagger — 2 endpoints sob `Notifications` | presentes | ✅ |

Todos os 7 casos passaram de primeira, incluindo a confirmação de que o HTML reenviado no retry é literalmente o mesmo conteúdo capturado no envio original. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros — diff vazio contra a baseline da S5-T3, todos pré-existentes (legado Turnora, incluindo o módulo `Notification`/`NotificationType` — diferente de `NotificationLog`, que é o modelo desta task). Zero erros novos.

## Desvios encontrados durante execução

**Nome do arquivo de schema:** o `plan.md` não especificou o nome exato, mas `server/schemas/notification.schema.ts` já existe (schema Turnora pro model `Notification` in-app, não relacionado). Usado `notification-log.schema.ts` — mesmo padrão de nome distinto já usado no repositório (`notification-log.repository.ts` vs. `notification.repository.ts`).

## Acceptance criteria (brief.md)

- [x] `sendEmailNotification` grava `{to, subject, html}` — suficiente pro retry funcionar
- [x] `GET /admin/notifications?status=FAILED` lista as notificações falhas
- [x] `POST /admin/notifications/:id/retry` reenvia com sucesso e atualiza `status: SENT`
- [x] Retry numa notificação `SENT` → 409
- [x] Retry numa notificação inexistente → 404
- [x] Endpoints acessíveis só por `ADMIN`
- [x] Swagger + Insomnia atualizados

## Follow-ups

- Notificações gravadas **antes** desta task (S6-T1, sem `html` em `metadata`) não podem ser reenviadas — o `retry-notification.use-case.ts` já trata esse caso graciosamente (marca `FAILED` de novo com uma mensagem explicativa, não lança erro), mas não há nada a "consertar" retroativamente — são registros históricos.
