# S1-T4 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S1-T3 concluído, `pnpm dev` ativo. Reaproveita o `SHIPMENT_ID` (já `OPEN`) da QA da S1-T3, ou cria um novo.

---

## Setup

```bash
BASE="http://localhost:3001/api"
```

---

## 1. Sem auth — 401

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/browse
```

---

## 2. Como CUSTOMER — 403

```bash
JAR_CUSTOMER="/tmp/movux_s1t3_cookies.txt"  # da S1-T3
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" $BASE/shipments/browse
```

---

## 3. Como CARRIER — 200, só OPEN, endereço redigido

```bash
JAR_CARRIER="/tmp/movux_s1t4_carrier.txt"
curl -s -c "$JAR_CARRIER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier QA","email":"qa.s1t4@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999990000"}' > /dev/null

curl -s -b "$JAR_CARRIER" $BASE/shipments/browse | python3 -m json.tool
```

**Esperado:** 200, `data` com pelo menos o frete `OPEN` da S1-T3; cada endereço só com `type`, `neighborhoodName`, `cityId`, `state` (sem `street`/`number`/`zipCode`/etc).

---

## 4. Filtro `type`

```bash
curl -s -b "$JAR_CARRIER" "$BASE/shipments/browse?type=DELIVERY" -w "\nHTTP %{http_code}\n"
```

---

## 5. Filtro `cityId`

```bash
CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")
curl -s -b "$JAR_CARRIER" "$BASE/shipments/browse?cityId=$CITY_ID" -w "\nHTTP %{http_code}\n"
```

---

## 6. Paginação

```bash
curl -s -b "$JAR_CARRIER" "$BASE/shipments/browse?limit=1" | python3 -m json.tool
```

**Esperado:** `data` com 1 item, `nextCursor` presente se houver mais.

---

## 7. Frete DRAFT não aparece

```bash
# Criar um frete e NÃO publicar
JAR_CUSTOMER2="/tmp/movux_s1t4_customer2.txt"
curl -s -c "$JAR_CUSTOMER2" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente Draft","email":"draft.s1t4@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
# ... criar shipment (fica em DRAFT, sem publish) — usar payload da S1-T3
# Confirmar que o id dele NÃO aparece em GET /shipments/browse
```

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Sem auth | 401 | ✅ |
| 2 | Como CUSTOMER | 403 | ✅ |
| 3 | Como CARRIER | 200, endereço redigido (sem street/number/zipCode) | ✅ |
| 4 | Filtro type | 200, filtrado (testado vazio E com resultado após publish) | ✅ |
| 5 | Filtro cityId | 200, filtrado | ✅ |
| 6 | Paginação | limit respeitado, nextCursor null quando acabou | ✅ |
| 7 | DRAFT não aparece | confirmado via psql (shipment DRAFT ausente do browse) | ✅ |
| — | Swagger | path `/api/shipments/browse` presente | ✅ |
