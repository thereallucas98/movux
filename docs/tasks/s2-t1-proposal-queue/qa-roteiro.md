# S2-T1 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** Sprint 1 concluído, `pnpm dev` ativo

---

## Setup

```bash
BASE="http://localhost:3001/api"

# Customer + shipment OPEN (reaproveita o padrão da S1-T3)
JAR_CUSTOMER="/tmp/movux_s2t1_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S2","email":"qa.s2t1@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete fila\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null
echo "SHIPMENT_ID=$SHIPMENT_ID"

# 4 carriers
for i in 1 2 3 4; do
  curl -s -c "/tmp/movux_s2t1_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier $i\",\"email\":\"qa.s2t1.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399999000$i\"}" > /dev/null
done
```

---

## 1-3. Carriers 1, 2, 3 entram — todos `CALLED` (grupo completo)

```bash
for i in 1 2 3; do
  echo "=== Carrier $i join ==="
  curl -s -b "/tmp/movux_s2t1_carrier$i.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join -w "\nHTTP %{http_code}\n"
done
```

**Esperado:** os 3 entram com `status: CALLED` (grupo de 3 completo).

---

## 4. Carrier 4 entra — fica `WAITING`

```bash
curl -s -b "/tmp/movux_s2t1_carrier4.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join -w "\nHTTP %{http_code}\n"
```

**Esperado:** `status: WAITING`, `position: 4`.

---

## 5. Join duplicado (carrier 1 de novo) — 409

```bash
curl -s -b "/tmp/movux_s2t1_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join
```

---

## 6. Carrier 1 (CALLED) desiste — libera vaga pro carrier 4

```bash
curl -s -b "/tmp/movux_s2t1_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/withdraw -w "\nHTTP %{http_code}\n"

echo "=== carrier 4 deve estar CALLED agora ==="
curl -s -b "/tmp/movux_s2t1_carrier4.txt" $BASE/shipments/$SHIPMENT_ID/queue/me -w "\nHTTP %{http_code}\n"
```

**Esperado:** carrier 1 → `WITHDRAWN`; carrier 4 → `CALLED`.

---

## 7. Withdraw de quem já é WITHDRAWN — 409

```bash
curl -s -b "/tmp/movux_s2t1_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/queue/withdraw
```

---

## 8. `GET /queue/me` de quem nunca entrou — 404

```bash
curl -s -c "/tmp/movux_s2t1_carrier5.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier 5","email":"qa.s2t1.c5@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999990005"}' > /dev/null
curl -s -b "/tmp/movux_s2t1_carrier5.txt" -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/$SHIPMENT_ID/queue/me
```

---

## 9. Join em shipment não-OPEN — 409

```bash
# Criar um novo shipment e NÃO publicar (fica DRAFT)
RESP2=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"DELIVERY\", \"description\": \"draft\", \"vehicleTypeRequired\": \"ANY\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 4,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
DRAFT_ID=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "/tmp/movux_s2t1_carrier5.txt" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$DRAFT_ID/queue/join
```

---

## 10. Swagger

`http://localhost:3001/api-docs` — tag `Proposal Queue` com 3 endpoints.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1-3 | 3 primeiros carriers | `CALLED` | ✅ |
| 4 | 4º carrier | `WAITING`, position 4 | ✅ |
| 5 | Join duplicado | 409 | ✅ |
| 6 | Withdraw libera vaga | carrier 4 WAITING→CALLED automaticamente | ✅ |
| 7 | Withdraw 2x | 409 | ✅ |
| 8 | Get/me sem ter entrado | 404 | ✅ |
| 9 | Join em shipment não-OPEN (DRAFT) | 409 | ✅ |
| 10 | Swagger | 3 endpoints | ✅ |
