# S0-T2 — Todo

- [x] Reutilizado `JWT_SECRET` (HS256, já existente) — não foi gerado par RS256 (ver `validation.md`, desvio do plan.md)
- [x] `apps/web/src/lib/auth.ts` — `hashPassword`, `verifyPassword`, `signAccessToken` (já existiam, adaptados)
- [x] `apps/web/src/lib/get-principal.ts` / `get-server-principal.ts` — adaptados (`isActive` → `deletedAt`, campo que não existe mais em `user`)
- [x] `apps/web/src/app/api/auth/register/route.ts` — `POST`
- [x] `apps/web/src/app/api/auth/login/route.ts` — `POST`
- [x] `apps/web/src/app/api/auth/me/route.ts` — `GET` (novo)
- [x] Swagger em `/api-docs` — 4 endpoints (`register`, `login`, `logout`, `me`)
- [x] Documentados com JSDoc/OpenAPI annotations (`lib/swagger/definitions/auth.ts`)
- [x] Testado via curl e exportado `docs/insomnia/s0-auth.json`
