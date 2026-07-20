# Task Brief: Carrier — Fretes e Propostas (UI)

**Created**: 2026-07-20
**Status**: Approved
**Complexity**: Complex
**Type**: New Feature
**Estimated Effort**: 6-9 hours

---

## Feature Overview

### User Story
Como carrier, quero navegar pelos fretes abertos, entrar na fila de interesse de um frete, enviar minha proposta de preço (e renegociá-la se necessário), e acompanhar o status de tudo isso, para conseguir fechar fretes na plataforma.

### Problem Statement
A API REST do fluxo carrier (browse, fila, proposta) está pronta desde os Sprints 1 e 2, mas não tem UI nem exposição via GraphQL — hoje o carrier não tem como usar nenhuma dessas features pelo app. As rotas `/carrier/{dashboard,shipments,proposals}` existem só como placeholder ("Em breve.").

### Scope

**In Scope:**
- GraphQL: `browseShipments` (query, filtro `cityId`/`type`, paginado) — espelha `S1-T4`
- GraphQL: `joinProposalQueue` / `withdrawFromQueue` (mutations) + `myQueueEntry` (query) — espelha `S2-T1`
- GraphQL: `submitProposal` / `addProposalAttempt` (contra-oferta) / `withdrawProposal` (mutations) + `myProposal` (query) — espelha `S2-T2`
- UI `/carrier/shipments` — lista de fretes `OPEN` com filtro cidade/tipo, ação "Entrar na fila" no card
- UI `/carrier/proposals` — lista dos fretes em que o carrier está na fila ou tem proposta ativa, com badge de status (`WAITING`/`CALLED`/`ACTIVE`/`EXHAUSTED`/`WITHDRAWN`), formulário de proposta (quando `CALLED`), contra-oferta e desistência (quando `ACTIVE`)
- UI `/carrier/dashboard` — atalhos + resumo (fretes disponíveis recentes, propostas ativas)

**Out of Scope:**
- Accept/reject de proposta pelo customer (`S2-T4`) — é tela do customer, não do carrier
- Endereço completo pós-seleção — API já entrega redigido (só bairro/cidade/estado); nada muda aqui
- Gate de verificação do carrier (`S5`) bloqueando propor — a API não impõe essa regra ainda, então a UI também não impõe
- Notificação em tempo real / polling agressivo da fila — refetch manual/on-focus do React Query, mesmo padrão do S8-T1
- Countdown ao vivo de `expiresAt` — mostra data/hora estática, sem timer

---

## Current State

**Key Files:**
- `apps/web/src/app/api/shipments/browse/route.ts` — REST browse (pronto, `S1-T4`)
- `apps/web/src/app/api/shipments/[shipmentId]/queue/{join,withdraw,me}/route.ts` — REST fila (pronto, `S2-T1`)
- `apps/web/src/app/api/shipments/[shipmentId]/proposal/{,attempts,withdraw}/route.ts` — REST proposta (pronto, `S2-T2`)
- `apps/web/src/server/use-cases/shipments/browse-open-shipments.use-case.ts` — pronto, reaproveitável
- `apps/web/src/server/use-cases/shipments/queue/{join-proposal-queue,withdraw-proposal-queue,get-my-queue-entry}.use-case.ts` — prontos, reaproveitáveis
- `apps/web/src/server/use-cases/shipments/proposals/{submit-proposal,add-proposal-attempt,withdraw-proposal,get-my-proposal}.use-case.ts` — prontos, reaproveitáveis
- `apps/web/src/server/repositories/{shipment,proposal-queue,proposal}.repository.ts` — prontos
- `apps/web/src/server/graphql/queries/shipments.query.ts` — só expõe `myShipments`/`shipment` (visão customer); nada de browse/fila/proposta ainda
- `apps/web/src/app/carrier/{dashboard,shipments,proposals}/page.tsx` — placeholders, sem lógica

**Current Behavior:**
API funciona ponta a ponta via Insomnia/Swagger (validado nos Sprints 1-2). GraphQL só cobre o domínio customer (`S8-T1`). Nenhuma tela do carrier renderiza dado real.

**Gaps/Issues:**
- Faltam enums Pothos para `QueueEntryStatus`, `ProposalStatus`, `ResponseType`
- Faltam GraphQL types para item de browse (endereço redigido), `QueueEntry`, `Proposal`/`ProposalAttempt`
- Faltam as 3 queries + 5 mutations GraphQL listadas em Scope
- Faltam os hooks React Query + operations `.graphql` correspondentes
- Faltam os componentes de UI e a lógica das 3 páginas placeholder

---

## Requirements

### Functional Requirements

**FR1: Navegar fretes abertos**
- **Description**: Carrier vê lista de fretes `OPEN`, com filtro por cidade e tipo
- **Trigger**: Acessa `/carrier/shipments`
- **Expected Outcome**: Cards com dados do frete (tipo, descrição, peso/volume, veículo, data/janela, preço sugerido, SLA do customer, bairros de origem/destino — sem endereço completo)
- **Edge Cases**: Lista vazia → empty state; carrier já na fila de um item → card mostra status em vez do botão "Entrar na fila"

**FR2: Entrar/sair da fila**
- **Description**: Botão "Entrar na fila" no card dispara `joinProposalQueue`; se já estiver na fila, botão vira "Sair da fila" (`withdrawFromQueue`)
- **Trigger**: Ação no card de `/carrier/shipments` ou na tela `/carrier/proposals`
- **Expected Outcome**: Status atualizado (`WAITING` ou `CALLED` se havia vaga no grupo de 3); toast de sucesso/erro
- **Edge Cases**: Shipment não está mais `OPEN` (409) → toast de erro específico; já está na fila (409 `ALREADY_IN_QUEUE`) → não deveria acontecer pela UI (botão já reflete o estado), mas trata o erro se a API responder assim

**FR3: Ver status da própria fila/proposta**
- **Description**: `/carrier/proposals` lista todo shipment em que o carrier tem `QueueEntry` e/ou `Proposal`, com badge de status
- **Trigger**: Acessa `/carrier/proposals`
- **Expected Outcome**: Cards com status (`WAITING`, `CALLED`, `ACTIVE`, `EXHAUSTED`, `WITHDRAWN`) e a ação relevante pro estado atual
- **Edge Cases**: Lista vazia → empty state com CTA pra `/carrier/shipments`

**FR4: Enviar proposta inicial**
- **Description**: Quando `QueueEntry.status = CALLED`, formulário de proposta (preço, SLA do carrier, mensagem opcional) fica disponível
- **Trigger**: Ação "Enviar proposta" no card `CALLED`
- **Expected Outcome**: `submitProposal` cria a proposta (`currentAttempt: 1`), `QueueEntry` vira `ACTIVE`, card atualiza
- **Edge Cases**: Carrier não está `CALLED` (409) → ação não deveria estar disponível na UI nesse estado

**FR5: Contra-oferta**
- **Description**: Enquanto `Proposal.status = ACTIVE` e `currentAttempt < 5`, carrier pode enviar nova tentativa (novo preço/mensagem)
- **Trigger**: Ação "Nova proposta" no card `ACTIVE`
- **Expected Outcome**: `addProposalAttempt` incrementa `currentAttempt`, mostra histórico de tentativas
- **Edge Cases**: 6ª tentativa (409 `TOO_MANY_ATTEMPTS`) → botão desaparece/desabilita ao chegar em `currentAttempt = 5`

**FR6: Desistir da proposta**
- **Description**: Carrier pode desistir da proposta inteira a qualquer momento em `ACTIVE`
- **Trigger**: Ação "Desistir" (com confirmação) no card `ACTIVE`
- **Expected Outcome**: `withdrawProposal` marca `Proposal` e `QueueEntry` como `WITHDRAWN`
- **Edge Cases**: Nenhuma — ação é sempre permitida em `ACTIVE`

---

## Technical Approach

**Chosen Approach:**
Mesmo padrão do `S8-T1`: camada Pothos (enums → types → queries/mutations) por cima dos use-cases já existentes (nãoReimplementa regra de negócio, só expõe via GraphQL), `graphql-request` + codegen + hooks React Query no client, componentes `AdaptiveSelect`/`AdaptiveDialog` já validados pro filtro de browse e pro formulário de proposta.

**Alternatives Considered:**
1. **Reimplementar a lógica direto nos resolvers GraphQL** (sem usar os use-cases do REST) — descartado, duplicaria regra de negócio já testada (viola Anti-Duplication do `CLAUDE.md`)

**Rationale:**
Use-cases já recebem repos como parâmetro e retornam union discriminada (`{ success, data|code }`) — encaixam direto no resolver GraphQL do mesmo jeito que `myShipments`/`shipment`/`createShipment` já fazem hoje.

---

## Files to Change

### New Files
- `apps/web/src/server/graphql/enums/proposal.enum.ts` — `QueueEntryStatusEnum`, `ProposalStatusEnum`, `ResponseTypeEnum`
- `apps/web/src/server/graphql/types/browse-shipment.type.ts` — item de browse (endereço redigido)
- `apps/web/src/server/graphql/types/queue-entry.type.ts`
- `apps/web/src/server/graphql/types/proposal.type.ts` — `Proposal` + `ProposalAttempt`
- `apps/web/src/server/graphql/queries/browse-shipments.query.ts`
- `apps/web/src/server/graphql/queries/queue.query.ts` — `myQueueEntry`
- `apps/web/src/server/graphql/queries/proposal.query.ts` — `myProposal`
- `apps/web/src/server/graphql/mutations/queue.mutation.ts` — `joinProposalQueue`, `withdrawFromQueue`
- `apps/web/src/server/graphql/mutations/proposal.mutation.ts` — `submitProposal`, `addProposalAttempt`, `withdrawProposal`
- `apps/web/graphql/operations/proposals/*.graphql` (queries/mutations acima)
- `apps/web/src/graphql/hooks/{use-browse-shipments,use-queue-entry,use-join-queue,use-withdraw-queue,use-my-proposal,use-submit-proposal,use-add-proposal-attempt,use-withdraw-proposal}.ts`
- `apps/web/src/components/features/proposals/*` — badge de status, card de frete (browse), formulário de proposta
- `apps/web/src/components/features/shipments/browse-shipment-card.tsx` — card de browse (reaproveita labels de `shipment-labels.ts`)

### Modified Files
- `apps/web/src/server/graphql/schema.ts` — wiring dos novos enums/types/queries/mutations
- `apps/web/src/server/graphql/context.ts` — adicionar `proposalQueueRepo`/`proposalRepo` ao `GraphQLContext.repos` (se ainda não estiverem lá)
- `apps/web/src/app/carrier/dashboard/page.tsx` — atalhos + resumo
- `apps/web/src/app/carrier/shipments/page.tsx` — lista + filtro + entrar na fila
- `apps/web/src/app/carrier/proposals/page.tsx` — lista de fila/proposta + ações

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/carrier/shipments` lista fretes `OPEN` reais, com filtro por cidade e tipo
- [ ] **AC2**: Carrier consegue entrar e sair da fila de um frete, com feedback visual do status
- [ ] **AC3**: `/carrier/proposals` lista os fretes em que o carrier está na fila/tem proposta, com status correto
- [ ] **AC4**: Carrier consegue enviar a proposta inicial quando `CALLED`
- [ ] **AC5**: Carrier consegue enviar contra-oferta (até a 5ª tentativa) e desistir da proposta
- [ ] **AC6**: Erros de negócio (409 de estado inválido, tentativas esgotadas) aparecem como toast em português, sem quebrar a tela
- [ ] **AC7**: `pnpm lint`/`pnpm typecheck` passam no escopo isolado dos arquivos desta task

### Should Have (P1)
- [ ] **AC8**: `/carrier/dashboard` mostra atalho + resumo (fretes disponíveis recentes, propostas ativas)
- [ ] **AC9**: Responsivo confirmado em 375px e desktop

### Could Have (P2)
- [ ] **AC10**: Histórico completo de tentativas visível no card de proposta `ACTIVE`

---

## Test Strategy

**GraphQL (para cada query/mutation)**:
- Happy path com dado válido
- Não autenticado → `UNAUTHENTICATED`
- Role errada (ex.: customer chamando `joinProposalQueue`) → `FORBIDDEN`
- Estado inválido (ex.: `join` em shipment não-`OPEN`, `addProposalAttempt` na 6ª tentativa) → código de erro mapeado, mensagem PT-BR

**UI (para cada componente)**:
- Renderiza com dado real
- Estado vazio
- Estado de loading
- Ação disparando mutation → atualização otimista/refetch + toast

---

## Dependencies

**Blocks:** None
**Blocked By:** None (toda a API/use-cases já existem)
**Related Work:** `S8-T1` (padrões de UI/GraphQL reaproveitados), `S1-T4`/`S2-T1`/`S2-T2` (API REST original)
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Estados da fila/proposta (5 status cruzados) renderizando ação errada por card | Med | Med | Uma função pura `resolveCardAction(queueStatus, proposalStatus)` só, testada nos casos manuais do QA em vez de lógica espalhada em cada card |
| `context.ts` sem os repos de fila/proposta (mesmo bug do `S8-T1` com `customerProfileRepo`) | Baixa | Alto | Checar `GraphQLContext.repos` antes de escrever os resolvers, não só depois de um erro em runtime |

---

## Complexity Estimate

**Overall**: Complex
- Backend: Medium (só exposição GraphQL, regra de negócio já existe)
- Frontend: Complex (5 estados de fila/proposta cruzados, 3 telas)

**Estimated Effort**: 6-9 hours
**Confidence**: Medium

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-20

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Escopo "Ideal" escolhido em chat — espelha 100% da API REST já pronta (browse + fila + proposta com contra-oferta e desistência), não só o caminho mínimo de "entrar na fila".

---

## References

- **Design**: Segue o mesmo design system do `S8-T1` (`docs/DESIGN-SYSTEM.md`)
- **Related Issues**: `docs/tasks/s1-t4-shipment-browse/`, `docs/tasks/s2-t1-proposal-queue/`, `docs/tasks/s2-t2-proposal-attempt/`
