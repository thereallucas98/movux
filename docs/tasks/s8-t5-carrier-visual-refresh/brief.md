# Task Brief: Fretes do Carrier — Generalização do Redesign Visual (Browse + Propostas + Detalhe)

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Medium-High
**Type**: UI Change + Backend (novo)
**Estimated Effort**: 6-9 hours

---

## Feature Overview

### User Story
Como carrier, quero ver os fretes abertos e minhas propostas numa lista visualmente rica (ícone por tipo, igual ao que o customer já tem) e abrir o detalhe de um frete específico pra decidir/agir sem depender só do card resumido, para ter a mesma clareza visual e profundidade de informação que o customer já tem desde o S8-T4.

### Problem Statement
O S8-T4 provou o padrão visual (ícone circular por tipo, cards mais ricos, página de detalhe) só no fluxo do customer. Esta rodada generaliza esse padrão pro fluxo do carrier, que foi escolhido como próximo passo (D-005 já cobre navegação; escopo desta rodada decidido em chat: carrier antes de admin, porque reaproveita o mesmo `ShipmentType`/ícone já validado).

### Scope

**In Scope:**
- Reestilizar `/carrier/shipments` (`BrowseShipmentsList`/`BrowseShipmentCard`): ícone circular por tipo (reaproveita `ShipmentTypeIcon` do S8-T4)
- Reestilizar `/carrier/proposals` (`MyProposalsList`): mesmo tratamento de ícone
- Dashboard do carrier (`/carrier/dashboard`) herda o estilo automaticamente — reaproveita os mesmos componentes de lista com `limit` (mesmo efeito colateral observado no dashboard do customer no S8-T4, sem trabalho extra)
- Cards de `/carrier/shipments` e `/carrier/proposals` viram clicáveis (card inteiro navega pro detalhe; o botão de ação (`ShipmentActionButton`) continua funcionando dentro do card sem disparar a navegação)
- Nova página `/carrier/shipments/[shipmentId]` — detalhe do frete com informações gerais (mesmo formato do detalhe do customer) **+ a mesma ação (`ShipmentActionButton`) já usada no card**, pra o carrier poder agir direto da página de detalhe
- **Backend novo** (não existe hoje — decisão de Research, ver abaixo): use-case + repo method + query GraphQL + hook client pra buscar 1 frete pro carrier, liberado se o frete está `OPEN` OU se o carrier logado tem fila/proposta pra esse `shipmentId` (reaproveita `proposalQueueRepo.findByShipmentAndCarrier`/`proposalRepo.findByShipmentAndCarrier`, já existentes)

**Out of Scope:**
- Fluxo do customer sobre a proposta (aceitar/recusar) — inalterado
- UI de transit-status (coletar/em trânsito/entregar) pro carrier — não existe hoje, gap pré-existente, não introduzido nem fechado por esta task
- Admin (verificação de documentos) — próxima rodada, domínio diferente (documentos, não fretes)
- Qualquer mudança em `ShipmentActionButton`/`resolveCardAction`/dialogs de proposta — reaproveitados como estão, sem alteração de lógica de negócio
- Novo componente de filtro por status pro carrier — `browseShipments` já tem filtro (cidade/tipo) via `AdaptiveSelect`, fora de escopo trocar esse padrão

---

## Current State

**Key Files:**
- `apps/web/src/app/carrier/{shipments,proposals,dashboard}/page.tsx` — existem; **não existe** `carrier/shipments/[shipmentId]/page.tsx`
- `apps/web/src/components/features/shipments/browse-shipments-list.tsx` + `browse-shipment-card.tsx` — grid de cards (`BrowseShipmentCard`), sem ícone, card não é clicável, ação (`ShipmentActionButton`) no `CardFooter`
- `apps/web/src/components/features/proposals/my-proposals-list.tsx` — cards com `ShipmentActionButton`, sem ícone, não clicável
- `apps/web/src/components/features/proposals/shipment-action-button.tsx` + `resolve-card-action.ts` — única fonte de verdade da ação disponível por combinação de `queueStatus`×`proposalStatus`; já cobre todos os estados (inclusive "sem ação, só label") — reaproveitável sem alteração
- `apps/web/src/server/use-cases/shipments/get-shipment.use-case.ts` — `getShipment` é escopado a `customerProfileRepo.findByUserId(userId)`; carrier nunca tem `customerProfile` → sempre `NOT_FOUND`. **Não reaproveitável pro carrier.**
- `apps/web/src/server/use-cases/shipments/browse-open-shipments.use-case.ts` + `shipmentRepo.listOpenForBrowse` — só lista, sem busca por id único
- `apps/web/src/server/repositories/proposal-queue.repository.ts` (`findByShipmentAndCarrier`) e `proposal.repository.ts` (`findByShipmentAndCarrier`) — já existem, usados por `myQueueEntry`/`myProposal`, passam `ctx.principal.userId` direto como `carrierId` (carrier não tem profile intermediário nesses repos, diferente do customer)
- `apps/web/src/server/graphql/queries/browse-shipments.query.ts` — `browseShipments`, exige `role === 'CARRIER'`
- `apps/web/src/components/features/shipments/shipment-type-icon.tsx` — já existe do S8-T4, reaproveitável direto (mesmo `ShipmentType` enum)

**Current Behavior:**
`/carrier/shipments` mostra grid de cards sem ícone; `/carrier/proposals` idem; nenhum card é clicável — toda interação acontece via `ShipmentActionButton` (dialogs inline). Não existe rota de detalhe pro carrier.

**Gaps/Issues:**
- Backend não tem como o carrier buscar 1 frete específico fora do fluxo de browse/fila — precisa de use-case novo (ver Research).
- Card clicável + botão de ação dentro do card exige `stopPropagation` no clique do botão/dialog trigger, senão abrir o dialog de proposta também dispara a navegação pro detalhe.

---

## Requirements

### Functional Requirements

**FR1: Ícone por tipo em `/carrier/shipments` e `/carrier/proposals`**
- **Description**: Cada card ganha o mesmo ícone circular por `ShipmentType` já usado no customer (`ShipmentTypeIcon`)
- **Trigger**: Renderização das duas listas
- **Expected Outcome**: Visual consistente com o padrão já aprovado no S8-T4
- **Edge Cases**: Estados vazios mantêm os `EmptyState` já existentes

**FR2: Cards clicáveis → página de detalhe**
- **Description**: Clicar em qualquer parte do card (fora do botão de ação) navega pra `/carrier/shipments/[shipmentId]`
- **Trigger**: Clique no card em `/carrier/shipments` ou `/carrier/proposals`
- **Expected Outcome**: Navega pro detalhe; clicar no botão de ação dentro do card continua abrindo o dialog correspondente, sem navegar
- **Edge Cases**: Nenhum

**FR3: Página de detalhe do frete (carrier)**
- **Description**: Nova rota `/carrier/shipments/[shipmentId]` — informações gerais do frete (mesmo formato do detalhe do customer) + `ShipmentActionButton` pra agir direto ali
- **Trigger**: Clique num card
- **Expected Outcome**: Mostra dados reais do frete; ação disponível reflete o estado real (fila/proposta) do carrier logado pra esse frete
- **Edge Cases**: Frete não `OPEN` e sem fila/proposta do carrier logado → erro amigável (não vazar dado de frete de outro fluxo); `shipmentId` inexistente → mesmo tratamento

---

## Technical Approach

**Chosen Approach (decisão de Research em chat):**
Novo use-case `getShipmentForCarrier` — libera o frete se `status === 'OPEN'` OU se existe fila/proposta do carrier logado pra esse `shipmentId` (reaproveita `proposalQueueRepo.findByShipmentAndCarrier` e `proposalRepo.findByShipmentAndCarrier`, já existentes e já usados por `myQueueEntry`/`myProposal`). Precisa de 1 método novo no `ShipmentRepository` (buscar shipment por id, com `addresses`, sem scoping de owner — os métodos existentes são todos `ForOwner`/`ForProposal` com selects diferentes). Nova query GraphQL (nome a definir no Plan) + hook client novo, mesmo padrão do `useShipment`/`shipment(id!)` do S8-T4.

**Alternatives Considered:**
1. **Só liberar fretes `OPEN`** (Fast) — descartado; deixaria `/carrier/proposals` sem link pro detalhe (proposta pode estar em qualquer status), quebrando a paridade com o customer.
2. **Reescrever `getShipment` genérico pra qualquer role** (Ideal) — descartado nesta rodada; mexeria em código do S8-T1 já validado, risco maior sem necessidade imediata.

**Rationale:**
"Good": cobre os dois fluxos do carrier (browse + propostas) reaproveitando 100% das checagens de permissão que já existem (`findByShipmentAndCarrier` em 2 repos), sem tocar em código do customer já validado.

---

## Files to Change

### New Files
- `apps/web/src/app/carrier/shipments/[shipmentId]/page.tsx`
- `apps/web/src/graphql/hooks/use-shipment-for-carrier.ts` (nome definitivo da query decidido no Plan)
- `apps/web/src/server/use-cases/shipments/get-shipment-for-carrier.use-case.ts`

### Modified Files
- `apps/web/src/server/repositories/shipment.repository.ts` — novo método (buscar por id, com addresses, sem scoping)
- `apps/web/src/server/graphql/queries/shipments.query.ts` (ou novo arquivo) — nova query GraphQL
- `apps/web/src/components/features/shipments/browse-shipment-card.tsx` — ícone + card clicável
- `apps/web/src/components/features/proposals/my-proposals-list.tsx` — ícone + card clicável
- `apps/web/src/components/features/proposals/shipment-action-button.tsx` (possível — só se precisar de `stopPropagation` no wrapper, a confirmar no Plan)

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/carrier/shipments` mostra ícone por tipo em cada card
- [ ] **AC2**: `/carrier/proposals` mostra ícone por tipo em cada card
- [ ] **AC3**: Clicar num card (fora do botão de ação) leva pra `/carrier/shipments/[shipmentId]`; clicar no botão de ação não navega
- [ ] **AC4**: Página de detalhe mostra dados reais do frete + `ShipmentActionButton` funcional, refletindo o estado real de fila/proposta do carrier
- [ ] **AC5**: Acesso a frete não-`OPEN` sem fila/proposta do carrier logado → erro amigável, sem vazar dado
- [ ] **AC6**: `pnpm lint`/`pnpm typecheck` passam no escopo isolado desta task

### Should Have (P1)
- [ ] **AC7**: Responsivo confirmado em 375px e desktop
- [ ] **AC8**: Dashboard do carrier (`/carrier/dashboard`) reflete o novo visual automaticamente, sem trabalho extra

---

## Test Strategy

**GraphQL**: nova query `getShipmentForCarrier`/resolver — testar `OPEN` (qualquer carrier), fila/proposta existente (dono), sem envolvimento (outro carrier, deve dar erro), `shipmentId` inexistente.

**UI**: renderização com dado real (browse + propostas + detalhe), clique em card vs. botão de ação (não deve navegar), responsivo 375px/desktop, acesso negado não vaza dado.

---

## Dependencies

**Blocks:** Rodada seguinte do redesign visual (admin)
**Blocked By:** S8-T4 (padrão visual validado)
**Related Work:** `docs/design-references-notes.md`, [D-005](../../decisions.md), `docs/tasks/s8-t4-shipment-visual-refresh/`
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Card clicável + botão de ação dentro do card causam navegação indesejada ao interagir com o botão | Média | Médio | `stopPropagation` no clique do botão/trigger do dialog, testado explicitamente na QA |
| Novo use-case de permissão (`OPEN` OU envolvimento do carrier) com brecha (ex.: carrier vê frete de outro carrier que já está em fila) | Baixa | Alto (vazamento de dado) | Reaproveita exatamente a mesma checagem (`findByShipmentAndCarrier`) já usada e validada por `myQueueEntry`/`myProposal`; testar explicitamente com 2 contas carrier distintas na QA |

---

## Complexity Estimate

**Overall**: Medium-High
- Backend: Small-Medium (1 use-case novo, 1 método de repo novo, 1 query GraphQL nova — mas reaproveita permissão já existente)
- Frontend: Medium (2 listas reestilizadas + 1 página nova + cuidado com stopPropagation)

**Estimated Effort**: 6-9 hours
**Confidence**: Medium (backend novo introduz mais incerteza que o S8-T4, que era 100% UI)

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Escopo decidido em chat: carrier antes de admin; lista + detalhe (não só lista); visibilidade do detalhe = `OPEN` + fretes com envolvimento do carrier logado (fila ou proposta), não só `OPEN`.

---

## References

- [`docs/design-references-notes.md`](../../design-references-notes.md) — anotações de referências visuais (mesmo padrão do S8-T4)
- [D-005](../../decisions.md) — navegação sidebar sempre
- `docs/tasks/s8-t4-shipment-visual-refresh/` — piloto que definiu o padrão visual sendo generalizado aqui
- `docs/tasks/s8-t2-carrier-shipments-ui/` — task original do fluxo de browse/propostas do carrier
