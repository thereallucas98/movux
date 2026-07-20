# S4-T1 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S3-T4 concluído, `pnpm dev` ativo

---

## Setup — 2 ReviewTag manuais (S4-T3 ainda não existe) + shipment DELIVERED

```bash
docker exec movux-postgres psql -U postgres -d movux -c "
INSERT INTO \"reviewTag\" (id, code, label, target_role, is_active) VALUES
  (gen_random_uuid(), 'CAREFUL_WITH_ITEMS', 'Cuidadoso com os itens', 'CARRIER', true),
  (gen_random_uuid(), 'PUNCTUAL', 'Pontual', 'CUSTOMER', true);
"
CARRIER_TAG_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"reviewTag\" WHERE code = 'CAREFUL_WITH_ITEMS';")
CUSTOMER_TAG_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"reviewTag\" WHERE code = 'PUNCTUAL';")
echo "CARRIER_TAG_ID=$CARRIER_TAG_ID  CUSTOMER_TAG_ID=$CUSTOMER_TAG_ID"

BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s4t1_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S4T1","email":"qa.s4t1@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete review\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

curl -s -c "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S4T1","email":"qa.s4t1.c1@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999991001"}' > /dev/null
curl -s -c "/tmp/movux_s4t1_carrier2.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S4T1 2","email":"qa.s4t1.c2@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999991002"}' > /dev/null

curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 20000, "carrierSlaHours": 6}' > /dev/null
PROPOSAL_ID=$(curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL_ID/accept > /dev/null
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/collect > /dev/null
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/transit > /dev/null
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/deliver > /dev/null

echo "SHIPMENT_ID=$SHIPMENT_ID"
```

---

## 1. Submit antes de DELIVERED — usar um shipment em status anterior (pulando o setup até deliver)

Reaproveitar o setup até `accept` num 2º shipment (`SHIPMENT2_ID`, sem chegar em `deliver`) e:

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT2_ID/reviews \
  -H "Content-Type: application/json" -d '{"rating": 5}'
```

**Esperado:** 409

---

## 2. GET /reviews antes de qualquer review

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/reviews
```

**Esperado:** `[]`

---

## 3. Customer avalia o carrier com tag certa

```bash
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d "{\"rating\": 5, \"tagIds\": [\"$CARRIER_TAG_ID\"]}" -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201

---

## 4. Shipment continua DELIVERED (só 1 review)

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `DELIVERED`

---

## 5. Customer tenta de novo — 409

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d '{"rating": 4}'
```

**Esperado:** 409

---

## 6. Carrier avalia com tag de targetRole errado — 400

```bash
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d "{\"rating\": 5, \"tagIds\": [\"$CARRIER_TAG_ID\"]}"
```

**Esperado:** 400 (tag é `targetRole: CARRIER`, mas o avaliado pelo carrier é o customer — precisa de tag `CUSTOMER`)

---

## 7. Carrier avalia com tagId inexistente — 400

```bash
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d '{"rating": 5, "tagIds": ["00000000-0000-0000-0000-000000000000"]}'
```

**Esperado:** 400

---

## 8. rating fora de 1-5 — 400

```bash
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d '{"rating": 6}'
```

**Esperado:** 400

---

## 9. Carrier avalia com tag certa — completa o par, shipment vira REVIEWED

```bash
curl -s -b "/tmp/movux_s4t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d "{\"rating\": 4, \"tagIds\": [\"$CUSTOMER_TAG_ID\"]}" -w "\nHTTP %{http_code}\n"
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** 201, depois `REVIEWED`

---

## 10. GET /reviews com as duas — revieweeId correto em cada uma

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/reviews | python3 -c "
import sys,json
reviews = json.load(sys.stdin)
for r in reviews:
    print(r['reviewerRole'], r['rating'], r['revieweeId'])
"
```

**Esperado:** 2 reviews, `CUSTOMER` com `revieweeId` = id do carrier, `CARRIER` com `revieweeId` = id do customer

---

## 11. Swagger

`http://localhost:3001/api/api-docs` — 2 endpoints novos sob a tag `Reviews`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Submit antes de DELIVERED | 409 | ✅ |
| 2 | GET antes de qualquer review | `[]` | ✅ |
| 3 | Customer avalia (tag certa) | 201 | ✅ |
| 4 | Shipment continua DELIVERED (1 review) | confirmado | ✅ |
| 5 | Customer avalia 2x | 409 | ✅ |
| 6 | Tag de targetRole errado | 400 | ✅ |
| 7 | Tag inexistente | 400 | ✅ |
| 8 | Rating fora de 1-5 | 400 | ✅ |
| 9 | Carrier avalia (tag certa) — completa o par | 201, shipment REVIEWED | ✅ |
| 10 | GET com as duas — revieweeId correto | confirmado | ✅ |
| 11 | Swagger | endpoints presentes | ✅ |
