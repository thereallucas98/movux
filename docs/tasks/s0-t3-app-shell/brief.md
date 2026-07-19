# S0-T3 — Next.js App Shell

**Sprint:** 0 — Foundation
**Status:** pending
**Depends on:** S0-T2 (auth API + JWT)

---

## User story

Como usuário autenticado, quero ser redirecionado para a área correta da plataforma conforme meu role (customer ou carrier), com um layout base, navegação e páginas placeholder para cada seção, para que os próximos sprints possam construir sobre uma estrutura de rotas estável.

## Scope

- Middleware de autenticação client-side (verificar JWT no cookie/header)
- Layout base por role (`/customer/` e `/carrier/` e `/admin/`)
- Rotas protegidas com redirect para `/login` se não autenticado
- Páginas placeholder (só título + "em breve") para cada seção
- Login page funcional consumindo `POST /api/auth/login`
- Register page funcional consumindo `POST /api/auth/register`
- Logout (limpar token)

## Rotas

```
/                      → redirect para /customer/dashboard ou /carrier/dashboard por role
/login                 → pública
/register              → pública
/customer/
  dashboard/           → placeholder
  shipments/           → placeholder
  shipments/new/       → placeholder
/carrier/
  dashboard/           → placeholder
  shipments/           → placeholder (browse)
  proposals/           → placeholder
/admin/
  dashboard/           → placeholder
  verifications/       → placeholder
```

## Out of scope

- UI real de nenhuma feature (apenas shell)
- Design system completo (shadcn já existe no Turnora base)
- Dark/light mode toggle (deferido)

## Acceptance criteria

- [ ] `/login` funciona: login via API → salva token → redireciona por role
- [ ] `/register` funciona: criação de conta → redireciona para dashboard
- [ ] Rotas `/customer/*` inacessíveis para carrier e vice-versa
- [ ] Rota protegida sem token → redirect para `/login`
- [ ] Logout limpa o token e redireciona para `/login`
- [ ] Todas as rotas placeholder carregam sem erro 404

## Complexity

Low-Medium — estrutura conhecida (Turnora base); principal trabalho é a organização das rotas por role e o middleware.
