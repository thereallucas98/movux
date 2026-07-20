# S3-T1 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S2-T4 concluído, `pnpm dev` ativo

---

## Setup — shipment CARRIER_SELECTED, 2 carriers (1 selecionado, 1 perdedor)

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s3t1_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S3T1","email":"qa.s3t1@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete safety\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

for i in 1 2; do
  curl -s -c "/tmp/movux_s3t1_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier S3T1 $i\",\"email\":\"qa.s3t1.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399997000$i\"}" > /dev/null
  curl -s -b "/tmp/movux_s3t1_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
  curl -s -b "/tmp/movux_s3t1_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
    -H "Content-Type: application/json" -d "{\"priceInCents\": 2${i}000, \"carrierSlaHours\": 6}" > /dev/null
done

PROPOSAL1_ID=$(curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL1_ID/accept > /dev/null

echo "SHIPMENT_ID=$SHIPMENT_ID (carrier1 = selecionado, carrier2 = perdedor)"
```

---

## 1. GET /safety antes de qualquer confirmação

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/safety
```

**Esperado:** `{"customer":null,"carrier":null}`

---

## 2. Customer confirma

```bash
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201, `role: CUSTOMER`, `confirmedAt` preenchido.

---

## 3. Carrier perdedor tenta confirmar — 404

```bash
curl -s -b "/tmp/movux_s3t1_carrier2.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm
```

**Esperado:** 404 (não é o carrier selecionado)

---

## 4. Carrier selecionado confirma

```bash
curl -s -b "/tmp/movux_s3t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201, `role: CARRIER`

---

## 5. GET /safety com os dois confirmados

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/safety
```

**Esperado:** `customer` e `carrier` ambos preenchidos com `confirmedAt`.

---

## 6. Customer confirma de novo — 409 ALREADY_CONFIRMED

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm
```

**Esperado:** 409

---

## 7. Confirm em shipment que ainda não é CARRIER_SELECTED — 409

```bash
RESP2=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"DELIVERY\", \"description\": \"frete draft\", \"vehicleTypeRequired\": \"ANY\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 4,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT2_ID=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT2_ID/publish > /dev/null

curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT2_ID/safety/confirm
```

**Esperado:** 409 (shipment está `OPEN`, não `CARRIER_SELECTED`)

---

## 8. ADMIN tenta confirmar — 403

```bash
# /auth/register só aceita CUSTOMER|CARRIER — registra como CUSTOMER e promove via DB
JAR_ADMIN="/tmp/movux_s3t1_admin.txt"
curl -s -c "$JAR_ADMIN" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Admin S3T1","email":"qa.s3t1.admin@movux.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
docker exec movux-postgres psql -U postgres -d movux -c "UPDATE \"user\" SET role = 'ADMIN' WHERE email = 'qa.s3t1.admin@movux.dev';"
curl -s -b "$JAR_ADMIN" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm
```

**Esperado:** 403

---

## 9. ipAddress registrado

```bash
docker exec movux-postgres psql -U postgres -d movux -c "SELECT shipment_id, role, ip_address FROM \"safetyCheckIn\" WHERE shipment_id = '$SHIPMENT_ID';"
```

**Esperado:** 2 linhas, `ip_address` preenchido (ou `null` se sem proxy em dev — aceitável).

---

## 10. Swagger

`http://localhost:3001/api-docs` — 2 endpoints novos sob a tag `Safety`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | GET /safety antes de confirmar | `{customer:null,carrier:null}` | ✅ |
| 2 | Customer confirma | 201 | ✅ |
| 3 | Carrier perdedor confirma | 404 | ✅ |
| 4 | Carrier selecionado confirma | 201 | ✅ |
| 5 | GET /safety com os dois | ambos preenchidos | ✅ |
| 6 | Customer confirma 2x | 409 ALREADY_CONFIRMED | ✅ |
| 7 | Confirm fora de CARRIER_SELECTED | 409 | ✅ |
| 8 | ADMIN confirma | 403 | ✅ (roteiro original registrava `role: ADMIN` direto via `/auth/register`, que rejeita esse valor com 400 — corrigido para registrar CUSTOMER e promover via `UPDATE "user" SET role = 'ADMIN'`) |
| 9 | ipAddress persistido | confirmado (`::1` em dev local) | ✅ |
| 10 | Swagger | endpoints presentes (`/api/api-docs`, não `/api-docs/swagger.json`) | ✅ |
