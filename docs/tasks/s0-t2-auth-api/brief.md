# S0-T2 — Auth API

**Sprint:** 0 — Foundation
**Status:** pending
**Depends on:** S0-T1 (schema + Docker)

---

## User story

Como customer ou carrier, quero me registrar e fazer login via API REST, receber um JWT e poder acessar rotas protegidas, para que o restante do sistema possa ser construído sobre autenticação real.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Cria conta (customer ou carrier) |
| `POST` | `/api/auth/login` | — | Retorna JWT |
| `GET` | `/api/auth/me` | Bearer | Retorna usuário autenticado |

## Scope

- Next.js Route Handlers em `apps/web/src/app/api/auth/`
- JWT RS256 (private key assina, public key verifica) — padrão Turnora
- Senha hasheada com `bcryptjs` (cost 10)
- Registro cria `user` + `customerProfile` ou `carrierProfile` conforme `role`
- Swagger (swagger-ui-express ou next-swagger-doc) em `/api-docs`
- Exportar collection Insomnia em `docs/insomnia/s0-auth.json`

## Out of scope

- Email verification (S1+)
- OAuth / social login
- Refresh token (MVP usa JWT de longa duração: 7 dias)

## Acceptance criteria

- [ ] `POST /api/auth/register` com `role: CUSTOMER` cria user + customerProfile
- [ ] `POST /api/auth/register` com `role: CARRIER` cria user + carrierProfile
- [ ] `POST /api/auth/register` com email duplicado retorna 409
- [ ] `POST /api/auth/login` com credenciais válidas retorna `{ accessToken, user }`
- [ ] `POST /api/auth/login` com senha errada retorna 401
- [ ] `GET /api/auth/me` com Bearer válido retorna usuário
- [ ] `GET /api/auth/me` sem Bearer retorna 401
- [ ] Swagger exibe os 3 endpoints com schemas de request/response
- [ ] Collection Insomnia exportada e importável

## Complexity

Medium — padrão bem estabelecido (Turnora tem referência); adição de `role`-based profile creation é o diferencial.
