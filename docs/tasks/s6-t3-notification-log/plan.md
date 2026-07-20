# S6-T3 — Plan

## `lib/email/client.ts` — `SendEmailInput` vira união

```ts
export type SendEmailInput =
  | { to: string; subject: string; react: ReactElement }
  | { to: string; subject: string; html: string }
```

`ResendClient.send`: `'react' in input ? { react: input.react } : { html: input.html }` no payload do SDK.
`ConsoleClient.send`: `const html = 'react' in input ? await render(input.react) : input.html` antes de logar.

## `server/notifications/send-email-notification.ts` — retrofit

Sempre renderiza `input.react` pra HTML antes de chamar `getEmailClient().send()` (que continua recebendo `react`, comportamento de envio inalterado); grava `{to, subject, html}` junto de `providerMessageId`/`error` no `metadata`.

## `server/repositories/notification-log.repository.ts` — métodos novos

```ts
findById(id): Promise<NotificationLog | null>
findByStatus(filter: {status?: NotificationDeliveryStatus; cursor?: string; limit?: number}): Promise<{data: NotificationLog[]; nextCursor: string | null}>
markSent(id: string, providerMessageId: string | null): Promise<void>
markFailedAgain(id: string, error: string): Promise<void>
```

## Schemas — `server/schemas/notification.schema.ts` (novo)

```ts
export const NotificationIdParamSchema = z.object({ notificationId: z.uuid() })
export const ListNotificationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
```

## Use-cases (`server/use-cases/notifications/`)

### `list-notifications-for-admin.use-case.ts`
`notificationLogRepo.findByStatus(filter)`

### `retry-notification.use-case.ts`
1. `notificationLogRepo.findById(id)` → `NOT_FOUND`
2. `status !== 'FAILED'` → `INVALID_STATE_TRANSITION`
3. Extrai `{to, subject, html}` de `metadata` (tipado via cast + guard — `metadata` é `Json`)
4. `try { result = await getEmailClient().send({to, subject, html}); markSent(id, result.id) } catch { markFailedAgain(id, error) }`
5. Sempre retorna `{success: true}` — mesmo se o reenvio falhar de novo, a ação de "tentar retry" foi executada com sucesso (o resultado fica no `status` da notificação, não no HTTP da rota — mesma filosofia de `sendEmailNotification` nunca lançar)

## Rotas

```
app/api/admin/notifications/route.ts                    — GET (ADMIN)
app/api/admin/notifications/[notificationId]/retry/route.ts — POST (ADMIN)
```

## Swagger + Insomnia

- `lib/swagger/definitions/notifications.ts` (novo) — 2 endpoints, tag `Notifications`
- `docs/insomnia/s6-t3-notification-log.json` — novo

## Ordem de execução

1. `lib/email/client.ts` — união `SendEmailInput`
2. `send-email-notification.ts` — captura `{to, subject, html}`
3. `notification-log.repository.ts` — `findById`/`findByStatus`/`markSent`/`markFailedAgain`
4. `server/schemas/notification.schema.ts`
5. 2 use-cases
6. Registrar nos barrels
7. 2 rotas
8. Swagger
9. Insomnia
10. QA via curl: forçar uma falha real (ex. desligar a rede momentaneamente não é prático — usar um `to` inválido que quebre o parsing do provider, ou mockar via SQL um registro `FAILED` direto com `metadata` válido pra testar só o retry em si); listar `FAILED`; retry com sucesso (`SENT`); retry em notificação `SENT` (409); retry inexistente (404); 403 pra não-admin
11. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S6-T1
