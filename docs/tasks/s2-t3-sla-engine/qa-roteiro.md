# S2-T3 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S2-T2 concluído, `pnpm dev` ativo

---

## Setup

Reaproveita o fluxo da S2-T2: customer + shipment `OPEN` + carrier `CALLED` que submete proposta.

```bash
BASE="http://localhost:3001/api"

JAR_CUSTOMER="/tmp/movux_s2t3_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S2T3","email":"qa.s2t3@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

MANAIRA=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Manaíra';")
TAMBAU=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM neighborhood WHERE name='Tambaú';")
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")

RESP=$(curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments -H "Content-Type: application/json" -d "{
  \"type\": \"RESIDENTIAL_MOVING\", \"description\": \"Frete SLA\", \"vehicleTypeRequired\": \"VAN\",
  \"scheduledDate\": \"2026-08-10\", \"timeWindow\": \"MORNING\", \"customerSlaHours\": 8,
  \"origin\": { \"street\": \"a\", \"number\": \"1\", \"neighborhoodId\": \"$MANAIRA\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" },
  \"destination\": { \"street\": \"b\", \"number\": \"2\", \"neighborhoodId\": \"$TAMBAU\", \"cityId\": \"$CITY_ID\", \"state\": \"PB\", \"zipCode\": \"58000000\" }
}")
SHIPMENT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['shipment']['id'])")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/publish > /dev/null

for i in 1 2; do
  curl -s -c "/tmp/movux_s2t3_carrier$i.txt" -X POST $BASE/auth/register -H "Content-Type: application/json" \
    -d "{\"fullName\":\"Carrier S2T3 $i\",\"email\":\"qa.s2t3.c$i@carrier.dev\",\"password\":\"Senha@123\",\"role\":\"CARRIER\",\"phone\":\"8399997000$i\"}" > /dev/null
done

curl -s -b "/tmp/movux_s2t3_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join > /dev/null
curl -s -b "/tmp/movux_s2t3_carrier1.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 20000, "carrierSlaHours": 6}' > /dev/null

echo "SHIPMENT_ID=$SHIPMENT_ID"
```

---

## 1. Antes de expirar — GET /proposal mostra ACTIVE

```bash
curl -s -b "/tmp/movux_s2t3_carrier1.txt" $BASE/shipments/$SHIPMENT_ID/proposal | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `ACTIVE`

---

## 2. Forçar expiração via SQL

```bash
docker exec movux-postgres psql -U postgres -d movux -c "
UPDATE proposal SET expires_at = now() - interval '1 hour'
WHERE shipment_id = '$SHIPMENT_ID' AND carrier_id = (SELECT id FROM \"user\" WHERE email='qa.s2t3.c1@carrier.dev');
"
```

---

## 3. Carrier 2 entra na fila — deve ficar CALLED direto (havia 1 CALLED antes, agora deve estar livre por causa do sweep no join)

```bash
curl -s -b "/tmp/movux_s2t3_carrier2.txt" -X POST $BASE/shipments/$SHIPMENT_ID/queue/join -w "\nHTTP %{http_code}\n"
```

**Esperado:** `status: CALLED` (o carrier 1 tinha vaga `ACTIVE`, não `CALLED` — mas o sweep deve rodar aqui de qualquer forma; ver passo 4/5 pra confirmar o efeito real no carrier 1).

---

## 4. GET /proposal do carrier 1 — sweep deve ter marcado EXPIRED

```bash
curl -s -b "/tmp/movux_s2t3_carrier1.txt" $BASE/shipments/$SHIPMENT_ID/proposal | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `EXPIRED`

---

## 5. Queue entry do carrier 1 — deve estar EXHAUSTED

```bash
curl -s -b "/tmp/movux_s2t3_carrier1.txt" $BASE/shipments/$SHIPMENT_ID/queue/me | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `EXHAUSTED`

---

## 6. Sweep idempotente — rodar de novo não quebra

```bash
curl -s -b "/tmp/movux_s2t3_carrier1.txt" -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/$SHIPMENT_ID/proposal
```

**Esperado:** 200, sem erro (já estava `EXPIRED`, sweep não re-processa).

---

## 7. Proposta não vencida não é afetada

```bash
curl -s -b "/tmp/movux_s2t3_carrier2.txt" -X POST $BASE/shipments/$SHIPMENT_ID/proposal \
  -H "Content-Type: application/json" -d '{"priceInCents": 21000, "carrierSlaHours": 6}' > /dev/null
curl -s -b "/tmp/movux_s2t3_carrier2.txt" $BASE/shipments/$SHIPMENT_ID/proposal | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])"
```

**Esperado:** `ACTIVE` (não vencida, sweep não mexe).

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Antes de expirar | ACTIVE | ✅ |
| 2 | Forçar expiração (SQL) | — | ✅ |
| 3 | Carrier 2 join dispara sweep | CALLED | ✅ |
| 4 | Proposta do carrier 1 | EXPIRED | ✅ |
| 5 | Queue do carrier 1 | EXHAUSTED | ✅ |
| 6 | Sweep idempotente | sem erro | ✅ |
| 7 | Proposta não vencida intacta | ACTIVE | ✅ |
