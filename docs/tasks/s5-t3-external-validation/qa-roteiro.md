# S5-T3 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S5-T2 concluído, `pnpm dev` ativo

---

## Setup — carrier com 1 documento aprovado (reaproveita padrão da S5-T2)

```bash
BASE="http://localhost:3001/api"

JAR_CARRIER="/tmp/movux_s5t3_carrier.txt"
curl -s -c "$JAR_CARRIER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S5T3","email":"qa.s5t3@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999996001"}' > /dev/null
CARRIER_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"user\" WHERE email = 'qa.s5t3@carrier.dev';")

JAR_ADMIN="/tmp/movux_s5t3_admin.txt"
curl -s -c "$JAR_ADMIN" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Admin S5T3","email":"qa.s5t3.admin@movux.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
docker exec movux-postgres psql -U postgres -d movux -c "UPDATE \"user\" SET role = 'ADMIN' WHERE email = 'qa.s5t3.admin@movux.dev';"

JAR_OTHER_CUSTOMER="/tmp/movux_s5t3_other_customer.txt"
curl -s -c "$JAR_OTHER_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Outro Customer S5T3","email":"qa.s5t3.other@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

docker exec movux-postgres psql -U postgres -d movux -c "
INSERT INTO \"carrierDocument\" (id, carrier_id, type, file_url, status, uploaded_at) VALUES
  (gen_random_uuid(), '$CARRIER_ID', 'CPF', 'https://fake/cpf.jpg', 'PENDING', now());
"
DOC_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"carrierDocument\" WHERE carrier_id = '$CARRIER_ID' AND type = 'CPF';")
curl -s -b "$JAR_ADMIN" -X POST $BASE/admin/carrier-documents/$DOC_ID/approve > /dev/null

echo "DOC_ID=$DOC_ID"
```

---

## 1. Registrar MATCH com notes (documento já APPROVED)

```bash
curl -s -b "$JAR_ADMIN" -X POST $BASE/admin/carrier-documents/$DOC_ID/external-validation \
  -H "Content-Type: application/json" -d '{"result": "MATCH", "notes": "Conferido na Receita, nome bate"}' -w "\nHTTP %{http_code}\n"
docker exec movux-postgres psql -U postgres -d movux -c "SELECT external_validation FROM \"carrierDocument\" WHERE id = '$DOC_ID';"
```

**Esperado:** 200; `external_validation` = `{"provider":"MANUAL","result":"MATCH","notes":"...","checkedBy":"...","checkedAt":"..."}`

---

## 2. Sobrescrever (MISMATCH)

```bash
curl -s -b "$JAR_ADMIN" -X POST $BASE/admin/carrier-documents/$DOC_ID/external-validation \
  -H "Content-Type: application/json" -d '{"result": "MISMATCH"}' -w "\nHTTP %{http_code}\n"
docker exec movux-postgres psql -U postgres -d movux -c "SELECT external_validation->>'result' FROM \"carrierDocument\" WHERE id = '$DOC_ID';"
```

**Esperado:** 200; `result = MISMATCH` (sobrescreveu, sem `notes` já que foi omitido)

---

## 3. result inválido

```bash
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/carrier-documents/$DOC_ID/external-validation \
  -H "Content-Type: application/json" -d '{"result": "MAYBE"}'
```

**Esperado:** 400

---

## 4. Documento inexistente

```bash
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/carrier-documents/00000000-0000-0000-0000-000000000000/external-validation \
  -H "Content-Type: application/json" -d '{"result": "MATCH"}'
```

**Esperado:** 404

---

## 5. CUSTOMER/CARRIER tentando

```bash
curl -s -b "$JAR_OTHER_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/carrier-documents/$DOC_ID/external-validation \
  -H "Content-Type: application/json" -d '{"result": "MATCH"}'
```

**Esperado:** 403

---

## 6. Swagger

`http://localhost:3001/api/api-docs` — endpoint novo sob a tag `Carrier Documents`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Registrar MATCH com notes (doc APPROVED) | 200, envelope correto | ✅ |
| 2 | Sobrescrever com MISMATCH | 200, sobrescrito | ✅ |
| 3 | result inválido | 400 | ✅ |
| 4 | Documento inexistente | 404 | ✅ |
| 5 | CUSTOMER/CARRIER | 403 | ✅ |
| 6 | Swagger | endpoint presente | ✅ |
