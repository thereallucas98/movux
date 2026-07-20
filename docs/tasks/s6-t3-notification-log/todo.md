# S6-T3 — Todo

- [ ] `lib/email/client.ts` — `SendEmailInput` vira união `{react} | {html}`
- [ ] `send-email-notification.ts` — capturar `{to, subject, html}` no metadata
- [ ] `notification-log.repository.ts` — `findById`, `findByStatus`, `markSent`, `markFailedAgain`
- [ ] `server/schemas/notification.schema.ts` (novo)
- [ ] `use-cases/notifications/list-notifications-for-admin.use-case.ts`
- [ ] `use-cases/notifications/retry-notification.use-case.ts`
- [ ] Registrar em `server/use-cases/index.ts`
- [ ] `app/api/admin/notifications/route.ts` — GET
- [ ] `app/api/admin/notifications/[notificationId]/retry/route.ts` — POST
- [ ] Swagger — `lib/swagger/definitions/notifications.ts` (tag `Notifications`)
- [ ] `docs/insomnia/s6-t3-notification-log.json`
- [ ] QA via curl: listar FAILED, retry com sucesso, retry em SENT (409), retry inexistente (404), 403 pra não-admin
- [ ] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S6-T1
