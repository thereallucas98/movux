# S6-T1 — Research

## Decision Log

### `CARRIER_CALLED` — threading completo (diferente da decisão da S3-T4)

**Decision:** completo — `refillCalledGroup` e `sweepExpiredProposals` passam a exigir `userRepo` + `notificationRepo`, e os ~11 use-cases que os chamam (diretamente ou via sweep) propagam essas dependências.

**Reason:** decisão explícita do usuário, diferente da S3-T4 — ali o `CARRIER_CALLED` do event log era só um registro de auditoria sem consumidor; aqui é o gatilho real pro carrier saber que precisa agir (submeter proposta). O valor de negócio justifica o custo de threading que a S3-T4 evitou.

### Nome do repositório novo — `notification-log.repository.ts`, não `notification.repository.ts`

**Reason:** já existe `server/repositories/notification.repository.ts`, mas opera sobre o model `Notification` do domínio Turnora (notificação in-app, com `workspaceId`/`readAt`) — completamente diferente do `NotificationLog` do Movux (trilha de envio de email/WhatsApp, `DATABASE-DESIGN.md §11.1`). Nome distinto evita colisão e confusão.

### Helper central `sendEmailNotification` — evita duplicar try/catch em cada use-case

**Decision:** 1 função em `server/notifications/send-email-notification.ts` encapsula `getEmailClient().send(...)` + gravação em `NotificationLog` (sucesso ou falha), usada por todos os pontos de disparo. Nenhuma use-case chama `getEmailClient()` diretamente.

**Reason:** repetir `try/catch` + grava-log em 8 use-cases diferentes seria duplicação real (viola Anti-Duplication do `arche.md`); um helper único garante que **nenhum** ponto de disparo esqueça o isolamento de falha (risco identificado na Exploration).

### `EMAIL_VERIFICATION` — token JWT reaproveitando `signAccessToken`/`verifyAccessToken`

**Decision:** novo par de funções `signEmailVerificationToken`/`verifyEmailVerificationToken` em `lib/session.ts`, mesmo mecanismo JWT já usado pra sessão, só que com `purpose: 'email-verification'` no payload e expiração de 24h — não precisa de tabela nova pra token.

**Reason:** projeto já tem JWT como mecanismo de token estabelecido (sessão); reaproveitar evita introduzir uma segunda tecnologia de token (ex. UUID + tabela) só pra esse caso.

## Technical Analysis

### Infraestrutura compartilhada (construída 1x, usada por todos os disparos)

- **`server/repositories/notification-log.repository.ts` (novo):**
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
- **`server/notifications/send-email-notification.ts` (novo):**
  ```ts
  export async function sendEmailNotification(
    notificationLogRepo: NotificationLogRepository,
    input: { userId: string; to: string; subject: string; react: ReactElement; templateCode: string },
  ): Promise<void> {
    try {
      const result = await getEmailClient().send({ to: input.to, subject: input.subject, react: input.react })
      await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'SENT', { providerMessageId: result.id })
    } catch (error) {
      await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'FAILED', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  ```
  Nunca lança — quem chama nunca precisa de `try/catch` ao redor.
- **`userRepo.findById(userId)`** (já existe) resolve `{email, fullName}` de qualquer `userId` — reutilizado em todos os pontos de disparo pra montar o destinatário.

### Templates novos (`lib/email/templates/`)

7 templates: `proposal-received.tsx`, `proposal-accepted.tsx`, `safety-term-required.tsx`, `delivery-confirmation-request.tsx`, `document-approved.tsx`, `document-rejected.tsx`, `carrier-called.tsx`.

### Retrofit — pontos de disparo diretos (6 use-cases)

| Use-case | `templateCode` | Destinatário |
|---|---|---|
| `submit-proposal.use-case.ts` | `PROPOSAL_RECEIVED` | customer (dono do shipment) |
| `accept-proposal.use-case.ts` | `PROPOSAL_ACCEPTED` | carrier vencedor |
| `accept-proposal.use-case.ts` | `SAFETY_TERM_REQUIRED` | customer **e** carrier vencedor (2 envios) |
| `mark-delivered.use-case.ts` | `DELIVERY_CONFIRMATION_REQUEST` | customer |
| `approve-carrier-document.use-case.ts` | `DOCUMENT_APPROVED` | carrier |
| `reject-carrier-document.use-case.ts` | `DOCUMENT_REJECTED` | carrier |

`accept-proposal.use-case.ts` dispara 3 emails no total (1 `PROPOSAL_ACCEPTED` + 2 `SAFETY_TERM_REQUIRED`) — todos via `sendEmailNotification`, sequenciais, nenhum bloqueia o outro nem a resposta da requisição.

### Retrofit — `CARRIER_CALLED` (threading completo)

- `refill-called-group.ts`: assinatura passa a `(queueRepo, userRepo, notificationLogRepo, shipmentId)`; pra cada entrada em `nextWaiting`, resolve o carrier via `userRepo.findById` e dispara `CARRIER_CALLED` via `sendEmailNotification`.
- `sweep-expired-proposals.ts`: assinatura passa a `(proposalRepo, queueRepo, userRepo, notificationLogRepo, shipmentId)`, repassando os 2 novos parâmetros pro `refillCalledGroup` interno.
- **11 use-cases afetados** (precisam passar os 2 repos novos, direto ou só repassando pro `sweepExpiredProposals`): `join-proposal-queue`, `withdraw-proposal-queue` (proposal-queue), `submit-proposal`, `reject-proposal`, `withdraw-proposal`, `add-proposal-attempt`, `accept-proposal`, `get-my-proposal`, `get-my-queue-entry`, `list-proposals-for-shipment` — mais o próprio `sweep-expired-proposals.ts`.
- **~9 rotas** correspondentes precisam passar `userRepository`/`notificationLogRepository` nos objetos de repos montados.

### `EMAIL_VERIFICATION` (infra nova)

- `lib/session.ts` — `signEmailVerificationToken(userId)` / `verifyEmailVerificationToken(token): {userId} | null`
- `register-user.use-case.ts` — depois de criar o usuário, gera o token, dispara `EMAIL_VERIFICATION` via `sendEmailNotification` (best-effort — falha no envio não impede o registro)
- `verify-email.use-case.ts` (novo) + `POST /api/auth/verify-email` (novo) — recebe o token, seta `userRepo.markEmailVerified(userId)` (novo método)

## Edge Cases

| Case | Behavior |
|---|---|
| `RESEND_API_KEY` não configurada | `ConsoleClient` loga no console; `NotificationLog` grava `status: SENT` mesmo assim (o "envio" pro console é considerado sucesso — só o Resend real que pode falhar de fato) |
| `getEmailClient().send()` lança (ex. Resend fora do ar) | `sendEmailNotification` captura, grava `status: FAILED`, fluxo principal continua normalmente |
| `accept-proposal` — 1 dos 3 emails falha | os outros 2 continuam disparando independentemente (chamadas sequenciais, não uma transação) |
| Token de verificação expirado (> 24h) | `verifyEmailVerificationToken` retorna `null` → 400/404, sem setar `emailVerifiedAt` |
| Verificar email já verificado | idempotente — reaplicar não causa erro |
| `refillCalledGroup` chama 2 carriers de uma vez | 2 emails `CARRIER_CALLED`, 2 linhas em `NotificationLog` |

## Blockers

✅ No blockers — decisões registradas.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3) — dado o tamanho, o Plan vai listar os ~20 arquivos tocados de forma explícita, igual a S3-T4 fez.
