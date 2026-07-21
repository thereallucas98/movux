# Task Brief: Fretes do Customer — Prova de Conceito Visual (Listagem + Detalhe)

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Medium
**Type**: UI Change
**Estimated Effort**: 5-7 hours

---

## Feature Overview

### User Story
Como customer, quero ver meus fretes numa lista visualmente rica (ícone, pílula de status, filtro por status) e abrir o detalhe de um frete específico (dados, endereços, resumo de preço), para acompanhar cada frete sem depender só de texto cru.

### Problem Statement
As telas construídas nos Sprints 8 (`S8-T1`/`S8-T2`/`S8-T3`) funcionam mas estão visualmente "cruas" — puro shadcn sem tratamento de ícone/cor/hierarquia. O usuário levantou um conjunto de referências visuais (`docs/design-references-notes.md`) e decidiu, em chat: (1) navegação continua sidebar lateral fixa ([D-005](../../decisions.md)); (2) o alcance desta rodada é provar o padrão em 1-2 telas antes de generalizar; (3) as telas piloto são a listagem de fretes do customer + uma página de detalhe nova (que ainda não existe — débito registrado desde o `S8-T1`).

### Scope

**In Scope:**
- Reestilizar `/customer/shipments` (lista): cards com ícone circular por tipo de frete, pílula de status (reaproveitando `ShipmentStatusBadge`, com tratamento visual mais rico), painel de filtro por status (bottom sheet/dialog com opção + pílula, no padrão do `Filtro.svg`)
- Criar `/customer/shipments/[shipmentId]` (detalhe) — página nova: card de informações gerais (tipo, descrição, endereços de origem/destino, data/janela agendada), card de resumo de preço (`suggestedPriceInCents` vs `finalPriceInCents`, com tratamento de "preço final substitui o sugerido" quando existir)
- Ajustar `docs/DESIGN-SYSTEM.md` com os novos padrões de componente decorrentes desta rodada (card com selo de ícone, pílula de status em filtro) — documentação do que foi decidido, não um sistema novo construído do zero

**Out of Scope:**
- Qualquer outra tela (carrier, admin, dashboards) — fica pra rodadas seguintes, após validação deste piloto
- Barra de ação flutuante do padrão "Detalhe" (excluir/duplicar/editar/compartilhar) — não há essas ações no domínio de shipment ainda (cancelar frete não é uma feature construída); a página de detalhe desta rodada é somente leitura
- Seção "itens"/"serviços inclusos" do padrão de referência — não tem equivalente limpo no Shipment hoje (`modifiers` está sempre vazio, decisão do `S8-T1` de deixar fora do v1); não forçar uma seção vazia
- Ordenação customizada no filtro (o padrão de referência tem "Ordenação" com 4 opções) — `myShipments`/`listShipmentsForCustomer` não suporta ordenação customizada hoje (sempre `createdAt desc`); fora de escopo mudar isso nesta rodada
- Filtro multi-status simultâneo — `myShipments(status)` aceita 1 valor só; o painel de filtro desta rodada usa visual de pílula por opção mas comportamento de seleção única (ver decisão na Research)

---

## Current State

**Key Files:**
- `apps/web/src/components/features/shipments/shipments-list.tsx` — lista atual, sem filtro, tabela crua (desktop) / cards simples (mobile)
- `apps/web/src/components/features/shipments/shipment-status-badge.tsx` — mapeia 10 status pros 6 variants do `Badge` (`default/secondary/warning/destructive/outline/success`)
- `apps/web/src/server/graphql/queries/shipments.query.ts` — `shipment(id!): ShipmentType` já existe e retorna dados completos (endereços incluídos); `myShipments(status?, cursor?, limit?)` já aceita filtro de status único
- `apps/web/src/server/repositories/shipment.repository.ts` — `findByIdForOwner` já inclui `addresses` e `modifiers`
- `apps/web/src/app/customer/shipments/{page.tsx,new/page.tsx}` — existem; **não existe** `[shipmentId]/page.tsx`
- `docs/design-references-notes.md` — anotações de referência já compiladas (Filtro/Listagem/Detalhe/Edição da fonte "Orçamentos", padrões do Financy e do `Desktop.svg`)

**Current Behavior:**
Lista mostra tipo/descrição/data/status/preço em tabela (desktop) ou cards simples (mobile), sem ícone, sem filtro algum. Não existe rota de detalhe — clicar num frete hoje não leva a lugar nenhum (nenhuma linha/card é clicável).

**Gaps/Issues:**
- `Badge` só tem 6 variantes de cor — a referência usa pílulas com cor por categoria (mais granular). Decisão de Research: reaproveitar os 6 variants existentes (mapeamento já feito em `ShipmentStatusBadge`) ou ampliar a paleta de badge — ver Research.
- Nenhum componente de "card com selo de ícone" existe hoje — precisa ser criado (mesmo que só pra esta tela, não como sistema genérico ainda, per decisão de escopo).
- Nenhum componente de painel de filtro (bottom sheet com opções + pílula) existe — mais próximo é `AdaptiveDialog` + `AdaptiveSelect`, nenhum dos dois no formato do `Filtro.svg`.

---

## Requirements

### Functional Requirements

**FR1: Lista de fretes com ícone e pílula de status**
- **Description**: Cada card/linha da lista ganha um ícone circular (por `type` do frete) e a pílula de status com tratamento visual da referência
- **Trigger**: Renderização de `/customer/shipments`
- **Expected Outcome**: Visual mais rico, mesma informação de hoje
- **Edge Cases**: Lista vazia mantém o `EmptyState` já existente

**FR2: Filtro por status**
- **Description**: Painel (bottom sheet mobile / dialog desktop) com opções de status, cada uma como checkbox+pílula; comportamento de seleção única (mesmo visual de multi-select da referência, mas só 1 fica ativo por vez, refletindo a limitação real do `myShipments(status)`)
- **Trigger**: Botão de filtro ao lado da lista
- **Expected Outcome**: Lista refiltra pelo status escolhido; botão "Limpar" volta pra "todos"
- **Edge Cases**: Nenhum resultado pro status escolhido → `EmptyState` existente

**FR3: Página de detalhe do frete**
- **Description**: Nova rota `/customer/shipments/[shipmentId]`, somente leitura
- **Trigger**: Clique num card/linha da lista
- **Expected Outcome**: Card de informações gerais (tipo, descrição, endereços, data/janela) + card de resumo de preço (sugerido vs final, quando existir)
- **Edge Cases**: `shipmentId` de outro customer ou inexistente → `NOT_FOUND`/`FORBIDDEN` já mapeados pelo `getShipment` use-case existente; renderizar 404/erro amigável

---

## Technical Approach

**Chosen Approach:**
Reaproveitar 100% do backend já pronto (`shipment`/`myShipments` GraphQL, use-cases, repos) — esta rodada é puramente de UI. Componentes novos ficam escopados a `components/features/shipments/` por enquanto (não viram `~/components/ui` genéricos ainda — isso é decisão da próxima rodada, quando o padrão for validado em mais de 1 fluxo).

**Alternatives Considered:**
1. **Generalizar os componentes de card/filtro pro design system já nesta rodada** — descartado em chat (escopo "provar em 1-2 telas primeiro"); revisitar depois que o padrão for aprovado rodando de verdade.

**Rationale:**
Menor risco: valida o padrão visual com o usuário antes de espalhar/generalizar, evitando retrabalho se algo não agradar.

---

## Files to Change

### New Files
- `apps/web/src/app/customer/shipments/[shipmentId]/page.tsx`
- `apps/web/src/components/features/shipments/shipment-type-icon.tsx` — ícone circular por `ShipmentType`
- `apps/web/src/components/features/shipments/shipment-filter-sheet.tsx` — painel de filtro por status
- `apps/web/src/components/features/shipments/shipment-detail-view.tsx` — cards de info + resumo de preço
- `apps/web/src/graphql/hooks/use-shipment.ts` — hook pra query `shipment(id!)` (ainda não tem hook client, só a query no schema)

### Modified Files
- `apps/web/src/components/features/shipments/shipments-list.tsx` — cards com ícone, link pro detalhe, integração do filtro
- `apps/web/src/components/features/shipments/shipment-status-badge.tsx` — ajuste visual se a Research decidir ampliar tratamento de cor
- `docs/DESIGN-SYSTEM.md` — registrar os 2 padrões novos (card com selo de ícone, painel de filtro)

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/customer/shipments` mostra cards com ícone por tipo + pílula de status com o tratamento visual da referência
- [ ] **AC2**: Filtro por status funciona (bottom sheet mobile / dialog desktop), refiltra a lista
- [ ] **AC3**: Clicar num card leva pra `/customer/shipments/[shipmentId]`
- [ ] **AC4**: Página de detalhe mostra informações gerais + resumo de preço, com os dados reais do frete
- [ ] **AC5**: `pnpm lint`/`pnpm typecheck` passam no escopo isolado desta task

### Should Have (P1)
- [ ] **AC6**: Responsivo confirmado em 375px e desktop
- [ ] **AC7**: `docs/DESIGN-SYSTEM.md` documenta os 2 padrões novos pra reuso nas próximas rodadas

---

## Test Strategy

**GraphQL**: `shipment(id!)` já testado no `S8-T1` — sem query/mutation nova nesta task, só um hook client novo (`use-shipment.ts`), testado via QA manual no navegador.

**UI**: renderização com dado real (lista + detalhe), estado vazio, filtro aplicado/limpo, responsivo 375px/desktop, acesso a frete de outro customer (deve dar erro, não vazar dado).

---

## Dependencies

**Blocks:** Rodadas seguintes de redesign visual (carrier, admin, dashboards) — dependem do padrão validado aqui
**Blocked By:** None
**Related Work:** `docs/design-references-notes.md`, [D-005](../../decisions.md)
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Filtro visual sugere multi-seleção mas comportamento é single-select (limitação da API atual) | Média | Baixo | UI deixa claro que selecionar uma opção desmarca a anterior (mesmo padrão de radio, só com o visual de checkbox+pílula da referência) — decisão registrada, não é bug |
| Paleta de badge (6 cores) pode não bastar pro tratamento por categoria da referência | Baixa | Baixo | Decisão de Research: mapear dentro da paleta existente primeiro, só ampliar se ficar visualmente pobre |

---

## Complexity Estimate

**Overall**: Medium
- Backend: None (tudo já existe)
- Frontend: Medium (2 telas + 3 componentes novos + 1 hook)

**Estimated Effort**: 5-7 hours
**Confidence**: Medium

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Escopo de piloto decidido em chat: 1-2 telas antes de generalizar; telas escolhidas = listagem de fretes do customer + nova página de detalhe.

---

## References

- [`docs/design-references-notes.md`](../../design-references-notes.md) — anotações de todas as referências visuais levantadas
- [D-005](../../decisions.md) — navegação sidebar sempre
- `docs/tasks/s8-t1-customer-shipments-ui/` — task original da lista/form de fretes
