# S5-T2 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S5-T1 concluído, `pnpm dev` ativo
**Nota:** sem Supabase configurado, os documentos usados aqui são inseridos direto via SQL (simula uploads já concluídos) — a lógica de aprovação/rejeição não depende do conteúdo real do arquivo.

---

## Setup — carrier com 6 documentos (5 tipos + 1 duplicado de SELFIE), admin promovido

```bash
BASE="http://localhost:3001/api"

JAR_CARRIER="/tmp/movux_s5t2_carrier.txt"
curl -s -c "$JAR_CARRIER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S5T2","email":"qa.s5t2@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999995001"}' > /dev/null
CARRIER_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"user\" WHERE email = 'qa.s5t2@carrier.dev';")

JAR_ADMIN="/tmp/movux_s5t2_admin.txt"
curl -s -c "$JAR_ADMIN" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Admin S5T2","email":"qa.s5t2.admin@movux.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
docker exec movux-postgres psql -U postgres -d movux -c "UPDATE \"user\" SET role = 'ADMIN' WHERE email = 'qa.s5t2.admin@movux.dev';"

JAR_OTHER_CUSTOMER="/tmp/movux_s5t2_other_customer.txt"
curl -s -c "$JAR_OTHER_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Outro Customer","email":"qa.s5t2.other@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

docker exec movux-postgres psql -U postgres -d movux -c "
INSERT INTO \"carrierDocument\" (id, carrier_id, type, file_url, status, uploaded_at) VALUES
  (gen_random_uuid(), '$CARRIER_ID', 'CPF', 'https://fake/cpf.jpg', 'PENDING', now()),
  (gen_random_uuid(), '$CARRIER_ID', 'CNH_FRONT', 'https://fake/cnh-front.jpg', 'PENDING', now()),
  (gen_random_uuid(), '$CARRIER_ID', 'CNH_BACK', 'https://fake/cnh-back.jpg', 'PENDING', now()),
  (gen_random_uuid(), '$CARRIER_ID', 'ADDRESS_PROOF', 'https://fake/address.jpg', 'PENDING', now()),
  (gen_random_uuid(), '$CARRIER_ID', 'SELFIE', 'https://fake/selfie-1.jpg', 'PENDING', now()),
  (gen_random_uuid(), '$CARRIER_ID', 'SELFIE', 'https://fake/selfie-2.jpg', 'PENDING', now());
"

CPF_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"carrierDocument\" WHERE carrier_id = '$CARRIER_ID' AND type = 'CPF';")
CNH_FRONT_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"carrierDocument\" WHERE carrier_id = '$CARRIER_ID' AND type = 'CNH_FRONT';")
CNH_BACK_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"carrierDocument\" WHERE carrier_id = '$CARRIER_ID' AND type = 'CNH_BACK';")
ADDRESS_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"carrierDocument\" WHERE carrier_id = '$CARRIER_ID' AND type = 'ADDRESS_PROOF';")
SELFIE_IDS=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"carrierDocument\" WHERE carrier_id = '$CARRIER_ID' AND type = 'SELFIE' ORDER BY file_url;")
SELFIE1_ID=$(echo "$SELFIE_IDS" | sed -n '1p')
SELFIE2_ID=$(echo "$SELFIE_IDS" | sed -n '2p')

echo "CARRIER_ID=$CARRIER_ID"
echo "CPF_ID=$CPF_ID CNH_FRONT_ID=$CNH_FRONT_ID CNH_BACK_ID=$CNH_BACK_ID ADDRESS_ID=$ADDRESS_ID"
echo "SELFIE1_ID=$SELFIE1_ID SELFIE2_ID=$SELFIE2_ID"
```

---

## 1. CUSTOMER tenta acessar rota admin — 403

```bash
curl -s -b "$JAR_OTHER_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" $BASE/admin/carrier-documents
```

**Esperado:** 403

---

## 2. Aprovar 4 dos 5 tipos — verificationStatus continua PENDING

```bash
for id in $CPF_ID $CNH_FRONT_ID $CNH_BACK_ID $ADDRESS_ID; do
  curl -s -b "$JAR_ADMIN" -o /dev/null -w "approve $id HTTP %{http_code}\n" -X POST $BASE/admin/carrier-documents/$id/approve
done
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT verification_status FROM \"carrierProfile\" WHERE user_id = '$CARRIER_ID';
"
```

**Esperado:** 4× 200; `verification_status = PENDING`

---

## 3. Rejeitar 1 das SELFIEs duplicadas — verificationStatus continua PENDING (não vira REJECTED)

```bash
curl -s -b "$JAR_ADMIN" -X POST $BASE/admin/carrier-documents/$SELFIE1_ID/reject \
  -H "Content-Type: application/json" -d '{"rejectionReason": "Foto desfocada"}' -w "\nHTTP %{http_code}\n"
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT verification_status FROM \"carrierProfile\" WHERE user_id = '$CARRIER_ID';
"
```

**Esperado:** 200; `verification_status` continua `PENDING`

---

## 4. Reject sem rejectionReason — 400

```bash
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/carrier-documents/$SELFIE2_ID/reject \
  -H "Content-Type: application/json" -d '{}'
```

**Esperado:** 400

---

## 5. Aprovar a 2ª SELFIE — completa os 5 tipos, verificationStatus vira APPROVED

```bash
curl -s -b "$JAR_ADMIN" -X POST $BASE/admin/carrier-documents/$SELFIE2_ID/approve -w "\nHTTP %{http_code}\n"
docker exec movux-postgres psql -U postgres -d movux -c "
SELECT verification_status, verified_by FROM \"carrierProfile\" WHERE user_id = '$CARRIER_ID';
"
```

**Esperado:** 200; `verification_status = APPROVED`, `verified_by` = id do admin

---

## 6. Revisar documento já revisado (SELFIE1, já REJECTED) — 409

```bash
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/admin/carrier-documents/$SELFIE1_ID/approve
```

**Esperado:** 409

---

## 7. GET filtrado por status

```bash
curl -s -b "$JAR_ADMIN" "$BASE/admin/carrier-documents?status=REJECTED" | python3 -c "
import sys,json
docs = json.load(sys.stdin)
print([d['type'] for d in docs.get('data', docs)])
"
```

**Esperado:** contém a SELFIE rejeitada

---

## 8. Swagger

`http://localhost:3001/api/api-docs` — 3 endpoints novos sob a tag `Carrier Documents`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | CUSTOMER acessa rota admin | 403 | ✅ |
| 2 | Aprovar 4/5 tipos | PENDING | ✅ |
| 3 | Rejeitar 1 duplicata de SELFIE | continua PENDING | ✅ |
| 4 | Reject sem motivo | 400 | ✅ |
| 5 | Aprovar a 2ª SELFIE (completa os 5) | APPROVED | ✅ |
| 6 | Revisar documento já revisado | 409 | ✅ |
| 7 | GET filtrado por status | confirmado | ✅ |
| 8 | Swagger | endpoints presentes | ✅ |
