# S3-T3 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S3-T2 concluído, `pnpm dev` ativo

---

## Setup — shipment DELIVERED (fluxo completo: publish → propose → accept → safety → collect → transit → deliver)

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s3t3_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S3T3","email":"qa.s3t3@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete delivery\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

for i in 1 2; do
  curl -s -c "/tmp/movux_s3t3_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier S3T3 $i\",\"email\":\"qa.s3t3.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399999000$i\"}" > /dev/null
  curl -s -b "/tmp/movux_s3t3_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
  curl -s -b "/tmp/movux_s3t3_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
    -H "Content-Type: application/json" -d "{\"priceInCents\": 2${i}000, \"carrierSlaHours\": 6}" > /dev/null
done

PROPOSAL1_ID=$(curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL1_ID/accept > /dev/null
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s3t3_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s3t3_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/collect > /dev/null
curl -s -b "/tmp/movux_s3t3_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/transit > /dev/null
curl -s -b "/tmp/movux_s3t3_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/deliver -w "deliver HTTP %{http_code}\n"

echo "SHIPMENT_ID=$SHIPMENT_ID"
```

---

## 1. GET antes de qualquer confirmação

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/delivery-confirmation
```

**Esperado:** `null`

---

## 2. POST confirmed:false sem issueDescription — 400

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/delivery-confirmation \
  -H "Content-Type: application/json" -d '{"confirmed": false}'
```

**Esperado:** 400

---

## 3. GET por carrier perdedor — 404

```bash
curl -s -b "/tmp/movux_s3t3_carrier2.txt" -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/$SHIPMENT_ID/delivery-confirmation
```

**Esperado:** 404

---

## 4. POST confirmed:true

```bash
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/delivery-confirmation \
  -H "Content-Type: application/json" -d '{"confirmed": true}' -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201, `confirmed: true`

---

## 5. POST de novo — 409

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/delivery-confirmation \
  -H "Content-Type: application/json" -d '{"confirmed": true}'
```

**Esperado:** 409 `ALREADY_CONFIRMED`

---

## 6. GET pelo carrier selecionado — confirmado

```bash
curl -s -b "/tmp/movux_s3t3_carrier1.txt" $BASE/shipments/$SHIPMENT_ID/delivery-confirmation
```

**Esperado:** registro com `confirmed: true`

---

## 7. Novo shipment — confirmed:false com issueDescription

```bash
# Repetir o setup até "deliver" com um 2º shipment (SHIPMENT2_ID) — omitido por brevidade, reaproveitar bloco acima.
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT2_ID/delivery-confirmation \
  -H "Content-Type: application/json" -d '{"confirmed": false, "issueDescription": "Caixa amassada"}' -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201, `confirmed: false`, `issueDescription: "Caixa amassada"`

---

## 8. Auto-confirm após 24h (3º shipment, sem confirmação manual)

```bash
# Repetir o setup até "deliver" com um 3º shipment (SHIPMENT3_ID)
docker exec movux-postgres psql -U postgres -d movux -c "UPDATE shipment SET delivered_at = now() - interval '25 hours' WHERE id = '$SHIPMENT3_ID';"

curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT3_ID/delivery-confirmation
```

**Esperado:** registro auto-criado, `confirmed: true`, `customerId` = dono do shipment

---

## 9. Confirm fora de DELIVERED — 409

```bash
RESP4=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"DELIVERY\", \"description\": \"frete open\", \"vehicleTypeRequired\": \"ANY\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 4,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT4_ID=$(echo "$RESP4" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT4_ID/publish > /dev/null
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT4_ID/delivery-confirmation \
  -H "Content-Type: application/json" -d '{"confirmed": true}'
```

**Esperado:** 409

---

## 10. Swagger

`http://localhost:3001/api/api-docs` — 2 endpoints novos sob a tag `Delivery Confirmation`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | GET antes de confirmar | `null` | ✅ |
| 2 | POST confirmed:false sem issue | 400 | ✅ |
| 3 | GET por carrier perdedor | 404 | ✅ |
| 4 | POST confirmed:true | 201 | ✅ |
| 5 | POST 2x | 409 | ✅ |
| 6 | GET pelo carrier selecionado | confirmado | ✅ |
| 7 | POST confirmed:false com issue | 201 | ✅ |
| 8 | Auto-confirm após 24h | confirmed:true automático | ✅ |
| 9 | Confirm fora de DELIVERED | 409 | ✅ |
| 10 | Swagger | endpoints presentes | ✅ |
