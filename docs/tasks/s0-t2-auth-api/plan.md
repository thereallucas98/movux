# S0-T2 — Plan

## Ordem de execução

1. Gerar par de chaves RS256 e adicionar ao `.env.local` (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`)
2. Criar `apps/web/src/lib/jwt.ts` — `signToken(payload)` e `verifyToken(token)`
3. Criar `apps/web/src/lib/auth.ts` — `hashPassword`, `comparePassword` (bcryptjs)
4. Criar middleware `apps/web/src/middleware.ts` — protege rotas `/api/` exceto `/api/auth/`
5. Criar `apps/web/src/app/api/auth/register/route.ts` — `POST`
6. Criar `apps/web/src/app/api/auth/login/route.ts` — `POST`
7. Criar `apps/web/src/app/api/auth/me/route.ts` — `GET` (autenticado)
8. Configurar Swagger (`next-swagger-doc` ou `swagger-jsdoc`) em `/api-docs`
9. Documentar os 3 endpoints com JSDoc/OpenAPI annotations
10. Testar via Insomnia e exportar collection

## Arquivos criados/alterados

```
apps/web/src/
  lib/
    jwt.ts          — novo
    auth.ts         — novo (ou extend existing)
    prisma.ts       — já existe (Turnora base)
  middleware.ts     — ajustar matcher
  app/
    api/
      auth/
        register/route.ts   — novo
        login/route.ts      — novo
        me/route.ts         — novo
      api-docs/
        route.ts            — Swagger UI
docs/
  insomnia/
    s0-auth.json    — exportar após testes
```

## JWT payload

```ts
type JwtPayload = {
  sub: string       // user.id
  email: string
  role: Role        // CUSTOMER | CARRIER | ADMIN
  iat: number
  exp: number
}
```

## Register response

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Nome Completo",
    "role": "CUSTOMER"
  }
}
```
