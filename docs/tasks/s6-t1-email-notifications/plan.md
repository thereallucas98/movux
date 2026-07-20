# S6-T1 — Plan

Maior task do projeto até agora. Organizado em 6 fases.

---

## Fase 1 — Infraestrutura compartilhada

### `server/repositories/notification-log.repository.ts` (novo)
```ts
export interface NotificationLogRepository {
  create(
    userId: string,
    channel: 'EMAIL' | 'WHATSAPP',
    templateCode: string,
    status: 'SENT' | 'FAILED',
    metadata?: object,
  ): Promise<void>
}
```

### `server/notifications/send-email-notification.ts` (novo)
```ts
import type { ReactElement } from 'react'
import { getEmailClient } from '~/lib/email/client'
import type { NotificationLogRepository } from '../repositories/notification-log.repository'

export async function sendEmailNotification(
  notificationLogRepo: NotificationLogRepository,
  input: { userId: string; to: string; subject: string; react: ReactElement; templateCode: string },
): Promise<void> {
  try {
    const result = await getEmailClient().send({ to: input.to, subject: input.subject, react: input.react })
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'SENT', {
      providerMessageId: result.id,
    })
  } catch (error) {
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
```

### Templates novos (`lib/email/templates/`, `.tsx`, PT-BR, mesmo padrão de `verify-email.tsx`)
`proposal-received.tsx`, `proposal-accepted.tsx`, `safety-term-required.tsx`, `delivery-confirmation-request.tsx`, `document-approved.tsx`, `document-rejected.tsx`, `carrier-called.tsx`.

---

## Fase 2 — Verificação de email (infra nova)

- `lib/session.ts` — `signEmailVerificationToken(userId): string` / `verifyEmailVerificationToken(token): {userId} | null` (JWT, `purpose: 'email-verification'`, expira em 24h)
- `user.repository.ts` — método novo `markEmailVerified(userId): Promise<void>`
- `register-user.use-case.ts` — repos ganha `notificationLogRepo`; depois de criar o usuário, gera token, dispara `EMAIL_VERIFICATION` (best-effort, não afeta o retorno de sucesso do registro)
- `verify-email.use-case.ts` (novo) — recebe token, valida, chama `markEmailVerified`
- `app/api/auth/verify-email/route.ts` (novo) — `POST { token }`
- `app/api/auth/register/route.ts` — repassar `notificationLogRepository`

---

## Fase 3 — Retrofit direto (6 pontos de disparo, 4 use-cases já commitadas)

| Use-case | Repos novos | `templateCode` | Destinatário |
|---|---|---|---|
| `submit-proposal.use-case.ts` | `userRepo`, `notificationLogRepo` | `PROPOSAL_RECEIVED` | customer |
| `accept-proposal.use-case.ts` | `userRepo`, `notificationLogRepo` | `PROPOSAL_ACCEPTED` + `SAFETY_TERM_REQUIRED` ×2 | carrier vencedor; customer + carrier |
| `mark-delivered.use-case.ts` | `userRepo`, `notificationLogRepo` | `DELIVERY_CONFIRMATION_REQUEST` | customer |
| `approve-carrier-document.use-case.ts` | `userRepo`, `notificationLogRepo` | `DOCUMENT_APPROVED` | carrier |
| `reject-carrier-document.use-case.ts` | `userRepo`, `notificationLogRepo` | `DOCUMENT_REJECTED` | carrier |

Rotas correspondentes (repassar `userRepository`/`notificationLogRepository`):
```
app/api/shipments/[shipmentId]/proposal/route.ts                          (POST)
app/api/shipments/[shipmentId]/proposals/[proposalId]/accept/route.ts
app/api/shipments/[shipmentId]/deliver/route.ts
app/api/admin/carrier-documents/[documentId]/approve/route.ts
app/api/admin/carrier-documents/[documentId]/reject/route.ts
```

---

## Fase 4 — `CARRIER_CALLED` (threading completo)

### `refill-called-group.ts`
Assinatura: `(queueRepo, userRepo, notificationLogRepo, shipmentId)`. Pra cada entrada em `nextWaiting`, resolve `userRepo.findById(entry.carrierId)` e dispara `CARRIER_CALLED` via `sendEmailNotification`.

### `sweep-expired-proposals.ts`
Assinatura: `(proposalRepo, queueRepo, userRepo, notificationLogRepo, shipmentId)`, repassa os 2 novos parâmetros pro `refillCalledGroup` interno.

### 11 use-cases — repassar `userRepo`/`notificationLogRepo` (direto ou só repassando pro sweep)

| Use-case | Chama diretamente | Via sweep |
|---|---|---|
| `queue/join-proposal-queue.use-case.ts` | `refillCalledGroup` | `sweepExpiredProposals` |
| `queue/withdraw-proposal-queue.use-case.ts` | `refillCalledGroup` | — |
| `queue/get-my-queue-entry.use-case.ts` | — | `sweepExpiredProposals` |
| `proposals/submit-proposal.use-case.ts` | `refillCalledGroup` | `sweepExpiredProposals` |
| `proposals/reject-proposal.use-case.ts` | `refillCalledGroup` (condicional) | `sweepExpiredProposals` |
| `proposals/withdraw-proposal.use-case.ts` | `refillCalledGroup` | `sweepExpiredProposals` |
| `proposals/add-proposal-attempt.use-case.ts` | — | `sweepExpiredProposals` |
| `proposals/get-my-proposal.use-case.ts` | — | `sweepExpiredProposals` |
| `proposals/accept-proposal.use-case.ts` | — | `sweepExpiredProposals` |
| `proposals/list-proposals-for-shipment.use-case.ts` | — | `sweepExpiredProposals` |
| `proposals/sweep-expired-proposals.ts` | `refillCalledGroup` | (é o próprio sweep) |

`withdrawProposalQueue` tem assinatura solta (`queueRepo` direto, não objeto `repos`) — vira `(queueRepo, userRepo, notificationLogRepo, carrierId, shipmentId)`, único caso fora do padrão `repos` objeto.

### ~9 rotas — repassar `userRepository`/`notificationLogRepository`
```
app/api/shipments/[shipmentId]/queue/join/route.ts
app/api/shipments/[shipmentId]/queue/withdraw/route.ts
app/api/shipments/[shipmentId]/queue/me/route.ts
app/api/shipments/[shipmentId]/proposal/route.ts                          (POST já tocado na Fase 3; GET também precisa)
app/api/shipments/[shipmentId]/proposal/attempts/route.ts
app/api/shipments/[shipmentId]/proposal/withdraw/route.ts
app/api/shipments/[shipmentId]/proposals/route.ts
app/api/shipments/[shipmentId]/proposals/[proposalId]/accept/route.ts     (já tocado na Fase 3)
app/api/shipments/[shipmentId]/proposals/[proposalId]/reject/route.ts
```

---

## Fase 5 — Barrels, Swagger, Insomnia

- `server/repositories/index.ts` — registrar `notificationLogRepository`
- `server/use-cases/index.ts` — registrar `verifyEmail` (novo)
- Swagger: `lib/swagger/definitions/auth.ts` — endpoint `POST /api/auth/verify-email` novo; descrições atualizadas nos endpoints já existentes mencionando os emails disparados (não é endpoint novo pros outros, só nota na descrição)
- `docs/insomnia/s6-t1-email-notifications.json` — novo (request de verify-email)

---

## Fase 6 — QA e typecheck

QA via curl com `RESEND_API_KEY` **não configurada** — confirma que cada disparo aparece no console (`ConsoleClient`) e grava `NotificationLog` com `status: SENT` (envio "bem-sucedido" pro console, que é o comportamento real do `ConsoleClient` — não lança erro). Roteiro cobre:
1. Registro → email `EMAIL_VERIFICATION` no console + `NotificationLog`
2. `POST /verify-email` com token válido → `emailVerifiedAt` setado
3. `POST /verify-email` com token inválido/expirado → erro, sem setar
4. Fluxo completo (join → propose → accept → deliver → approve doc) — confirma `CARRIER_CALLED`, `PROPOSAL_RECEIVED`, `PROPOSAL_ACCEPTED`, `SAFETY_TERM_REQUIRED` ×2, `DELIVERY_CONFIRMATION_REQUEST`, `DOCUMENT_APPROVED`/`REJECTED` — todos aparecem no console e em `NotificationLog`
5. Confirma que nenhuma QA anterior quebrou (regressão — reaproveitar um curl de cada sprint anterior tocado)
6. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S5-T3
