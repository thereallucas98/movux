# S0-T2 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Register customer | 201 + user | ✅ |
| 2 | Register carrier (com phone) | 201 + user | ✅ |
| 3 | Email duplicado | 409 | ✅ |
| 3b | Register carrier sem phone | 400 (extra, não estava no roteiro original) | ✅ |
| 4 | Login válido | 200 + cookie `session` | ✅ |
| 5 | Login senha errada | 401 | ✅ (senha de teste ajustada p/ ≥8 chars, ver desvio abaixo) |
| 6 | Me autenticado (cookie) | 200 + user | ✅ |
| 7 | Me sem token | 401 | ✅ |
| 8 | Swagger | 4 endpoints no spec (`register`, `login`, `logout`, `me`) | ✅ |
| — | DB check | `user` + `customerProfile`/`carrierProfile` corretos | ✅ (`phone` NULL pra customer, populado pra carrier) |
| — | Typecheck do código tocado | sem erros novos | ✅ (erros restantes são em código antigo fora de escopo) |

## Deviations from plan.md / brief.md

1. **JWT: HS256 + cookie `session`, não Bearer/RS256.** O `plan.md` original descrevia um par de chaves RS256 e auth via header `Bearer`. A infraestrutura **já existente** no repo (herdada do Turnora, confirmada em `CLAUDE.md` — "httpOnly cookie `session`") usa HS256 simétrico com `JWT_SECRET` (já configurado em `.env`) e cookie httpOnly. Segui o padrão real do projeto em vez do plan.md — mesma lógica da correção de `@@map` em S0-T1.
2. **bcrypt cost 12, não 10** — o `lib/auth.ts` existente já usava cost 12; mantido.
3. **`phone` obrigatório no payload para `role: CARRIER`** — o `DATABASE-DESIGN.md` define `carrierProfile.phone` como `NOT NULL`, mas os exemplos do `brief.md`/`qa-roteiro.md` não incluíam `phone` no payload de registro. Adicionei `phone` como campo opcional no `RegisterSchema`, obrigatório via `.refine()` apenas quando `role = CARRIER` (400 se ausente). `customerProfile.phone` continua nullable, sem exigir o campo pra customer.
4. **Removidos 4 endpoints/use-cases incompatíveis com o novo schema**: `forgot-password`, `reset-password`, `verify-email`, `resend-verification`. Dependiam de campos que não existem mais em `user` (`resetToken`, `resetTokenExpires`, `emailVerified` boolean — o novo schema só tem `emailVerifiedAt` nullable). Fora do escopo do brief ("Email verification (S1+)"); serão reconstruídos quando o fluxo de verificação entrar em pauta.
5. **`lib/auth.ts` enxugado** — removidas `generateToken`, `signEmailVerifyToken`, `verifyEmailVerifyToken` (infra órfã após a remoção do item 4; reintroduzir junto com a feature real).
6. **`server/http/cookie.ts` enxugado** — removidos `setWorkspaceCookie`/`clearWorkspaceCookie`/`WORKSPACE_COOKIE` (domínio `Workspace` não existe mais desde S0-T1). Callers antigos (`app/(app)/**`, `api/workspace/select`) já estavam quebrados desde S0-T1 e continuam fora de escopo.
7. **`user.repository.ts` reescrito do zero**, bem mais enxuto que o original (interface antiga tinha 12 métodos ligados a perfil estendido/reset/verificação que não existem mais). Novo: `findByEmail`, `findByEmailForLogin`, `findById`, `createCustomer`, `createCarrier` — os dois últimos usam nested write do Prisma (`user.create` + `customerProfile`/`carrierProfile` em uma query atômica).
8. **`packages/auth`** — `roleSchema` agora `CUSTOMER | CARRIER | ADMIN` (era `SUPER_ADMIN | ADMIN | USER`); `PUBLIC_REGISTRABLE_ROLES = [CUSTOMER, CARRIER]`; `defineAbilityFor` simplificado (ADMIN = manage all; CUSTOMER/CARRIER = read User).
9. **Roteiro de QA corrigido** — senha de teste do caso 5 (login errado) trocada de `"errada"` (6 chars) pra `"errada123"` (9 chars), porque `LoginSchema` exige `min(8)` e a senha curta caía em 400 (Zod) antes de alcançar a checagem de credenciais.

## Out of scope (confirmed, per brief.md)

- Email verification
- OAuth / social login
- Refresh token

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| Password reset / email verification | Reconstruir do zero com o novo `emailVerifiedAt` + tabela de token a definir | S1+ |
| Middleware `matcher` ainda lista rotas antigas (`/schedules`, `/shifts`...) | Reescrever junto com o app shell novo | S0-T3 |
| Resto de `server/use-cases/` e `server/repositories/` (tenants, workspaces, shifts...) | Remover/reescrever incrementalmente por sprint | S1+ (conforme cada domínio entrar em pauta) |
