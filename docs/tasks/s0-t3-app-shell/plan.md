# S0-T3 — Plan

## Ordem de execução

1. Ajustar `middleware.ts` — verificar JWT em cookie `movux_token`; redirecionar `/` para dashboard por role
2. Criar `lib/session.ts` — `getSession()` (server-side, lê cookie) e `setSession()` / `clearSession()` (client-side)
3. Criar layouts:
   - `app/(auth)/layout.tsx` — layout público (login/register)
   - `app/(customer)/layout.tsx` — sidebar customer + guard
   - `app/(carrier)/layout.tsx` — sidebar carrier + guard
   - `app/(admin)/layout.tsx` — sidebar admin + guard
4. Criar login page: `app/(auth)/login/page.tsx`
5. Criar register page: `app/(auth)/register/page.tsx`
6. Criar placeholder pages (1 arquivo cada):
   - `app/(customer)/customer/dashboard/page.tsx`
   - `app/(customer)/customer/shipments/page.tsx`
   - `app/(customer)/customer/shipments/new/page.tsx`
   - `app/(carrier)/carrier/dashboard/page.tsx`
   - `app/(carrier)/carrier/shipments/page.tsx`
   - `app/(carrier)/carrier/proposals/page.tsx`
   - `app/(admin)/admin/dashboard/page.tsx`
   - `app/(admin)/admin/verifications/page.tsx`
7. Criar componente `Navbar` por layout (nome do usuário + logout)

## Token storage

**Cookie HTTP-only** (`movux_token`) — mais seguro que localStorage; acessível no middleware server-side.

Set via Route Handler no login:
```ts
response.cookies.set('movux_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7  // 7 dias
})
```

## Middleware matcher

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```
