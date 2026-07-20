# S6-T1 — Exploration

## Per-event audit (`DATABASE-DESIGN.md §11.1`, 13 eventos com Email ✅)

| Evento | Produtor real hoje? | Notas |
|---|---|---|
| Email verification | ⚠️ parcial | `register-user.use-case.ts` (S0-T2) existe, mas **não envia nada hoje** e não há mecanismo de token de verificação (`User.emailVerifiedAt` existe no schema, nunca escrito). Precisa de infra nova: assinatura de token + endpoint `POST /api/auth/verify-email` |
| Carrier called for shipment | ✅ mas com o mesmo problema da S3-T4 | `refill-called-group.ts` (S2-T1) — chamado de 6 use-cases diretamente + via `sweepExpiredProposals` (chamado por mais 4). Mesmo blast radius identificado na S3-T4 pro `CARRIER_CALLED` do event log — precisa de decisão na Research |
| Proposal received | ✅ | `submit-proposal.use-case.ts` (S2-T2) |
| Proposal accepted | ✅ | `accept-proposal.use-case.ts` (S2-T4) — notifica o carrier vencedor |
| SLA expiring (1h before) | ❌ | exige job agendado; não existe cron neste projeto (só lazy-sweep, que depende de alguém chamar um endpoint) |
| Carrier selected | ✅ (mesmo trigger de "Proposal accepted") | mesma use-case, `accept-proposal.use-case.ts` — provavelmente o mesmo evento visto de dois públicos (carrier "sua proposta foi aceita" vs. confirmação pro customer) |
| Safety term required | ✅ | mesmo trigger — `accept-proposal.use-case.ts`, shipment vira `CARRIER_SELECTED`, os dois lados precisam confirmar segurança (S3-T1) |
| Shipment collected | — (só WhatsApp na tabela) | fora do escopo desta task |
| ETA window alert | ❌ | depende de `etaMinutes`/`windowExpiresAt`, que dependem de integração Google Maps — não implementada |
| Delivery confirmation request | ✅ | `mark-delivered.use-case.ts` (S3-T2) — notifica o customer |
| Review reminder | ❌ | exige job agendado de verdade (diferente do lazy-sweep — ninguém chama um endpoint só pra "ser lembrado") |
| Subscription payment reminder | ❌ | não existe nenhum CRUD de `Subscription`/billing construído em nenhuma sprint até agora |
| Document approved/rejected | ✅ | `approve-carrier-document.use-case.ts` / `reject-carrier-document.use-case.ts` (S5-T2) — notifica o carrier, 2 use-cases/2 templates |

**Resultado:** 6 eventos com produtor real e direto (`PROPOSAL_RECEIVED`, `PROPOSAL_ACCEPTED`/`CARRIER_SELECTED`, `SAFETY_TERM_REQUIRED`, `DELIVERY_CONFIRMATION_REQUEST`, `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`) + 1 que precisa de infra nova (`EMAIL_VERIFICATION`) + 1 com o mesmo problema de blast radius da S3-T4 (`CARRIER_CALLED`) + 4 sem produtor nenhum (fora de escopo, mesma razão de tasks anteriores).

## Key files (patterns to mirror)

- `lib/email/client.ts` — `getEmailClient()` já resolve Resend-vs-Console automaticamente; só chamar `.send({ to, subject, react })`.
- `lib/email/templates/verify-email.tsx` — padrão de template `.tsx` com `@react-email/components` a seguir pros templates novos.
- `server/use-cases/shipments/get-shipment-events.use-case.ts` (S3-T4) — precedente de "não deixar uma falha em ação auxiliar quebrar o fluxo principal": lá é `shipmentEventRepo.create`, aqui é `emailClient.send` — ambos precisam de `try/catch` silencioso (ou quase — aqui precisa **registrar a falha** em `NotificationLog`, não só ignorar).
- `lib/session.ts#signAccessToken`/`verifyAccessToken` — padrão de assinatura JWT a reaproveitar pro token de verificação de email (payload distinto, expiração curta, ex. 24h).

## Integration points

- **`NotificationRepository` (novo):** `create(userId, channel, templateCode, status, metadata?)` — grava em `NotificationLog` tanto sucesso quanto falha de envio.
- **Isolamento de falha:** cada disparo de email precisa ser `try/catch` dentro do próprio use-case, nunca deixando propagar — se o `uploadFile` (S5-T1) tinha que **falhar** a requisição com um código específico, aqui é o oposto: o envio de email **nunca** deve fazer a requisição principal falhar, só registrar o resultado.
- **Múltiplos emails por 1 chamada de use-case:** `accept-proposal.use-case.ts` precisaria disparar até 3 emails diferentes numa única execução (proposta aceita pro vencedor, termo de segurança pros dois lados) — mais um motivo pra manter os disparos desacoplados/best-effort dentro da use-case, não uma chamada só.

## Risks

- Mesmo risco da S3-T4: um retrofit espalhado por 6+ use-cases já commitadas e QA'd — cada inserção precisa ser conferida contra este mapeamento, não feita de memória.
- Se o isolamento de falha (`try/catch`) for esquecido em algum ponto, um erro do Resend/console (improvável, mas possível) passaria a quebrar fluxos de negócio já estáveis — risco maior que o do event log da S3-T4, que era só um `INSERT` simples.
