# S0-T3 — Todo

- [x] `middleware.ts` — decodifica JWT (edge-safe, sem verificar assinatura), protege `/customer/*`, `/carrier/*`, `/admin/*` por role, redireciona pro dashboard correto em caso de role mismatch
- [x] `lib/require-me.ts` — helper compartilhado pelos 3 layouts (principal + getCurrentUser, redirect pro `/login` se sessão inválida)
- [x] Layout público `(auth)` — reaproveitado sem alteração estrutural
- [x] Layout customer criado com guard de role (`app/customer/layout.tsx`)
- [x] Layout carrier criado com guard de role (`app/carrier/layout.tsx`)
- [x] Layout admin criado com guard de role (`app/admin/layout.tsx`)
- [x] Login page funcional (consome `/api/auth/login`, seta cookie `session`, redireciona por role)
- [x] Register page funcional (consome `/api/auth/register`, toggle Customer/Carrier, telefone condicional, seta cookie, redireciona por role)
- [x] Logout implementado (limpa cookie `session`, redireciona para `/login`)
- [x] 8 placeholder pages criadas (sem erro 404)
- [x] Navbar com nome do usuário e botão logout em cada layout protegido (sidebar desktop + mobile header)
- [x] QA roteiro completo passando (ver validation.md)
