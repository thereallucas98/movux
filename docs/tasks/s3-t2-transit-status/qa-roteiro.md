# S3-T2 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S3-T1 concluído, `pnpm dev` ativo

---

## Setup — shipment CARRIER_SELECTED, 2 carriers (1 selecionado, 1 perdedor), safety incompleto

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s3t2_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S3T2","email":"qa.s3t2@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete transit\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

for i in 1 2; do
  curl -s -c "/tmp/movux_s3t2_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier S3T2 $i\",\"email\":\"qa.s3t2.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399998000$i\"}" > /dev/null
  curl -s -b "/tmp/movux_s3t2_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
  curl -s -b "/tmp/movux_s3t2_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
    -H "Content-Type: application/json" -d "{\"priceInCents\": 2${i}000, \"carrierSlaHours\": 6}" > /dev/null
done

PROPOSAL1_ID=$(curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL1_ID/accept > /dev/null

echo "SHIPMENT_ID=$SHIPMENT_ID (carrier1 = selecionado, carrier2 = perdedor)"
```

---

## 1. Collect sem nenhum safety check-in — 409

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/collect
```

**Esperado:** 409 `SAFETY_NOT_CONFIRMED`

---

## 2. Collect com só 1 dos 2 confirmados — 409

```bash
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/collect
```

**Esperado:** 409 `SAFETY_NOT_CONFIRMED`

---

## 3. Carrier perdedor tenta collect — 404

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s3t2_carrier2.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/collect
```

**Esperado:** 404

---

## 4. Transit antes de collect — 409

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/transit
```

**Esperado:** 409 (status ainda `CARRIER_SELECTED`)

---

## 5. Collect com os dois confirmados — 200, status COLLECTED

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/collect -w "\nHTTP %{http_code}\n"
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** 200, `COLLECTED`

---

## 6. Deliver antes de transit — 409

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/deliver
```

**Esperado:** 409 (status ainda `COLLECTED`)

---

## 7. Transit — 200, status IN_TRANSIT

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/transit -w "\nHTTP %{http_code}\n"
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** 200, `IN_TRANSIT`

---

## 8. Deliver — 200, status DELIVERED

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/deliver -w "\nHTTP %{http_code}\n"
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** 200, `DELIVERED`

---

## 9. Collect de novo (já DELIVERED) — 409

```bash
curl -s -b "/tmp/movux_s3t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/collect
```

**Esperado:** 409

---

## 10. Swagger

`http://localhost:3001/api/api-docs` — 3 endpoints novos sob a tag `Transit`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Collect sem safety | 409 | ✅ |
| 2 | Collect com 1/2 safety | 409 | ✅ |
| 3 | Collect por carrier perdedor | 404 | ✅ |
| 4 | Transit antes de collect | 409 | ✅ |
| 5 | Collect completo | 200 COLLECTED | ✅ |
| 6 | Deliver antes de transit | 409 | ✅ |
| 7 | Transit | 200 IN_TRANSIT | ✅ |
| 8 | Deliver | 200 DELIVERED | ✅ |
| 9 | Collect após DELIVERED | 409 | ✅ |
| 10 | Swagger | endpoints presentes | ✅ |
