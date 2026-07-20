# S6-T3 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`), `pnpm dev` ativo
**Pré-requisito:** S6-T1 concluído
**Nota:** `ConsoleClient` (sem `RESEND_API_KEY`) nunca lança erro de verdade — pra testar o retry, uma notificação `FAILED` com `metadata` válido é inserida direto via SQL, simulando uma falha real de provedor (mesmo padrão usado em QAs anteriores pra simular dados sem depender de serviço externo configurado).

---

## Setup — admin + notificação FAILED simulada

```bash
BASE="http://localhost:3001/api"

JAR_ADMIN="/tmp/movux_s6t3_admin.txt"
curl -s -c "$JAR_ADMIN" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Admin S6T3","email":"qa.s6t3.admin@movux.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
docker exec movux-postgres psql -U postgres -d movux -c "UPDATE \"user\" SET role = 'ADMIN' WHERE email = 'qa.s6t3.admin@movux.dev';"

JAR_CUSTOMER="/tmp/movux_s6t3_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S6T3","email":"qa.s6t3@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
CUSTOMER_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"user\" WHERE email = 'qa.s6t3@cliente.dev';")

docker exec movux-postgres psql -U postgres -d movux -c "
INSERT INTO \"notificationLog\" (id, user_id, channel, template_code, status, metadata, created_at)
VALUES (gen_random_uuid(), '$CUSTOMER_ID', 'EMAIL', 'TEST_TEMPLATE', 'FAILED',
  '{\"to\": \"qa.s6t3@cliente.dev\", \"subject\": \"Teste de retry\", \"html\": \"<p>Conteudo de teste</p>\", \"error\": \"Simulated failure\"}'::jsonb,
  now());
"
NOTIFICATION_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"notificationLog\" WHERE template_code = 'TEST_TEMPLATE';")
echo "NOTIFICATION_ID=$NOTIFICATION_ID"
```

---

## 1. Não-admin tenta listar — 403

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" $BASE/admin/notifications
```

**Esperado:** 403

---

## 2. Listar notificações FAILED

```bash
curl -s -b "$JAR_ADMIN" "$BASE/admin/notifications?status=FAILED" | python3 -c "
import sys,json
d = json.load(sys.stdin)
print([n['templateCode'] for n in d['data']])
"
```

**Esperado:** inclui `TEST_TEMPLATE`

---

## 3. Retry em notificação inexistente

```bash
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/notifications/00000000-0000-0000-0000-000000000000/retry
```

**Esperado:** 404

---

## 4. Retry com sucesso

```bash
curl -s -b "$JAR_ADMIN" -X POST $BASE/admin/notifications/$NOTIFICATION_ID/retry -w "\nHTTP %{http_code}\n"
docker exec movux-postgres psql -U postgres -d movux -c "SELECT status FROM \"notificationLog\" WHERE id = '$NOTIFICATION_ID';"
tail -10 /tmp/movux_dev_s6t3.log | grep "EMAIL DEV"
```

**Esperado:** 200; `status: SENT`; console mostra o reenvio com o `html` original ("Conteudo de teste")

---

## 5. Retry de novo (já SENT) — 409

```bash
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/notifications/$NOTIFICATION_ID/retry
```

**Esperado:** 409

---

## 6. Fluxo real da S6-T1 — confirma que `metadata` agora inclui `html`

```bash
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Outro Cliente","email":"qa.s6t3.outro@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT metadata ? 'html' FROM \"notificationLog\"
WHERE user_id = (SELECT id FROM \"user\" WHERE email = 'qa.s6t3.outro@cliente.dev')
AND template_code = 'EMAIL_VERIFICATION';
"
```

**Esperado:** `t` (true) — confirma que o retrofit do `sendEmailNotification` está capturando o HTML em envios reais, não só no dado simulado

---

## 7. Swagger

`http://localhost:3001/api/api-docs` — 2 endpoints novos sob a tag `Notifications`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Não-admin lista | 403 | ✅ |
| 2 | Listar FAILED | inclui a simulada | ✅ |
| 3 | Retry inexistente | 404 | ✅ |
| 4 | Retry com sucesso | 200, `SENT` | ✅ |
| 5 | Retry em SENT | 409 | ✅ |
| 6 | Fluxo real captura `html` | confirmado | ✅ |
| 7 | Swagger | endpoints presentes | ✅ |
