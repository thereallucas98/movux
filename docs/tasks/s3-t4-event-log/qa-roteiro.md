# S3-T4 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S3-T3 concluído, `pnpm dev` ativo

---

## Setup — fluxo completo até DELIVERED

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s3t4_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S3T4","email":"qa.s3t4@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete events\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")

echo "=== 1. GET /events num shipment DRAFT (nenhum evento ainda) ==="
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/events

curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

curl -s -c "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S3T4","email":"qa.s3t4.c1@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999990001"}' > /dev/null
curl -s -c "/tmp/movux_s3t4_carrier2.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S3T4 2","email":"qa.s3t4.c2@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999990002"}' > /dev/null

curl -s -b "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
curl -s -b "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 20000, "carrierSlaHours": 6}' > /dev/null

PROPOSAL_ID=$(curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL_ID/accept > /dev/null

echo "=== 2. GET /events com 1 confirmação de segurança — SAFETY_CONFIRMED não deve aparecer ainda ==="
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/events | python3 -c "
import sys,json
events = json.load(sys.stdin)
print([e['eventType'] for e in events])
"

curl -s -b "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/collect > /dev/null
curl -s -b "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/transit > /dev/null
curl -s -b "/tmp/movux_s3t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/deliver > /dev/null

echo "SHIPMENT_ID=$SHIPMENT_ID"
```

---

## 3. GET /events com o fluxo completo — 7 eventos, ordem cronológica, SAFETY_CONFIRMED só 1x

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/events | python3 -c "
import sys,json
events = json.load(sys.stdin)
print('total:', len(events))
print([e['eventType'] for e in events])
print('SAFETY_CONFIRMED count:', sum(1 for e in events if e['eventType'] == 'SAFETY_CONFIRMED'))
"
```

**Esperado:** `total: 7`, ordem `['PUBLISHED', 'PROPOSAL_RECEIVED', 'CARRIER_SELECTED', 'SAFETY_CONFIRMED', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED']`, `SAFETY_CONFIRMED count: 1`

---

## 4. `triggeredBy` correto em cada evento

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/events | python3 -c "
import sys,json
events = json.load(sys.stdin)
for e in events:
    print(e['eventType'], e['triggeredBy'])
"
```

**Esperado:** `PUBLISHED`/`CARRIER_SELECTED` com `triggeredBy` = id do customer; `PROPOSAL_RECEIVED`/`COLLECTED`/`IN_TRANSIT`/`DELIVERED` = id do carrier; `SAFETY_CONFIRMED` = `null`

---

## 5. GET /events pelo carrier selecionado

```bash
curl -s -b "/tmp/movux_s3t4_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/$SHIPMENT_ID/events
```

**Esperado:** 200

---

## 6. GET /events por quem não é participante — 404

```bash
curl -s -b "/tmp/movux_s3t4_carrier2.txt" -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/$SHIPMENT_ID/events
```

**Esperado:** 404

---

## 7. Swagger

`http://localhost:3001/api/api-docs` — 1 endpoint novo sob a tag `Shipment Events`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | GET /events em DRAFT | lista vazia | ✅ |
| 2 | GET /events com 1 confirmação de segurança | SAFETY_CONFIRMED ausente | ✅ |
| 3 | GET /events fluxo completo | 7 eventos, ordem certa | ✅ |
| 4 | `triggeredBy` de cada evento | correto | ✅ |
| 5 | GET pelo carrier selecionado | 200 | ✅ |
| 6 | GET por não-participante | 404 | ✅ |
| 7 | Swagger | endpoint presente | ✅ |
