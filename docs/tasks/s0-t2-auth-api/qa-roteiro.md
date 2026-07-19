# S0-T2 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3000`)
**Pré-requisito:** S0-T1 concluído, banco rodando, `pnpm dev` ativo

---

## Setup

```bash
BASE="http://localhost:3000/api"
```

---

## 1. Register — Customer (happy path)

```bash
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "João Cliente",
    "email": "joao@cliente.dev",
    "password": "Senha@123",
    "role": "CUSTOMER"
  }' | python3 -m json.tool
```

**Esperado:** HTTP 201 · `{ accessToken, user: { role: "CUSTOMER" } }`
**DB check:** Prisma Studio → tabela `user` tem 1 row; `customer_profile` tem 1 row com `userId` correto.

---

## 2. Register — Carrier (happy path)

```bash
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Maria Carrier",
    "email": "maria@carrier.dev",
    "password": "Senha@123",
    "role": "CARRIER"
  }' | python3 -m json.tool
```

**Esperado:** HTTP 201 · `user.role = "CARRIER"`
**DB check:** `carrier_profile` tem 1 row; `verificationStatus = "PENDING"`.

---

## 3. Register — Email duplicado (conflict)

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "fullName": "Dup", "email": "joao@cliente.dev", "password": "Senha@123", "role": "CUSTOMER" }'
```

**Esperado:** HTTP 409

---

## 4. Login — Credenciais válidas

```bash
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "joao@cliente.dev", "password": "Senha@123" }' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

echo "TOKEN: $TOKEN"
```

**Esperado:** token JWT (3 partes separadas por `.`)

---

## 5. Login — Senha errada (unauthorized)

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "joao@cliente.dev", "password": "errada" }'
```

**Esperado:** HTTP 401

---

## 6. Me — Autenticado

```bash
curl -s -X GET $BASE/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Esperado:** HTTP 200 · `{ id, email, fullName, role: "CUSTOMER" }`

---

## 7. Me — Sem token (unauthorized)

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X GET $BASE/auth/me
```

**Esperado:** HTTP 401

---

## 8. Swagger

Abrir `http://localhost:3000/api-docs` no browser.

**Esperado:** Swagger UI exibindo 3 endpoints (`/auth/register`, `/auth/login`, `/auth/me`) com schemas de request e response.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Register customer | 201 + token | ○ |
| 2 | Register carrier | 201 + carrier profile | ○ |
| 3 | Email duplicado | 409 | ○ |
| 4 | Login válido | 200 + JWT | ○ |
| 5 | Login senha errada | 401 | ○ |
| 6 | Me autenticado | 200 + user | ○ |
| 7 | Me sem token | 401 | ○ |
| 8 | Swagger acessível | UI carrega | ○ |
