# S0-T2 — Todo

- [ ] Par de chaves RS256 gerado e adicionado ao `.env.local`
- [ ] `lib/jwt.ts` — `signToken` e `verifyToken` implementados
- [ ] `lib/auth.ts` — `hashPassword` e `comparePassword` implementados
- [ ] `middleware.ts` — matcher protegendo `/api/` exceto `/api/auth/*` e `/api-docs`
- [ ] `POST /api/auth/register` — cria user + profile por role
- [ ] `POST /api/auth/login` — retorna JWT
- [ ] `GET /api/auth/me` — retorna usuário autenticado
- [ ] Swagger configurado em `/api-docs`
- [ ] 3 endpoints documentados com schemas OpenAPI
- [ ] Todos os casos de QA passando (ver qa-roteiro.md)
- [ ] Collection Insomnia exportada em `docs/insomnia/s0-auth.json`
