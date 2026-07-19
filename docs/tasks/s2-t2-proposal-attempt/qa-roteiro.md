# S2-T2 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** Sprint 1 + S2-T1 concluídos, `pnpm dev` ativo

---

## Setup

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s2t2_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S2T2","email":"qa.s2t2@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete proposta\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null
echo "SHIPMENT_ID=$SHIPMENT_ID"

# 2 carriers — c1 vira CALLED (entra primeiro), c2 fica pra testar "não-CALLED"
for i in 1 2; do
  curl -s -c "/tmp/movux_s2t2_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier S2T2 $i\",\"email\":\"qa.s2t2.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399998000$i\"}" > /dev/null
done
```

---

## 1. Carrier 1 entra na fila (fica CALLED, único na fila)

```bash
curl -s -b "/tmp/movux_s2t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join -w "\nHTTP %{http_code}\n"
```

---

## 2. Carrier 2 tenta propor sem estar na fila — 409 NOT_CALLED

```bash
curl -s -b "/tmp/movux_s2t2_carrier2.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 20000, "carrierSlaHours": 6}'
```

---

## 3. Carrier 1 (CALLED) submete proposta — 201

```bash
curl -s -b "/tmp/movux_s2t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 20000, "carrierSlaHours": 6, "message": "Posso ir hoje"}' \
  -w "\nHTTP %{http_code}\n"
```

**Esperado:** `agreedSlaHours = ceil((8+6)/2) = 7`, `currentAttempt: 1`, `attempts` com 1 item.

---

## 4. Fila do carrier 1 vira ACTIVE

```bash
curl -s -b "/tmp/movux_s2t2_carrier1.txt" $BASE/shipments/$SHIPMENT_ID/queue/me -w "\nHTTP %{http_code}\n"
```

**Esperado:** `status: ACTIVE`.

---

## 5. Submeter de novo — 409 ALREADY_PROPOSED

```bash
curl -s -b "/tmp/movux_s2t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 19000, "carrierSlaHours": 6}'
```

---

## 6. Contra-oferta (attempt 2)

```bash
curl -s -b "/tmp/movux_s2t2_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal/attempts \
  -H "Content-Type: application/json" -d '{"priceInCents": 19000, "message": "Baixei um pouco"}' \
  -w "\nHTTP %{http_code}\n"
```

**Esperado:** `currentAttempt: 2`, `attempts` com 2 itens.

---

## 7. Esgotar até a 5ª — 6ª deve dar 409

```bash
for p in 18000 17000 16000; do
  curl -s -b "/tmp/movux_s2t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/proposal/attempts \
    -H "Content-Type: application/json" -d "{\"priceInCents\": $p}"
done
echo "=== 6ª tentativa (deve ser 409) ==="
curl -s -b "/tmp/movux_s2t2_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/proposal/attempts \
  -H "Content-Type: application/json" -d '{"priceInCents": 15000}'
```

---

## 8. GET /proposal

```bash
curl -s -b "/tmp/movux_s2t2_carrier1.txt" $BASE/shipments/$SHIPMENT_ID/proposal | python3 -m json.tool
```

---

## 9. Withdraw (usar um 2º shipment pra não interferir no teste de esgotamento acima)

```bash
# Novo shipment + carrier 2 entra e propõe, depois desiste
RESP2=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"DELIVERY\", \"description\": \"frete 2\", \"vehicleTypeRequired\": \"ANY\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 4,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT2_ID=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT2_ID/publish > /dev/null

curl -s -b "/tmp/movux_s2t2_carrier2.txt" -X POST $BASE/shipments/$SHIPMENT2_ID/queue/join > /dev/null
curl -s -b "/tmp/movux_s2t2_carrier2.txt" -X POST $BASE/shipments/$SHIPMENT2_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 4000, "carrierSlaHours": 4}' > /dev/null

curl -s -b "/tmp/movux_s2t2_carrier2.txt" -X POST $BASE/shipments/$SHIPMENT2_ID/proposal/withdraw -w "\nHTTP %{http_code}\n"

echo "=== fila do carrier 2 deve estar WITHDRAWN ==="
curl -s -b "/tmp/movux_s2t2_carrier2.txt" $BASE/shipments/$SHIPMENT2_ID/queue/me -w "\nHTTP %{http_code}\n"
```

---

## 10. Swagger

`http://localhost:3001/api-docs` — tag `Proposals` com os endpoints.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Carrier 1 join | CALLED | ✅ |
| 2 | Propor sem estar na fila | 409 NOT_CALLED | ✅ |
| 3 | Submeter proposta | 201, agreedSlaHours=7 | ✅ |
| 4 | Queue vira ACTIVE | confirmado | ✅ |
| 5 | Submeter de novo | 409 ALREADY_PROPOSED | ✅ |
| 6 | Contra-oferta | currentAttempt=2 | ✅ |
| 7 | 6ª tentativa | 409 TOO_MANY_ATTEMPTS | ✅ (attempts 3,4,5 = 201; 6ª = 409) |
| 8 | GET /proposal | 200, 5 attempts | ✅ |
| 9 | Withdraw | queue WITHDRAWN | ✅ |
| 10 | Swagger | endpoints presentes | ✅ |
