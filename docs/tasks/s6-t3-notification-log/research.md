# S6-T3 — Research

## Decision Log

### Como guardar o suficiente pra retry

**Decision:** renderizar o `ReactElement` pra HTML **no momento do envio** (sucesso ou falha) e gravar `{to, subject, html}` em `NotificationLog.metadata`, junto do que já era gravado (`providerMessageId`/`error`). Retry reenvia esse HTML literal via uma nova opção `html` no `EmailClient`.

**Reason:** um `ReactElement` não é serializável em JSON — não dá pra guardar e "reidratar" depois. As duas alternativas reais eram (a) re-executar a use-case de negócio original no retry, ou (b) persistir o conteúdo já pronto. (a) é arriscado (o frete/documento pode ter mudado de estado entre o envio original e o retry, fazendo o email reenviado mentir sobre o estado atual) e mais complexo (precisaria guardar qual use-case gerar de novo, com quais parâmetros — informação que não existe hoje). (b) evita os dois problemas: o retry é puramente uma questão de camada de comunicação (reenviar bytes que já foram decididos), não de lógica de negócio. Sem trade-off de produto envolvido — é a única opção tecnicamente correta.

## Technical Analysis

- **`lib/email/client.ts` — `SendEmailInput` vira união:**
  ```ts
  export type SendEmailInput =
    | { to: string; subject: string; react: ReactElement }
    | { to: string; subject: string; html: string }
  ```
  `ResendClient.send`: passa `react` ou `html` pro SDK conforme o que veio. `ConsoleClient.send`: se vier `react`, renderiza como já faz; se vier `html`, loga direto.
- **`send-email-notification.ts` — retrofit:**
  ```ts
  const html = await render(input.react)
  try {
    const result = await getEmailClient().send({ to: input.to, subject: input.subject, react: input.react })
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'SENT', {
      providerMessageId: result.id, to: input.to, subject: input.subject, html,
    })
  } catch (error) {
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'FAILED', {
      error: ..., to: input.to, subject: input.subject, html,
    })
  }
  ```
- **`notification-log.repository.ts` — métodos novos:**
  ```ts
  findById(id): Promise<NotificationLog | null>
  findByStatus(filter: {status?, cursor?, limit?}): Promise<{data, nextCursor}>
  markSent(id, providerMessageId: string | null): Promise<void>
  ```
- **`retry-notification.use-case.ts` (novo):**
  1. `notificationLogRepo.findById(id)` → `NOT_FOUND`
  2. `status !== 'FAILED'` → `INVALID_STATE_TRANSITION`
  3. Extrai `{to, subject, html}` de `metadata` → `getEmailClient().send({to, subject, html})`
  4. Sucesso → `markSent(id, result.id)`; falha → atualiza `metadata.error` de novo, mantém `FAILED` (`try/catch`, nunca lança)
- **`list-failed-notifications.use-case.ts` (novo):** `notificationLogRepo.findByStatus({status: 'FAILED', ...})`

## Edge Cases

| Case | Behavior |
|---|---|
| Retry de notificação `SENT` | 409 |
| Retry de notificação inexistente | 404 |
| Retry de notificação gravada **antes** desta task (sem `html` em `metadata`) | falha ao tentar reenviar — sem conteúdo pra reenviar; tratado como falha (registrado, sem crash) — ver Follow-up |
| Retry bem-sucedido | `status: SENT`, `metadata.providerMessageId` atualizado |
| Retry falha de novo | continua `FAILED`, `metadata.error` atualizado com o novo erro |
| `CUSTOMER`/`CARRIER` chamando rotas `/admin/notifications/*` | 403 |

## Blockers

✅ No blockers.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
