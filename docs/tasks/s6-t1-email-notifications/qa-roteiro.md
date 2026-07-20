# S6-T1 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`), `pnpm dev` com output visível no terminal (pra ver o `ConsoleClient` logando)
**Pré-requisito:** S5-T3 concluído
**Nota:** `RESEND_API_KEY` não configurada — todo email esperado aparece no console (`=== [EMAIL DEV] to=... subject="..." ===`), nunca é enviado de verdade.

---

## 1. Registro → EMAIL_VERIFICATION

```bash
BASE="http://localhost:3001/api"
JAR_CUSTOMER="/tmp/movux_s6t1_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S6T1","email":"qa.s6t1@cliente.dev","password":"Senha@123","role":"CUSTOMER"}'
```

**Esperado:** 200/201, registro funciona normalmente; terminal do `pnpm dev` mostra `[EMAIL DEV] to=qa.s6t1@cliente.dev subject="..."` com o corpo do template de verificação (contendo um link/token)

```bash
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT channel, template_code, status FROM \"notificationLog\"
WHERE user_id = (SELECT id FROM \"user\" WHERE email = 'qa.s6t1@cliente.dev');
"
```

**Esperado:** 1 linha, `channel: EMAIL`, `template_code: EMAIL_VERIFICATION`, `status: SENT`

---

## 2. Verify-email com token inválido

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/auth/verify-email \
  -H "Content-Type: application/json" -d '{"token": "token-invalido"}'
```

**Esperado:** 400/404

---

## 3. Verify-email com token válido (extraído do log do console)

```bash
# Copiar o token do link logado no console e substituir abaixo
TOKEN="<colar do console>"
curl -s -X POST $BASE/auth/verify-email -H "Content-Type: application/json" -d "{\"token\": \"$TOKEN\"}" -w "\nHTTP %{http_code}\n"
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT email_verified_at IS NOT NULL FROM \"user\" WHERE email = 'qa.s6t1@cliente.dev';
"
```

**Esperado:** 200; `email_verified_at` preenchido

---

## 4. Fluxo completo — confirma os 7 templates + NotificationLog

Reaproveitar o setup padrão das sprints anteriores (registrar carrier, publicar frete, entrar na fila, propor, aceitar, confirmar segurança, coletar, em trânsito, entregar, aprovar documento) e, a cada passo, conferir:

```bash
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT template_code, status, count(*) FROM \"notificationLog\" GROUP BY template_code, status ORDER BY template_code;
"
```

**Esperado ao final do fluxo completo:** linhas com `status: SENT` pra `EMAIL_VERIFICATION`, `CARRIER_CALLED`, `PROPOSAL_RECEIVED`, `PROPOSAL_ACCEPTED`, `SAFETY_TERM_REQUIRED` (×2 — customer e carrier), `DELIVERY_CONFIRMATION_REQUEST`, `DOCUMENT_APPROVED`

---

## 5. Regressão — sprints anteriores continuam passando

Reexecutar pelo menos 1 caso de cada task tocada nesta retrofit, confirmando que o comportamento principal (não relacionado a email) continua idêntico:
- `POST /queue/join` → 201 normalmente (S2-T1)
- `POST /proposal` → 201 normalmente (S2-T2)
- `POST /proposals/:id/accept` → 200, shipment `CARRIER_SELECTED` (S2-T4)
- `POST /deliver` → 200, shipment `DELIVERED` (S3-T2)
- `POST /admin/carrier-documents/:id/approve` → 200 (S5-T2)

**Esperado:** todos idênticos ao comportamento já validado nas respectivas `validation.md` — só ganharam o efeito colateral do email, nada mudou na resposta principal

---

## 6. Falha de email não quebra o fluxo (verificação de isolamento)

Difícil simular uma falha real do `ConsoleClient` (ele não lança) — a garantia vem da revisão de código (`sendEmailNotification` sempre captura). Confirmar visualmente que `sendEmailNotification` está com `try/catch` em todos os pontos de disparo listados no `plan.md`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Registro → EMAIL_VERIFICATION no console + log | confirmado | ✅ |
| 2 | Verify-email token inválido | erro | ✅ |
| 3 | Verify-email token válido | `emailVerifiedAt` setado | ✅ |
| 4 | Fluxo completo — 7 templates disparados | todos `SENT` | ✅ |
| 5 | Regressão das sprints anteriores | comportamento idêntico | ✅ |
| 6 | Isolamento de falha (revisão de código) | `try/catch` em todos os pontos | ✅ |
