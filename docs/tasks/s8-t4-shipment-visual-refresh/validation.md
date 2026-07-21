# S8-T4 — Validation

**Status:** ✅ concluído — com ressalvas de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `/customer/shipments` (desktop) | Tabela com ícone circular por tipo, pílula de status, botão de filtro | ✅ |
| 2 | `/customer/shipments` (mobile 375px) | Cards com ícone+badge, bottom tab bar, sem scroll horizontal | ✅ |
| 3 | Filtro por status — abrir painel | Desktop: dialog centralizado. Mobile: drawer (bottom sheet) | ✅ |
| 4 | Filtro — reabrir com valor já aplicado | Checkbox do status ativo vem marcado (`pending` sincronizado com `value`) | ✅ |
| 5 | Filtro — aplicar status com resultado | Lista refiltra, "Limpar filtro" aparece no toolbar | ✅ |
| 6 | Filtro — aplicar status sem resultado | `EmptyState` existente ("Nenhum frete ainda") | ✅ (ver Follow-ups — mensagem genérica, não distingue "sem fretes" de "filtro sem match") |
| 7 | Filtro — "Limpar filtro" (rodapé do painel e toolbar) | Reseta pra `undefined`, lista volta a mostrar todos | ✅ |
| 8 | Clique num card/linha (desktop e mobile) | Navega pra `/customer/shipments/[shipmentId]` | ✅ |
| 9 | Página de detalhe — frete com dados reais | Header (tipo+badge), card "Informações gerais" (descrição, origem, destino, data+janela), card "Resumo de preço" | ✅ |
| 10 | Página de detalhe — sem `finalPriceInCents` | Mostra só "Preço estimado" (branch `suggestedPriceInCents`) | ✅ testado |
| 11 | Página de detalhe — `shipmentId` inexistente | `EmptyState` "Frete não encontrado", sem vazar dado | ✅ (bug real encontrado e corrigido — ver Desvios #1) |
| 12 | Responsivo 375px | Cards, drawer de filtro, bottom tabs, sem scroll horizontal | ✅ |
| 13 | Responsivo desktop (1280px) | Sidebar, tabela, dialog de filtro | ✅ |
| 14 | Console do navegador | Sem erros do app (1 hydration warning é falso-positivo de extensão do Chrome — `cz-shortcut-listen`) | ✅ |
| 15 | Nav — highlight em rota filha (`/customer/shipments/[id]`) | "Meus fretes" permanece destacado | ✅ (bug real encontrado e corrigido — ver Desvios #2) |
| 16 | Nav — sobreposição de prefixo (`/customer/shipments/new`) | Só "Novo frete" destaca, não os dois ao mesmo tempo | ✅ (mesmo fix do #15) |

## Typecheck / Lint / Build

- **Lint isolado** (`src/components/features/shipments/`, `src/graphql/hooks/use-shipment.ts`, `src/components/features/nav/`, `src/app/customer/shipments/**`): limpo (0 erros/warnings).
- **`pnpm typecheck` isolado**: sem erros nos arquivos acima.
- **`pnpm lint` / `pnpm build` (projeto inteiro)**: **não passam** — mesmo débito pré-existente da migração Turnora→Movux já registrado no `validation.md` do S8-T1 (`notifications/`, `shift-timelines/`, `tenant-memberships/`, `workspace-memberships/`, `api/workspace/select/route.ts`). Confirmado via `git log`/`git status` que nenhum desses arquivos foi tocado nesta task.

## Desvios encontrados durante execução

1. **Vazamento de erro técnico no toast global (bug real, encontrado na QA)**: `QueryProvider` (`onError` do `QueryCache`) sempre dispara `toast.error` com `error.message` bruto. Pra erros do `graphql-request`, essa mensagem é o JSON completo da resposta (query GraphQL inteira + variables + status). Isso nunca tinha aparecido porque `useShipment` era o primeiro hook a de fato exercitar um erro de query (`NOT_FOUND`) em produção de UI. Corrigido com `meta: { silent: true }` em `use-shipment.ts`, já que `ShipmentDetailView` já tem seu próprio `EmptyState` amigável pro erro. Fix pontual, não estendido a outras queries (fora do escopo do piloto) — ver Follow-ups.
2. **Bug de destaque de navegação (bug real, pedido de validação extra do usuário antes da aprovação final)**: `sidebar.tsx`/`bottom-tabs.tsx` calculavam `isActive` com `pathname.startsWith(item.href)`. Como `/customer/shipments` é prefixo de `/customer/shipments/new`, os dois itens ficavam destacados juntos ao acessar "Novo frete" — bug pré-existente, não introduzido por esta task, mas só ficou evidente porque o piloto criou o primeiro par de rotas pai/filha reais do menu (`/customer/shipments` → `/customer/shipments/[shipmentId]`). Corrigido com `getActiveNavHref()` (longest-prefix match) em `nav-items.ts`, compartilhado entre sidebar (desktop) e bottom tabs (mobile). Validado nas duas resoluções, papel `CUSTOMER` (único com rotas de prefixo sobreposto hoje).

Nenhum desvio de arquitetura da Research original (componentes escopados a `features/shipments/`, paleta de cor por categoria reaproveitada de `globals.css`, filtro single-select com visual de multi-select).

## Acceptance criteria (brief.md)

- [x] AC1: `/customer/shipments` mostra cards com ícone por tipo + pílula de status
- [x] AC2: Filtro por status funciona (bottom sheet mobile / dialog desktop), refiltra a lista
- [x] AC3: Clicar num card leva pra `/customer/shipments/[shipmentId]`
- [x] AC4: Página de detalhe mostra informações gerais + resumo de preço, com dados reais
- [x] AC5: `pnpm lint`/`pnpm typecheck` passam no escopo isolado desta task
- [x] AC6: Responsivo confirmado em 375px e desktop
- [x] AC7: `docs/DESIGN-SYSTEM.md` documenta os 2 padrões novos (seção 9)

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build` quebrado | Mesmo débito pré-existente já registrado no S8-T1 (`workspace/select/route.ts` + domínio Turnora não migrado). Continua bloqueando o build de produção do app inteiro. |
| Toast global de erro genérico | `QueryProvider` dumpa `error.message` bruto pra qualquer query sem `meta.silent` — só foi silenciado pontualmente em `use-shipment.ts`. Vale revisar globalmente (ex.: `error.message` amigável por padrão, com detalhe técnico só em `console.error` de dev) numa task de infra própria. |
| `EmptyState` do filtro sem match | Mostra a mesma mensagem genérica de "nenhum frete ainda" tanto quando o customer não tem fretes quanto quando o filtro aplicado não bate com nada — mensagem poderia diferenciar os dois casos. Não bloqueante, não fazia parte do brief. |
| Outras telas do redesign (carrier, admin, dashboards) | Fora de escopo por decisão explícita do usuário ("provar em 1-2 telas primeiro") — ficam pra rodadas seguintes, condicionadas à aprovação visual deste piloto. |
