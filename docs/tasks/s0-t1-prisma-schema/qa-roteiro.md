# S0-T1 — QA Roteiro

**Ambiente:** Docker local
**Pré-requisito:** `docker compose up -d` rodando

---

## 1. Docker

```bash
docker compose up -d
docker ps  # deve exibir container postgres na porta 5432
```

**Esperado:** container `movux-postgres` (ou similar) com status `Up`.

---

## 2. Migration

```bash
cd apps/web
pnpm prisma migrate dev --name init
```

**Esperado:**
```
Applying migration `0001_init`
Your database is now in sync with your schema.
```

Sem warnings de drift, sem erros de FK.

---

## 3. Prisma Studio

```bash
pnpm prisma studio
```

Abrir `http://localhost:5555` e verificar:

| Tabela esperada | Visível? |
|---|---|
| user | ○ |
| customer_profile | ○ |
| carrier_profile | ○ |
| company | ○ |
| company_membership | ○ |
| vehicle | ○ |
| carrier_document | ○ |
| plan | ○ |
| subscription | ○ |
| subscription_payment | ○ |
| state | ○ |
| city | ○ |
| neighborhood | ○ |
| neighborhood_cluster | ○ |
| cluster_neighborhood | ○ |
| pricing_template | ○ |
| pricing_modifier | ○ |
| carrier_pricing_config | ○ |
| pricing_signal | ○ |
| pricing_snapshot | ○ |
| shipment | ○ |
| shipment_address | ○ |
| shipment_modifier | ○ |
| shipment_photo | ○ |
| proposal_queue_entry | ○ |
| proposal | ○ |
| proposal_attempt | ○ |
| chat_room | ○ |
| chat_message | ○ |
| safety_check_in | ○ |
| shipment_event | ○ |
| delivery_confirmation | ○ |
| review | ○ |
| review_tag | ○ |
| review_tag_selection | ○ |
| notification_log | ○ |

**Total esperado: 36 tabelas.**

---

## 4. Prisma Generate

```bash
pnpm prisma generate
```

**Esperado:** `Generated Prisma Client` sem erros de tipo TypeScript.

---

## 5. Unique constraints (psql)

```bash
docker exec -it <container> psql -U postgres -d movux-db -c "\d user"
```

Verificar que `email` tem constraint UNIQUE com `WHERE deleted_at IS NULL` (partial index).

---

## Result table

| Check | Status |
|---|---|
| Docker postgres up | ○ |
| Migration passa sem erros | ○ |
| 36 tabelas visíveis no Studio | ○ |
| Prisma generate sem erros de tipo | ○ |
| Partial unique index em user.email | ○ |
