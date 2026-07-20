# S6-T1 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Registro → dispara `EMAIL_VERIFICATION` | aparece no console (`ConsoleClient`), `NotificationLog` com `status: SENT` | ✅ |
| 2 | `POST /verify-email` com token inválido | erro (400) | ✅ |
| 3 | `POST /verify-email` com token válido | `User.emailVerifiedAt` setado | ✅ |
| 4 | Fluxo completo (registro → join → propose → accept → safety → collect → transit → deliver → approve doc) | 7 templates disparados: `EMAIL_VERIFICATION` (×3, incluindo admin), `CARRIER_CALLED`, `PROPOSAL_RECEIVED`, `PROPOSAL_ACCEPTED`, `SAFETY_TERM_REQUIRED` (×2), `DELIVERY_CONFIRMATION_REQUEST`, `DOCUMENT_APPROVED` — todos `status: SENT` | ✅ |
| 5 | Regressão — shipment chega em `DELIVERED` com `finalPriceInCents` correto | comportamento idêntico às validações anteriores (S2-S5) | ✅ |
| 6 | Isolamento de falha — `sendEmailNotification` nunca propaga erro | confirmado por revisão de código: `try/catch` presente, usado em todos os 8 pontos de disparo | ✅ |

Todos os 6 casos passaram. Maior retrofit do projeto — 8 pontos de disparo de email (incluindo os 2 de `accept-proposal` que geram 3 envios numa única chamada) + threading completo do `CARRIER_CALLED` por 11 use-cases + infraestrutura nova de verificação de email.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros — **diff vazio** contra a baseline salva da S5-T3 (mesmos erros, linha por linha, todos pré-existentes no código legado do Turnora). Zero erros novos em ~35 arquivos tocados.

## Desvios encontrados durante execução

1. **`signEmailVerificationToken`/`verifyEmailVerificationToken` foram pra `lib/auth.ts`, não `lib/session.ts`** (como o `plan.md` previa) — `auth.ts` já concentra os outros signers de token (`signAccessToken`), enquanto `session.ts` é especificamente sobre extrair/verificar o token de sessão da cookie. Mantém a coerência do arquivo existente.
2. **Template `CarrierCalled` simplificado** (sem `shipmentDescription`) — decisão tomada durante a Execution pra evitar que `refillCalledGroup` precisasse de mais uma dependência (`shipmentRepo`), que ampliaria ainda mais o blast radius do threading já grande. O email fica genérico ("frete disponível na fila") em vez de citar a descrição específica — aceitável, já que o carrier vai ver os detalhes completos ao abrir a fila no app.
3. **`VerifyEmail` (template da S0-T2/Turnora) reaproveitado sem alteração** — já tinha exatamente o formato necessário (`token`+`appUrl` → link `/verify-email?token=...`), nenhum template novo precisou ser criado pra isso.
4. Achado de QA (não bug): a primeira tentativa de testar `approve-carrier-document` falhou (`HTTP 000`) por um erro de captura de variável bash (`RETURNING id` misturado com o header `INSERT 0 1` do psql) — corrigido reformulando o comando; não é um problema do código da aplicação.

## Acceptance criteria (brief.md)

- [x] Cada evento com produtor real dispara o email correspondente, sem quebrar o fluxo principal se o envio falhar
- [x] Cada envio grava uma linha em `NotificationLog`
- [x] Templates em PT-BR, um por `templateCode`
- [x] `pnpm dev` sem `RESEND_API_KEY` — emails aparecem no console via `ConsoleClient`
- [x] Não quebra nenhuma QA anterior (diff de typecheck vazio + regressão funcional confirmada)

## Follow-ups

- `CARRIER_CALLED`, `SLA expiring`, `ETA window alert`, `Review reminder`, `Subscription payment reminder` — os 3 últimos continuam fora de escopo (sem cron, sem Google Maps, sem billing) até essas dependências existirem.
- Quando `RESEND_API_KEY` for configurada, revalidar ao menos 1 envio real (fora do escopo desta QA, que rodou inteiramente no `ConsoleClient`).
