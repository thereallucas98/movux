# S4-T3 — QA Roteiro

**Ambiente:** Docker local
**Pré-requisito:** S4-T2 concluído

---

## 1. Rodar o seed

```bash
cd apps/web && pnpm db:seed
```

**Esperado:** os 3 seeds rodam sem erro (`geography`, `pricing`, `review-tags`), log final `[seed:review-tags] done { count: 10 }`

---

## 2. Conferir as 10 tags no banco

```bash
docker exec movux-postgres psql -U postgres -d movux -c "SELECT code, label, target_role FROM \"reviewTag\" ORDER BY target_role, code;"
```

**Esperado:** 10 linhas — 5 `CARRIER` (`CAREFUL_WITH_ITEMS`, `PUNCTUAL_CARRIER`, `COMMUNICATIVE`, `CLEAN_VEHICLE`, `PROFESSIONAL`), 5 `CUSTOMER` (`PUNCTUAL_CUSTOMER`, `CLEAR_DESCRIPTION`, `EASY_ACCESS`, `RESPECTFUL`, `ITEMS_READY`)

---

## 3. Idempotência — rodar de novo

```bash
pnpm db:seed
docker exec movux-postgres psql -U postgres -d movux -c "SELECT count(*) FROM \"reviewTag\";"
```

**Esperado:** roda sem erro, `count = 10` (sem duplicatas)

---

## 4. Fluxo de review real (sem tags manuais) — regressão da S4-T1

Reaproveitar o setup de shipment `DELIVERED` (padrão das tasks anteriores) e usar um `tagId` real das 10 recém-criadas:

```bash
CARRIER_TAG_ID=$(docker exec movux-postgres psql -U postgres -d movux -tA -c "SELECT id FROM \"reviewTag\" WHERE code = 'CAREFUL_WITH_ITEMS';")
curl -s -b "$JAR_CUSTOMER" -X POST $BASE/shipments/$SHIPMENT_ID/reviews \
  -H "Content-Type: application/json" -d "{\"rating\": 5, \"tagIds\": [\"$CARRIER_TAG_ID\"]}" -w "\nHTTP %{http_code}\n"
```

**Esperado:** 201 — confirma que o fluxo da S4-T1 funciona com dado real do seed, não só com as linhas manuais da QA anterior

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | `pnpm db:seed` roda sem erro | log com count 10 | ✅ |
| 2 | 10 tags no banco, `targetRole` correto | confirmado (11 linhas no total — 1 residual de QA anterior, ver `validation.md`) | ✅ |
| 3 | Idempotência (rodar 2x) | sem duplicata | ✅ |
| 4 | Review real com tag do seed | 201 | ✅ |
