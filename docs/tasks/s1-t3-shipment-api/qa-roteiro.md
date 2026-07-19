# S1-T3 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S1-T1 + S1-T2 seed rodado, `pnpm dev` ativo

---

## Setup

```bash
BASE="http://localhost:3001/api"
JAR="/tmp/movux_s1t3_cookies.txt"
rm -f "$JAR"

# Registrar e logar como customer
curl -s -c "$JAR" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente QA","email":"qa.s1t3@cliente.dev","password":"Senha@123","role":"CUSTOMER"}'

# IDs de bairro pra teste (via psql — mesmo cluster: 2 bairros de Orla Norte; clusters diferentes: 1 de Orla Norte + 1 de Zona Norte)
docker exec movux-postgres psql -U postgres -d movux -tA -c "
SELECT n.name, n.id FROM neighborhood n
JOIN \"clusterNeighborhood\" cn ON cn.neighborhood_id = n.id
JOIN \"neighborhoodCluster\" nc ON nc.id = cn.cluster_id
WHERE nc.slug IN ('orla-norte','zona-norte')
ORDER BY nc.slug, n.name;
"
# Anotar: MANAIRA_ID, TAMBAU_ID (orla-norte, mesmo cluster) e um bairro de zona-norte (CROSS_ID)

CITY_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM city LIMIT 1;")
```

---

## 1. Create — mesmo cluster (tier 0)

```bash
curl -s -b "$JAR" -X POST $BASE/shipments -H "Content-Type: application/json" -d '{
  "type": "RESIDENTIAL_MOVING",
  "description": "Mudança de apartamento",
  "vehicleTypeRequired": "VAN",
  "scheduledDate": "2026-08-01",
  "timeWindow": "MORNING",
  "customerSlaHours": 8,
  "origin": { "street": "Av. Rui Carneiro", "number": "500", "neighborhoodId": "<MANAIRA_ID>", "cityId": "<CITY_ID>", "state": "PB", "zipCode": "58037000", "floor": 3, "hasElevator": true },
  "destination": { "street": "Av. Almirante Tamandaré", "number": "100", "neighborhoodId": "<TAMBAU_ID>", "cityId": "<CITY_ID>", "state": "PB", "zipCode": "58039000" },
  "modifiers": [{ "modifierCode": "HELPER", "quantity": 2 }]
}' -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201, `status: DRAFT`, `suggestedPriceInCents = 15000 + 2×4000 = 23000`. Guardar `id` como `SHIPMENT_ID`.

---

## 2. Create — sem neighborhoodId (400)

```bash
curl -s -b "$JAR" -X POST $BASE/shipments -H "Content-Type: application/json" -d '{
  "type": "DELIVERY", "description": "x", "vehicleTypeRequired": "ANY",
  "scheduledDate": "2026-08-01", "timeWindow": "MORNING", "customerSlaHours": 4,
  "origin": { "street": "x", "number": "1", "cityId": "<CITY_ID>", "state": "PB", "zipCode": "58000000" },
  "destination": { "street": "y", "number": "2", "cityId": "<CITY_ID>", "state": "PB", "zipCode": "58000000" }
}' -o /dev/null -w "HTTP %{http_code}\n"
```

**Esperado:** 400

---

## 3. Publish — DRAFT → OPEN

```bash
curl -s -b "$JAR" -X POST $BASE/shipments/$SHIPMENT_ID/publish -w "\nHTTP %{http_code}\n"
```

**Esperado:** 200, `status: OPEN`

---

## 4. Publish de novo (já OPEN) — 409

```bash
curl -s -b "$JAR" -X POST $BASE/shipments/$SHIPMENT_ID/publish -o /dev/null -w "HTTP %{http_code}\n"
```

**Esperado:** 409

---

## 5. Get — dono

```bash
curl -s -b "$JAR" $BASE/shipments/$SHIPMENT_ID -w "\nHTTP %{http_code}\n"
```

**Esperado:** 200, com `addresses` (2) e `modifiers` (1)

---

## 6. Get — outro customer (404)

```bash
JAR2="/tmp/movux_s1t3_cookies2.txt"
curl -s -c "$JAR2" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Outro","email":"outro.s1t3@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null
curl -s -b "$JAR2" $BASE/shipments/$SHIPMENT_ID -o /dev/null -w "HTTP %{http_code}\n"
```

**Esperado:** 404

---

## 7. List — só os fretes do customer autenticado

```bash
curl -s -b "$JAR" $BASE/shipments -w "\nHTTP %{http_code}\n"
```

**Esperado:** 200, array com 1 item (o criado no passo 1)

---

## 8. Swagger

Abrir `http://localhost:3001/api-docs` — verificar 4 endpoints sob a tag `Shipments`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Create mesmo cluster | 201 + preço correto | ✅ 23000 = 15000 + 2×4000 |
| 2 | Create sem neighborhoodId | 400 | ✅ |
| 3 | Publish DRAFT→OPEN | 200 | ✅ |
| 4 | Publish 2x | 409 | ✅ |
| 5 | Get dono | 200 | ✅ |
| 6 | Get outro customer | 404 | ✅ |
| 7 | List | 200, só os próprios | ✅ |
| 8 | Swagger | 3 paths (create/list, get, publish) | ✅ |
| extra | Create cross-cluster (tier 1), DELIVERY | preço = 4000 | ✅ |
