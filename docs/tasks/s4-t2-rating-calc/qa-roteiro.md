# S4-T2 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S4-T1 concluído, `pnpm dev` ativo

---

## Setup — helper reutilizável (customer + carrier fixos, N fretes até DELIVERED)

```bash
BASE="http://localhost:3001/api"

docker exec movux-postgres psql -U postgres -d movux -c "
INSERT INTO \"reviewTag\" (id, code, label, target_role, is_active)
SELECT gen_random_uuid(), 'PUNCTUAL', 'Pontual', 'CARRIER', true
WHERE NOT EXISTS (SELECT 1 FROM \"reviewTag\" WHERE code = 'PUNCTUAL' AND target_role = 'CARRIER');
"

JAR_CUSTOMER="/tmp/movux_s4t2_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S4T2","email":"qa.s4t2@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

make_delivered_shipment_and_review() {
  local carrier_jar="$1"
  local rating="$2"
  local RESP SHIPMENT_ID PROPOSAL_ID
  RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
    \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete rating\", \"vehicleTypeRequired\": \"VAN\",
    \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
    \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
    \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
  }")
  SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
  curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null
  curl -s -b "$carrier_jar" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
  curl -s -b "$carrier_jar" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
    -H "Content-Type: application/json" -d '{"priceInCents": 20000, "carrierSlaHours": 6}' > /dev/null
  PROPOSAL_ID=$(curl -s -b "$JAR_CUSTOMER" $BASE/shipments/$SHIPMENT_ID/proposals | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
  curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/proposals/$PROPOSAL_ID/accept > /dev/null
  curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
  curl -s -b "$carrier_jar" -X POST $BASE/shipments/$SHIPMENT_ID/safety/confirm > /dev/null
  curl -s -b "$carrier_jar" -X POST $BASE/shipments/$SHIPMENT_ID/collect > /dev/null
  curl -s -b "$carrier_jar" -X POST $BASE/shipments/$SHIPMENT_ID/transit > /dev/null
  curl -s -b "$carrier_jar" -X POST $BASE/shipments/$SHIPMENT_ID/deliver > /dev/null
  curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
    -H "Content-Type: application/json" -d "{\"rating\": $rating}" > /dev/null
}
```

---

## 1. Carrier A — 1 review (rating 5) → avgRating 5.00, isActive true, isFlagged false

```bash
curl -s -c "/tmp/movux_s4t2_carrierA.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier A","email":"qa.s4t2.a@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999992001"}' > /dev/null

make_delivered_shipment_and_review "/tmp/movux_s4t2_carrierA.txt" 5

docker exec movux-postgres psql -U postgres -d movux -c "
SELECT avg_rating, is_active, is_flagged FROM \"carrierProfile\"
WHERE user_id = (SELECT id FROM \"user\" WHERE email = 'qa.s4t2.a@carrier.dev');
"
```

**Esperado:** `avg_rating = 5.00, is_active = t, is_flagged = f`

---

## 2. Carrier B — 2 reviews (4, 3) → avgRating 3.50, isActive true (boundary), isFlagged true

```bash
curl -s -c "/tmp/movux_s4t2_carrierB.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier B","email":"qa.s4t2.b@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999992002"}' > /dev/null

make_delivered_shipment_and_review "/tmp/movux_s4t2_carrierB.txt" 4
make_delivered_shipment_and_review "/tmp/movux_s4t2_carrierB.txt" 3

docker exec movux-postgres psql -U postgres -d movux -c "
SELECT avg_rating, is_active, is_flagged FROM \"carrierProfile\"
WHERE user_id = (SELECT id FROM \"user\" WHERE email = 'qa.s4t2.b@carrier.dev');
"
```

**Esperado:** `avg_rating = 3.50, is_active = t, is_flagged = t`

---

## 3. Carrier C — 2 reviews (2, 3) → avgRating 2.50, isActive false, isFlagged true

```bash
curl -s -c "/tmp/movux_s4t2_carrierC.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier C","email":"qa.s4t2.c@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999992003"}' > /dev/null

make_delivered_shipment_and_review "/tmp/movux_s4t2_carrierC.txt" 2
make_delivered_shipment_and_review "/tmp/movux_s4t2_carrierC.txt" 3

docker exec movux-postgres psql -U postgres -d movux -c "
SELECT avg_rating, is_active, is_flagged FROM \"carrierProfile\"
WHERE user_id = (SELECT id FROM \"user\" WHERE email = 'qa.s4t2.c@carrier.dev');
"
```

**Esperado:** `avg_rating = 2.50, is_active = f, is_flagged = t`

---

## 4. Customer avaliado (pelo Carrier A) — só avgRating muda, sem isActive/isFlagged

```bash
# Reaproveita o shipment do Carrier A (variável $SHIPMENT_ID fica com o valor da última chamada — usar o da 1ª review)
# Pegar o carrier a avaliar o customer no mesmo frete:
curl -s -b "/tmp/movux_s4t2_carrierA.txt" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d '{"rating": 4}' -w "\nHTTP %{http_code}\n"

docker exec movux-postgres psql -U postgres -d movux -c "
SELECT avg_rating FROM \"customerProfile\"
WHERE user_id = (SELECT id FROM \"user\" WHERE email = 'qa.s4t2@cliente.dev');
"
```

**Esperado:** 201; `avg_rating = 4.00` no `customerProfile` (sem colunas `is_active`/`is_flagged` — não existem nessa tabela)

---

## 5. Regressão — comportamento do submit-review (S4-T1) continua intacto

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d '{"rating": 5}'
```

**Esperado:** 409 (já revisou esse frete — comportamento da S4-T1 inalterado)

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Carrier A — 1 review (5) | avgRating 5.00, isActive t, isFlagged f | ✅ |
| 2 | Carrier B — 2 reviews (4,3) | avgRating 3.50, isActive t, isFlagged t | ✅ |
| 3 | Carrier C — 2 reviews (2,3) | avgRating 2.50, isActive f, isFlagged t | ✅ |
| 4 | Customer avaliado | avgRating atualizado, sem isActive/isFlagged | ✅ |
| 5 | Regressão S4-T1 | 409 igual antes | ✅ |
