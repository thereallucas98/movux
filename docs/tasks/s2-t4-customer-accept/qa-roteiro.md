# S2-T4 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S2-T3 concluído, `pnpm dev` ativo

---

## Setup — 1 shipment, 2 carriers propõem

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s2t4_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S2T4","email":"qa.s2t4@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete accept\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

for i in 1 2; do
  curl -s -c "/tmp/movux_s2t4_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier S2T4 $i\",\"email\":\"qa.s2t4.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399996000$i\"}" > /dev/null
  curl -s -b "/tmp/movux_s2t4_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
  curl -s -b "/tmp/movux_s2t4_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
    -H "Content-Type: application/json" -d "{\"priceInCents\": 2${i}000, \"carrierSlaHours\": 6}" > /dev/null
done
echo "SHIPMENT_ID=$SHIPMENT_ID"
```

---

## 1. Shipment virou PROPOSALS_RECEIVED (fix da S2-T2)

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `PROPOSALS_RECEIVED`

---

## 2. Customer lista as propostas

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "
import sys,json
d = json.load(sys.stdin)
for p in d:
    print(p['id'], p['carrierId'], p['status'], p['attempts'][-1]['priceInCents'])
"
```

**Esperado:** 2 propostas, ambas `ACTIVE`. Guardar o `id` da 1ª como `PROPOSAL1_ID`, o da 2ª como `PROPOSAL2_ID`.

---

## 3. Customer aceita a proposta 1

```bash
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL1_ID/accept -w "\nHTTP %{http_code}\n"
```

**Esperado:** 200.

---

## 4. Shipment vira CARRIER_SELECTED com finalPriceInCents

```bash
curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d['finalPriceInCents'])"
```

**Esperado:** `CARRIER_SELECTED 21000`

---

## 5. Proposta 2 foi rejeitada automaticamente (cascata)

```bash
curl -s -b "/tmp/movux_s2t4_carrier2.txt" $BASE/shipments/$SHIPMENT_ID/proposal | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `REJECTED`

---

## 6. Fila do carrier 2 está EXHAUSTED

```bash
curl -s -b "/tmp/movux_s2t4_carrier2.txt" $BASE/shipments/$SHIPMENT_ID/queue/me | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `EXHAUSTED`

---

## 7. Accept de novo (proposta já ACCEPTED/shipment não é mais PROPOSALS_RECEIVED) — 409

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL1_ID/accept
```

---

## 8. Fluxo de reject (shipment separado) — tentativa < 5 continua ACTIVE

```bash
# Novo shipment, 1 carrier, propõe, customer rejeita a 1ª tentativa
RESP2=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"DELIVERY\", \"description\": \"frete reject\", \"vehicleTypeRequired\": \"ANY\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 4,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT2_ID=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT2_ID/publish > /dev/null
curl -s -b "/tmp/movux_s2t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT2_ID/queue/join > /dev/null
RESP3=$(curl -s -b "/tmp/movux_s2t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT2_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 4000, "carrierSlaHours": 4}')
PROPOSAL3_ID=$(echo "$RESP3" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT2_ID/proposals/$PROPOSAL3_ID/reject -w "\nHTTP %{http_code}\n"

echo "=== proposta deve continuar ACTIVE (só 1ª tentativa rejeitada) ==="
curl -s -b "/tmp/movux_s2t4_carrier1.txt" $BASE/shipments/$SHIPMENT2_ID/proposal | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d['attempts'][0]['responseType'])"
```

**Esperado:** reject 200; proposta continua `ACTIVE`, mas `attempts[0].responseType = REJECTED`.

---

## 9. Reject na 5ª tentativa — proposta REJECTED, fila avança

```bash
for p in 3900 3800 3700 3600; do
  curl -s -b "/tmp/movux_s2t4_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT2_ID/proposal/attempts \
    -H "Content-Type: application/json" -d "{\"priceInCents\": $p}" > /dev/null
done
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT2_ID/proposals/$PROPOSAL3_ID/reject -w "\nHTTP %{http_code}\n"

echo "=== proposta deve estar REJECTED ==="
curl -s -b "/tmp/movux_s2t4_carrier1.txt" $BASE/shipments/$SHIPMENT2_ID/proposal | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"

echo "=== fila deve estar EXHAUSTED ==="
curl -s -b "/tmp/movux_s2t4_carrier1.txt" $BASE/shipments/$SHIPMENT2_ID/queue/me | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

---

## 10. Swagger

`http://localhost:3001/api-docs` — 3 endpoints novos sob a tag `Proposals`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Shipment PROPOSALS_RECEIVED | confirmado | ✅ |
| 2 | List proposals | 2 ACTIVE | ✅ |
| 3 | Accept | 200 | ✅ |
| 4 | Shipment CARRIER_SELECTED + finalPrice | confirmado | ✅ |
| 5 | Outra proposta REJECTED (cascata) | confirmado | ✅ |
| 6 | Fila do perdedor EXHAUSTED | confirmado | ✅ |
| 7 | Accept 2x | 409 | ✅ |
| 8 | Reject < 5 | continua ACTIVE | ✅ |
| 9 | Reject na 5ª | REJECTED + fila avança | ✅ (roteiro original tinha só 3 attempts extras → chegava em `currentAttempt=4`, não 5; corrigido para 4 attempts extras) |
| 10 | Swagger | endpoints presentes | ✅ |
