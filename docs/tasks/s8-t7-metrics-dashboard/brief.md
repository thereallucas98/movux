# Task Brief: Dashboard de Métricas — Customer, Carrier e Admin

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Medium
**Type**: UI Change + Backend (novo)
**Estimated Effort**: 5-7 hours

---

## Feature Overview

### User Story
Como usuário de qualquer role (customer, carrier, admin), quero ver números-chave sobre minha atividade logo no dashboard (fretes ativos, total, avaliação, etc.), pra ter uma visão rápida da minha situação sem precisar entrar em cada lista — hoje o dashboard é só uma prévia de lista, sem nenhum dado agregado.

### Problem Statement
Os 3 dashboards atuais (`/customer/dashboard`, `/carrier/dashboard`, `/admin/dashboard`) mostram só um preview de lista (últimos fretes, fretes abertos + propostas, documentos pendentes) — nenhum número agregado, "muito seco" comparado a outras aplicações do mesmo padrão (Pronai, Turnora) que têm cards de KPI. Decisão de escopo tomada em chat: cards de KPI (números grandes + ícone + cor de categoria), sem gráfico — não há biblioteca de gráfico instalada no projeto hoje, e cards resolvem o problema ("muito seco") sem adicionar dependência nova. Os 3 dashboards entram na mesma rodada (diferente do redesign de fretes do S8-T4/S8-T5/S8-T6, aqui cada dashboard é só uma seção de cards nova acima da lista existente — baixo risco de retrabalho entre roles).

### Scope

**In Scope:**
- Componente `MetricCard` reutilizável (número grande + label + ícone circular colorido + descrição curta), reaproveitando o padrão visual de ícone-por-categoria já validado no S8-T4/S8-T5/S8-T6
- 4 métricas por role (12 no total), todas de leitura (sem mutation nova):
  - **Customer**: Fretes ativos · Total de fretes · Total gasto · Sua avaliação
  - **Carrier**: Fretes ativos · Total de fretes · Total ganho · Sua avaliação
  - **Admin**: Documentos pendentes · Carriers sinalizados · Carriers verificados · Carriers ativos
- Backend novo: 3 use-cases (1 por role) + 3 queries GraphQL (`customerDashboardMetrics`, `carrierDashboardMetrics`, `adminDashboardMetrics`) + métodos de agregação novos nos repositories relevantes (`shipmentRepo`, `proposalRepo`, `carrierDocumentRepo`, `carrierProfileRepo`) — contagens/somas via Prisma `count`/`aggregate`, sem lib nova
- Grid de `MetricCard`s no topo dos 3 dashboards, acima do preview de lista já existente

**Out of Scope:**
- Gráficos (linha/barra) — decisão explícita de escopo, cards só
- Filtro de período (ex.: "este mês" vs "total") — todas as métricas são "total até agora"; filtro de período fica pra rodada futura se pedido
- Métricas em `/customer/shipments`, `/carrier/shipments`, `/admin/verifications` (páginas de lista completas) — só nos dashboards
- Qualquer mutation nova — todas as 12 métricas são leitura agregada de dados já existentes

---

## Current State

**Key Files:**
- `apps/web/src/app/customer/dashboard/page.tsx` — título + botão + `<ShipmentsList limit={5}/>`, sem métricas
- `apps/web/src/app/carrier/dashboard/page.tsx` — título + botão + `<BrowseShipmentsList limit={3}/>` + `<MyProposalsList limit={3}/>`, sem métricas
- `apps/web/src/app/admin/dashboard/page.tsx` — título + botão + `<DocumentList limit={3}/>`, sem métricas
- `CustomerProfile.avgRating` / `CustomerProfile.totalShipments` (`prisma/schema.prisma:327-332`) — **já pré-computados**, atualizados por `CustomerProfileRepository.updateRating()`
- `CarrierProfile.avgRating` / `CarrierProfile.totalShipments` / `isFlagged` / `isActive` (`prisma/schema.prisma:342-356`) — idem, atualizados por `CarrierProfileRepository.updateRating()`
- `Shipment` (`prisma/schema.prisma:611+`) — **não tem `carrierId` direto**; o carrier vencedor só é rastreável via `Proposal.status = 'ACCEPTED'` + `Proposal.carrierId`, exige join pra métricas de carrier (fretes ativos, total ganho)
- Nenhuma query GraphQL de agregação existe hoje pro domínio de fretes/documentos — as únicas queries de contagem do schema (`candidateCountForShift`, `myUnreadNotificationCount`) são de domínio workforce, não reaproveitáveis
- Nenhuma lib de gráfico instalada (`recharts`/`victory`/`nivo`/etc. — confirmado ausente do `package.json`)

**Current Behavior:**
Os 3 dashboards renderizam só preview de lista, sem nenhum número agregado.

**Gaps/Issues:**
- Nenhum repository tem método de agregação pro domínio de fretes/documentos/carriers (só `findMany`/`findFirst` hoje) — precisa ser criado em 3-4 repositories.
- Métrica de carrier ("fretes ativos", "total ganho") precisa de filtro por relação (`Shipment` cujo `Proposal` aceito pertence ao carrier) — Prisma suporta isso via filtro de relação dentro de `aggregate`/`count` (`where: { proposals: { some: { carrierId, status: 'ACCEPTED' } } }`), sem SQL raw.

---

## Requirements

### Functional Requirements

**FR1: Cards de métricas no dashboard do customer**
- **Description**: 4 `MetricCard`s no topo de `/customer/dashboard`: Fretes ativos, Total de fretes, Total gasto, Sua avaliação
- **Trigger**: Renderização do dashboard
- **Expected Outcome**: Números reais do customer logado
- **Edge Cases**: Customer sem fretes → todos os números em 0 (não `EmptyState`, cards sempre renderizam); `avgRating` nulo (sem review ainda) → mostrar "—" em vez de 0

**FR2: Cards de métricas no dashboard do carrier**
- **Description**: 4 `MetricCard`s no topo de `/carrier/dashboard`: Fretes ativos, Total de fretes, Total ganho, Sua avaliação
- **Trigger**: Renderização do dashboard
- **Expected Outcome**: Números reais do carrier logado
- **Edge Cases**: Mesmo tratamento de zero/nulo do FR1

**FR3: Cards de métricas no dashboard do admin**
- **Description**: 4 `MetricCard`s no topo de `/admin/dashboard`: Documentos pendentes, Carriers sinalizados, Carriers verificados, Carriers ativos
- **Trigger**: Renderização do dashboard
- **Expected Outcome**: Números agregados da plataforma inteira (não escopado a um usuário)
- **Edge Cases**: Nenhum — todos os números podem ser 0 legitimamente (ex.: nenhum carrier sinalizado)

---

## Technical Approach

**Chosen Approach:**
3 use-cases novos (`getCustomerDashboardMetrics`, `getCarrierDashboardMetrics`, `getAdminDashboardMetrics`), cada um combinando: (a) leitura direta de campo pré-computado (`avgRating`/`totalShipments` do profile) quando existir, (b) `count`/`aggregate` Prisma novo quando não existir. 3 queries GraphQL novas (uma por role, cada uma já checando o role do `ctx.principal` — mesmo padrão de `browseShipments`/`shipmentForCarrier`). Componente `MetricCard` novo em `components/ui/` (reutilizável entre os 3 roles, não uma feature específica) — reaproveita a paleta `{cor}-light`/`{cor}-dark` já validada.

**Alternatives Considered:**
1. **Uma query GraphQL genérica `dashboardMetrics` que retorna campos diferentes por role** — descartado; 3 queries tipadas separadas são mais simples de consumir no client (sem união de tipos opcionais) e mais fácil de testar isoladamente, mesmo padrão de "uma query por necessidade de tela" já usado no resto do projeto.
2. **Gráficos em vez de cards** — descartado em chat (ver Problem Statement).

**Rationale:**
Backend pequeno e isolado (métodos novos de agregação, sem migration, sem mutation), frontend reaproveita 100% do padrão visual já validado (ícone circular por categoria).

---

## Files to Change

### New Files
- `apps/web/src/components/ui/metric-card.tsx`
- `apps/web/src/server/use-cases/dashboard/get-customer-dashboard-metrics.use-case.ts`
- `apps/web/src/server/use-cases/dashboard/get-carrier-dashboard-metrics.use-case.ts`
- `apps/web/src/server/use-cases/dashboard/get-admin-dashboard-metrics.use-case.ts`
- `apps/web/src/server/graphql/queries/dashboard-metrics.query.ts`
- `apps/web/src/graphql/hooks/use-customer-dashboard-metrics.ts`
- `apps/web/src/graphql/hooks/use-carrier-dashboard-metrics.ts`
- `apps/web/src/graphql/hooks/use-admin-dashboard-metrics.ts`

### Modified Files
- `apps/web/src/server/repositories/shipment.repository.ts` — métodos de agregação (contagem/soma) pro customer e pro carrier
- `apps/web/src/server/repositories/carrier-document.repository.ts` — contagem por status
- `apps/web/src/server/repositories/carrier-profile.repository.ts` — contagem por `isFlagged`/`isActive`/`verificationStatus`
- `apps/web/src/app/customer/dashboard/page.tsx` / `carrier/dashboard/page.tsx` / `admin/dashboard/page.tsx` — grid de `MetricCard`

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/customer/dashboard` mostra 4 cards com números reais (fretes ativos, total, gasto, avaliação)
- [ ] **AC2**: `/carrier/dashboard` mostra 4 cards com números reais (fretes ativos, total, ganho, avaliação)
- [ ] **AC3**: `/admin/dashboard` mostra 4 cards com números agregados da plataforma (docs pendentes, carriers sinalizados/verificados/ativos)
- [ ] **AC4**: Métricas de dinheiro/avaliação formatadas com os helpers já existentes (`formatPriceInCents`); avaliação nula mostra "—", não "0" ou "NaN"
- [ ] **AC5**: `pnpm lint`/`pnpm typecheck` passam no escopo isolado desta task

### Should Have (P1)
- [ ] **AC6**: Responsivo confirmado em 375px (grid 2 colunas) e desktop (grid 4 colunas)
- [ ] **AC7**: Cada query de métrica isolada por role (customer só vê a própria, carrier só vê a própria, admin vê agregado da plataforma) — sem vazamento entre contas

---

## Test Strategy

**GraphQL**: testar as 3 queries com dado real — customer/carrier com fretes e sem fretes (zero-state), admin com e sem documentos pendentes/carriers sinalizados.

**UI**: renderização com dado real nos 3 dashboards, zero-state (conta nova sem histórico), responsivo 375px/desktop, formatação de preço e "—" pra avaliação nula.

---

## Dependencies

**Blocks:** Nenhum
**Blocked By:** Nenhum
**Related Work:** `docs/tasks/s8-t4-shipment-visual-refresh/` (origem do padrão de ícone/cor reaproveitado)
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Filtro de relação no `aggregate`/`count` do carrier (via `Proposal.status='ACCEPTED'`) ficar lento em produção com muitos fretes | Baixa (volume atual é de teste/dev) | Baixo | Já existe `@@index([carrierId, status])` em `Proposal` (`prisma/schema.prisma:753`) — index cobre o filtro |
| Avaliação nula (customer/carrier sem review ainda) quebrar formatação | Média | Baixo | Tratamento explícito no `MetricCard`/use-case: `null` → "—" |

---

## Complexity Estimate

**Overall**: Medium
- Backend: Medium (3 use-cases + 3 queries + ~5 métodos de agregação novos em 3 repositories, sem migration)
- Frontend: Small (1 componente novo + 3 dashboards modificados)

**Estimated Effort**: 5-7 hours
**Confidence**: Média (agregação por relação no Prisma é um padrão novo neste projeto, ainda que suportado)

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Escopo decidido em chat: cards de KPI (sem gráfico, sem lib nova); os 3 roles na mesma rodada (diferente do redesign de fretes, aqui o risco de retrabalho entre roles é baixo).

---

## References

- `docs/tasks/s8-t4-shipment-visual-refresh/` — origem do padrão de ícone/cor reaproveitado no `MetricCard`
- [docs/DESIGN-SYSTEM.md](../../DESIGN-SYSTEM.md) — paleta de categoria já documentada
