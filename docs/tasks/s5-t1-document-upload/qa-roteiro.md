# S5-T1 — QA Roteiro

**Ambiente:** Docker local (`http://localhost:3001`)
**Pré-requisito:** S4-T3 concluído, `pnpm dev` ativo
**Nota:** Supabase **não está configurado** neste ambiente — o caso 5 (upload válido) espera `502 ATTACHMENT_UPLOAD_FAILED` como resultado **correto**, não como falha do roteiro.

---

## Setup

```bash
BASE="http://localhost:3001/api"

JAR_CARRIER="/tmp/movux_s5t1_carrier.txt"
curl -s -c "$JAR_CARRIER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Carrier S5T1","email":"qa.s5t1@carrier.dev","password":"Senha@123","role":"CARRIER","phone":"83999994001"}' > /dev/null

JAR_CUSTOMER="/tmp/movux_s5t1_customer.txt"
curl -s -c "$JAR_CUSTOMER" -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"fullName":"Cliente S5T1","email":"qa.s5t1@cliente.dev","password":"Senha@123","role":"CUSTOMER"}' > /dev/null

# Arquivo de teste pequeno (PNG 1x1 mínimo válido) e um "arquivo grande" > 10MB
printf '\x89PNG\r\n\x1a\n' > /tmp/movux_s5t1_small.png
dd if=/dev/zero of=/tmp/movux_s5t1_big.png bs=1M count=11 2>/dev/null
```

---

## 1. GET /me/documents antes de qualquer upload

```bash
curl -s -b "$JAR_CARRIER" $BASE/me/documents
```

**Esperado:** `[]`

---

## 2. type inválido (CNPJ, fora do escopo de carrier autônomo)

```bash
curl -s -b "$JAR_CARRIER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/me/documents \
  -F "type=CNPJ" -F "file=@/tmp/movux_s5t1_small.png;type=image/png"
```

**Esperado:** 400

---

## 3. Arquivo maior que 10MB

```bash
curl -s -b "$JAR_CARRIER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/me/documents \
  -F "type=CPF" -F "file=@/tmp/movux_s5t1_big.png;type=image/png"
```

**Esperado:** 400 `ATTACHMENT_INVALID`

---

## 4. MIME não permitido

```bash
echo "not an image" > /tmp/movux_s5t1_bad.txt
curl -s -b "$JAR_CARRIER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/me/documents \
  -F "type=CPF" -F "file=@/tmp/movux_s5t1_bad.txt;type=text/plain"
```

**Esperado:** 400 `ATTACHMENT_INVALID`

---

## 5. Upload válido — Supabase não configurado, falha esperada

```bash
curl -s -b "$JAR_CARRIER" -X POST $BASE/me/documents \
  -F "type=CPF" -F "file=@/tmp/movux_s5t1_small.png;type=image/png" -w "\nHTTP %{http_code}\n"
```

**Esperado:** 502 `ATTACHMENT_UPLOAD_FAILED` — comportamento correto sem credenciais Supabase; confirma que a validação e o parsing de multipart chegaram até a chamada de storage

---

## 6. Não-CARRIER tenta enviar

```bash
curl -s -b "$JAR_CUSTOMER" -o /dev/null -w "HTTP %{http_code}\n" -X POST $BASE/me/documents \
  -F "type=CPF" -F "file=@/tmp/movux_s5t1_small.png;type=image/png"
```

**Esperado:** 403

---

## 7. GET /me/documents continua vazio (upload do caso 5 falhou, nada foi persistido)

```bash
curl -s -b "$JAR_CARRIER" $BASE/me/documents
```

**Esperado:** `[]`

---

## 8. Swagger

`http://localhost:3001/api/api-docs` — 2 endpoints novos sob a tag `Carrier Documents`.

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | GET antes de upload | `[]` | ✅ |
| 2 | type inválido (CNPJ) | 400 | ✅ |
| 3 | Arquivo > 10MB | 400 | ✅ |
| 4 | MIME não permitido | 400 | ✅ |
| 5 | Upload válido (Supabase não configurado) | 502 `ATTACHMENT_UPLOAD_FAILED` (esperado) | ✅ |
| 6 | Não-CARRIER | 403 | ✅ |
| 7 | GET após falha de upload | `[]` | ✅ |
| 8 | Swagger | endpoints presentes | ✅ |
