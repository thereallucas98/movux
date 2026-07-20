# S3-T1 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | GET /safety antes de confirmar | `{customer:null,carrier:null}` | ✅ |
| 2 | Customer confirma | 201 | ✅ |
| 3 | Carrier perdedor (não selecionado) confirma | 404 | ✅ |
| 4 | Carrier selecionado confirma | 201 | ✅ |
| 5 | GET /safety com os dois | ambos preenchidos | ✅ |
| 6 | Customer confirma 2x | 409 `ALREADY_CONFIRMED` | ✅ |
| 7 | Confirm fora de `CARRIER_SELECTED` | 409 `INVALID_STATE_TRANSITION` | ✅ |
| 8 | `ADMIN` tenta confirmar | 403 `FORBIDDEN` | ✅ |
| 9 | `ipAddress` persistido | confirmado (`::1` em dev local) | ✅ |
| 10 | Swagger — 2 endpoints sob `Safety` | presentes | ✅ |

Todos os 10 casos do `qa-roteiro.md` passaram. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, todos pré-existentes no código legado do Turnora (mesma contagem da baseline da S2-T4). Zero erros novos em arquivos de `safety`/`shipment`/`proposal`.

## Desvios encontrados durante execução

### 1. Remoção dos campos mortos `safetyTermCustomerAt`/`safetyTermCarrierAt`

Conforme decisão registrada em `research.md` (opção Ideal), os dois campos foram removidos de `Shipment` via migration (`20260720080911_remove_dead_safety_term_fields`) e das duas linhas correspondentes em `docs/DATABASE-DESIGN.md §6.1`. Confirmado por grep antes da remoção: zero usos em `src/` fora do client Prisma gerado.

### 2. `/auth/register` não aceita `role: ADMIN` (achado de QA, não bug de aplicação)

O roteiro original do caso 8 tentava registrar um usuário `ADMIN` direto via `POST /auth/register`, que valida `role` contra `z.enum(['CUSTOMER','CARRIER'])` e rejeita com 400 — contas `ADMIN` não são autoatendidas por design. Isso fazia o `JAR_ADMIN` ficar sem sessão válida, retornando 401 em vez do 403 esperado (o gate de role da rota nunca era exercitado). Corrigido no roteiro: registra como `CUSTOMER` e promove via `UPDATE "user" SET role = 'ADMIN'` direto no banco — com isso o 403 do gate `principal.role !== 'CUSTOMER' && principal.role !== 'CARRIER'` foi confirmado corretamente.

### 3. Path do Swagger JSON

O roteiro original assumia `/api-docs/swagger.json`; o spec real é servido em `/api/api-docs` (`app/api/api-docs/route.ts`). Corrigido no roteiro; os 2 paths novos (`/api/shipments/{shipmentId}/safety/confirm`, `/api/shipments/{shipmentId}/safety`) foram confirmados presentes.

## Acceptance criteria (brief.md)

- [x] `POST /safety/confirm` cria o `SafetyCheckIn` do papel correto com `confirmedAt` e `ipAddress`
- [x] `POST /safety/confirm` chamado por quem não é dono nem carrier selecionado → 404
- [x] `POST /safety/confirm` com shipment fora de `CARRIER_SELECTED` → 409
- [x] `POST /safety/confirm` duas vezes pro mesmo papel → 409 `ALREADY_CONFIRMED`
- [x] `GET /safety` retorna as confirmações existentes, com `null` pra quem ainda não confirmou
- [x] Swagger documenta os 2 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

Nenhum.
