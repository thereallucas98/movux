# S0-T3 — Validation

**Status:** ✅ Done
**Validated:** 2026-07-19

## QA Results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Sem token → `/login` | redirect | ✅ (307, `redirectTo` preservado) |
| 2 | Register customer | dashboard customer | ✅ |
| 3 | Register carrier (com phone) | dashboard carrier | ✅ |
| 4 | Customer acessa rota carrier | redirect pro dashboard correto | ✅ (middleware) |
| 5 | Login válido | dashboard por role | ✅ (customer, carrier, admin) |
| 6 | Login senha errada | erro na página | ✅ (herdado de S0-T2, sem regressão) |
| 7 | Logout | cookie limpo + `/login` | ✅ |
| 8 | 8 placeholders sem 404 | todos 200 | ✅ |
| — | `/` e `/login` redirecionam se já autenticado | por role | ✅ (após fix, ver Deviations) |
| — | Typecheck do código tocado | sem erros novos | ✅ |

## Deviations from plan.md / brief.md

1. **Cookie `session` (HS256), não `movux_token`** — `plan.md` especificava um cookie separado `movux_token` com set manual em cada route handler. A infraestrutura real (já usada em S0-T2, herdada do Turnora) usa o cookie `session` único via `setAuthCookie`/`clearAuthCookie` em `server/http/cookie.ts`. Segui o padrão real, não o plan.md.
2. **`lib/session.ts` não foi criado do zero** — já existia (`getAccessTokenFromCookie`, `verifyAccessToken`), reaproveitado como está.
3. **Middleware simplificado vs plan.md** — o `plan.md` sugeria um matcher catch-all (`/((?!_next/static|...).*)it`) cobrindo o app inteiro. Implementei matcher só nos prefixos que precisam de gate (`/customer/:path*`, `/carrier/:path*`, `/admin/:path*`) — `/`, `/login`, `/register` são públicos por padrão e cada page.tsx já faz seu próprio guard "redireciona se já autenticado".
4. **Shell de navegação reconstruído do zero, mais simples que o original** — o `Sidebar`/`AppShell`/`BottomTabs` antigos (Turnora) tinham workspace-switcher, sidebar colapsável (framer-motion), notificação com badge e um mobile "more sheet" com overlay — tudo acoplado a `Workspace`/`Notification`, que não existem no novo domínio. Reconstruí uma versão enxuta (sidebar fixa, bottom-tabs direto sem overflow — cada role tem ≤3 itens, cabem todos) já que o brief marca "Design system completo" como fora de escopo.
5. **Apagado o shell antigo inteiro** — `app/(app)/**` (dashboard/schedules/shifts/requests/time-tracking/settings, tudo Workspace/Tenant) e `app/onboarding/**`, confirmado com você antes. Também removidas as páginas de auth por email (`forgot-password`, `reset-password`, `verify-email`) — endpoints já haviam sido removidos em S0-T2.
6. **Bug real encontrado e corrigido: `next.config.js`** tinha uma regra `redirects()` legada do Turnora (`/admin/:path* → /:path*`, "admin é sinônimo do app comum, sem namespace próprio") que colidia diretamente com o novo namespace `/admin/*` do Movux — qualquer redirect do meu próprio código para `/admin/dashboard` era interceptado por essa regra e reescrito para `/dashboard` (que não existe → 404). Removida a regra inteira. Isso não é um desvio de escopo, é um bug de infraestrutura pré-existente que só se manifestava no fluxo ADMIN.
7. **RSC bug corrigido durante o QA**: os componentes de nav inicialmente recebiam `navItems` (array com `icon: LucideIcon`, uma função) como prop de um Server Component (`layout.tsx`) para um Client Component (`AppShell`) — Next.js rejeita passar funções pela fronteira server→client. Corrigido: os layouts passam só `role`/`me`, e os componentes client (`Sidebar`, `BottomTabs`) resolvem os nav items internamente via `NAV_ITEMS_BY_ROLE[role]`.
8. **i18n**: removidas chaves órfãs (`auth.forgot.*`, `auth.reset.*`, `auth.verify.*`) do dicionário `pt.ts`, adicionadas `auth.register.role.*` e `auth.register.phone.*`.

## Ambiente

- Container de dev teve um service worker órfão de uma sessão anterior interceptando navegações no Chrome — desregistrado durante o debug (não é causa raiz do bug do item 6, mas contribuiu para confusão inicial no diagnóstico).
- Servidor precisou de restart completo (`rm -rf .next`) após a mudança em `next.config.js` — mudanças de config não são pegas por HMR.

## Out of scope (confirmed, per brief.md)

- UI real de qualquer feature (só shell + placeholder)
- Dark/light mode toggle
- Design system completo além do que já existia

## Follow-ups

| Item | Ação sugerida | Quando |
|---|---|---|
| `lib/swagger/definitions/me.ts` e outras definitions antigas (Tenants, Workspaces...) | Remover/reescrever conforme cada domínio for migrado | S1+ |
| Badge de notificação no nav (removido nesta versão) | Reintroduzir quando o modelo `NotificationLog` tiver endpoint de contagem | S6 |
