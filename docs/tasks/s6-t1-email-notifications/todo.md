# S6-T1 — Todo

## Fase 1 — Infra compartilhada
- [x] `server/repositories/notification-log.repository.ts` (novo)
- [x] `server/notifications/send-email-notification.ts` (novo)
- [x] 7 templates em `lib/email/templates/`: `proposal-received`, `proposal-accepted`, `safety-term-required`, `delivery-confirmation-request`, `document-approved`, `document-rejected`, `carrier-called`

## Fase 2 — Verificação de email
- [x] `lib/session.ts` — `signEmailVerificationToken`/`verifyEmailVerificationToken`
- [x] `user.repository.ts` — `markEmailVerified`
- [x] Retrofit `register-user.use-case.ts`
- [x] `verify-email.use-case.ts` (novo)
- [x] `app/api/auth/verify-email/route.ts` (novo)
- [x] Retrofit `app/api/auth/register/route.ts`

## Fase 3 — Retrofit direto
- [x] Retrofit `submit-proposal.use-case.ts` → `PROPOSAL_RECEIVED`
- [x] Retrofit `accept-proposal.use-case.ts` → `PROPOSAL_ACCEPTED` + `SAFETY_TERM_REQUIRED` ×2
- [x] Retrofit `mark-delivered.use-case.ts` → `DELIVERY_CONFIRMATION_REQUEST`
- [x] Retrofit `approve-carrier-document.use-case.ts` → `DOCUMENT_APPROVED`
- [x] Retrofit `reject-carrier-document.use-case.ts` → `DOCUMENT_REJECTED`
- [x] Retrofit 5 rotas correspondentes

## Fase 4 — CARRIER_CALLED (threading completo)
- [x] `refill-called-group.ts` — nova assinatura + disparo
- [x] `sweep-expired-proposals.ts` — nova assinatura, repassa pro refill
- [x] Retrofit `join-proposal-queue.use-case.ts`
- [x] Retrofit `withdraw-proposal-queue.use-case.ts`
- [x] Retrofit `get-my-queue-entry.use-case.ts`
- [x] Retrofit `submit-proposal.use-case.ts` (assinatura do sweep)
- [x] Retrofit `reject-proposal.use-case.ts`
- [x] Retrofit `withdraw-proposal.use-case.ts`
- [x] Retrofit `add-proposal-attempt.use-case.ts`
- [x] Retrofit `get-my-proposal.use-case.ts`
- [x] Retrofit `accept-proposal.use-case.ts` (assinatura do sweep)
- [x] Retrofit `list-proposals-for-shipment.use-case.ts`
- [x] Retrofit 9 rotas correspondentes

## Fase 5 — Barrels, Swagger, Insomnia
- [x] Registrar `notificationLogRepository` em `server/repositories/index.ts`
- [x] Registrar `verifyEmail` em `server/use-cases/index.ts`
- [x] Swagger — endpoint `verify-email` novo
- [x] `docs/insomnia/s6-t1-email-notifications.json`

## Fase 6 — QA e typecheck
- [x] QA via curl: registro → email verificação, verify-email válido/inválido, fluxo completo confirmando os 7 templates no console + NotificationLog, regressão das sprints anteriores
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S5-T3
