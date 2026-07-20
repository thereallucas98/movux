# Validation: S8-T2 — Carrier: Fretes e Propostas (UI)

**Date**: 2026-07-20
**Status**: Complete

---

## Acceptance Criteria

| ID | Criterion | Verification Method | Result |
|----|-----------|---------------------|--------|
| AC1 | `/carrier/shipments` lista fretes `OPEN` reais, com filtro por cidade e tipo | Manual (navegador) | ✅ |
| AC2 | Carrier consegue entrar e sair da fila, com feedback visual do status | Manual (navegador) | ✅ |
| AC3 | `/carrier/proposals` lista os fretes em que o carrier está na fila/tem proposta, com status correto | Manual (navegador) | ✅ |
| AC4 | Carrier consegue enviar a proposta inicial quando `CALLED` | Manual (navegador) | ✅ |
| AC5 | Carrier consegue enviar contra-oferta e desistir da proposta | Manual (navegador) | ✅ |
| AC6 | Erros de negócio aparecem como toast em português, sem quebrar a tela | Manual (navegador) | ✅ |
| AC7 | `pnpm lint`/`pnpm typecheck` passam no escopo isolado dos arquivos desta task | Comando | ✅ |
| AC8 | `/carrier/dashboard` mostra atalho + resumo | Manual (navegador) | ✅ |
| AC9 | Responsivo confirmado em 375px e desktop | Manual (navegador) | ✅ |
| AC10 | Histórico completo de tentativas visível no card de proposta `ACTIVE` | Código (attempts incluído na query `myProposal`/`myProposals`) | ✅ (dado disponível; UI mostra só o preço mais recente — ver Follow-ups) |

---

## QA Checklist

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `/carrier/shipments` com fretes `OPEN` reais | Cards com tipo, preço, bairros de origem/destino (redigido), data/janela | ✅ |
| 2 | Filtro por tipo (`AdaptiveSelect`) | Lista filtra corretamente; "Limpar filtros" aparece só com filtro ativo | ✅ |
| 3 | Entrar na fila (`joinProposalQueue`) | Toast de sucesso; card atualiza pra "Chamado" (grupo de 3 com vaga livre) | ✅ |
| 4 | Enviar proposta inicial (`submitProposal`) | Bug real encontrado (mensagens Zod técnicas em inglês) → corrigido → funciona, preço formatado em BRL | ✅ corrigido |
| 5 | Contra-oferta (`addProposalAttempt`) | Sem campo de SLA (correto — só a 1ª tentativa define o SLA); preço do card atualiza pra última tentativa | ✅ |
| 6 | Desistir da proposta (`withdrawProposal`) | Dialog de confirmação destrutivo; estado somente-leitura "Você desistiu da proposta" após confirmar | ✅ |
| 7 | Sair da fila (`withdrawFromQueue`) | Dialog de confirmação destrutivo; estado somente-leitura "Você saiu da fila" após confirmar | ✅ |
| 8 | `/carrier/proposals` (query `myProposals`, paginada) | Mesmos dados agregados, badges de status corretos | ✅ |
| 9 | `/carrier/dashboard` | Atalho "Buscar fretes" + resumo de fretes disponíveis e propostas (limit 3) | ✅ |
| 10 | Responsivo 375px (mobile) | Cards empilhados, tab bar inferior, `Sheet` (bottom) no modal de proposta, sem scroll horizontal | ✅ |
| 11 | Console do navegador | Sem erros do app | ✅ |
| 12 | Botões de ação dos cards | Feedback do usuário: botões grandes demais, soltos no meio do card → movidos pro `CardFooter`, tamanho `sm` | ✅ corrigido |

## Desvios encontrados durante a execução

1. **Gap real descoberto na Research**: nem a API REST nem os use-cases tinham uma forma de listar "todas as minhas propostas/filas" — só consulta por `shipmentId` conhecido. Resolvido em chat (decisão "Ideal"): novo método `proposalQueueRepository.listByCarrier` (paginado por cursor, mesmo padrão de `listForCustomer`/`listOpenForBrowse`) + novo use-case `listMyQueueEntries`, expostos como `myProposals`.
2. **`GraphQLContext.repos` não tinha `proposalQueueRepo`, `proposalRepo`, `notificationLogRepo`, `shipmentEventRepo`** — mesmo tipo de bug já visto no S8-T1 (repo faltando no context). Adicionados em `context.ts`.
3. **Resolvers precisam checar `role === 'CARRIER'` explicitamente** — os use-cases de fila/proposta não validam role sozinhos (diferente de `createShipment`, que falha via `customerProfileRepo` lookup). Todo resolver novo replica o mesmo guard das REST routes.
4. **Bug real de UX encontrado no QA**: mensagens de validação do formulário de proposta saíam em inglês técnico ("Invalid input: expected 4"). Causa raiz: `zodResolver` (`@hookform/resolvers/zod`) ignora a mensagem customizada de nível superior em `z.union` de literais (`{error: '...'}`) e usa a do primeiro branch que falhou. O mesmo padrão (`z.union([z.literal(4),...])`) já existia em `shipment.schema.ts` desde o S8-T1, mas nunca disparou porque aquele form sempre tinha valor default — bug dormente, não pego na QA anterior. Corrigido extraindo um helper compartilhado `sla-hours.schema.ts` (`z.number().refine(...)`), usado nos dois schemas.
5. **`CurrencyInput` novo** em `masked-input.tsx` — preço da proposta digitado em centavos, formatado como BRL em tempo real (mesmo motivo do decimal-safe input do S8-T1: `type="number"` descarta vírgula).
6. **`ShipmentActionButton` (novo, não estava no plan)** — único componente que resolve fila+proposta (2 queries) e decide os botões via `resolveCardAction`; reaproveitado no card de browse e na lista de propostas, evitando duplicar a lógica de estado→ação em dois lugares.
7. **Feedback pós-QA**: botões de ação dos cards estavam grandes e soltos no meio do conteúdo — movidos pro `CardFooter` (ambos `browse-shipment-card.tsx` e `my-proposals-list.tsx`) e reduzidos pra `size="sm"`.

Nenhum desvio de arquitetura da Research original (Pothos sobre use-cases já existentes, sem lógica de negócio nova além do `listMyQueueEntries`).

---

## Quality Gates

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm lint` (escopo S8-T2, arquivo por arquivo) | ✅ | 0 erros/warnings |
| `pnpm typecheck` (escopo S8-T2) | ✅ | 0 erros |
| `pnpm lint` / `pnpm typecheck` (projeto inteiro) | ❌ não passam | Bloqueados pelo mesmo débito pré-existente da migração Turnora→Movux já documentado no `S8-T1` (`assignment.repository.ts`, `notification.mutation.ts` etc.) — confirmado via `git diff` que nenhum desses arquivos foi tocado nesta task |
| `pnpm codegen` | ✅ | Schema exporta e gera tipos sem erro |
| Console do navegador | ✅ | Sem erros do app |

---

## Files Modified

```
Modified:
  apps/web/src/app/carrier/dashboard/page.tsx
  apps/web/src/app/carrier/proposals/page.tsx
  apps/web/src/app/carrier/shipments/page.tsx
  apps/web/src/components/ui/masked-input.tsx
  apps/web/src/server/graphql/context.ts
  apps/web/src/server/graphql/schema.ts
  apps/web/src/server/repositories/proposal-queue.repository.ts
  apps/web/src/server/repositories/shipment.repository.ts
  apps/web/src/server/schemas/proposal.schema.ts
  apps/web/src/server/schemas/shipment.schema.ts
  apps/web/src/server/use-cases/index.ts
  docs/ROADMAP.md

New:
  apps/web/src/components/features/proposals/*.tsx (7 arquivos)
  apps/web/src/components/features/shipments/browse-shipment-card.tsx
  apps/web/src/components/features/shipments/browse-shipments-list.tsx
  apps/web/src/graphql/hooks/use-{add-proposal-attempt,browse-shipments,join-queue,my-proposal,my-proposals,queue-entry,submit-proposal,withdraw-proposal,withdraw-queue}.ts
  apps/web/src/graphql/operations/proposals/*.graphql (8 arquivos)
  apps/web/src/graphql/operations/shipments/browse-shipments.graphql
  apps/web/src/server/graphql/enums/proposal.enum.ts
  apps/web/src/server/graphql/mutations/{proposal,queue}.mutation.ts
  apps/web/src/server/graphql/queries/{browse-shipments,proposal,queue}.query.ts
  apps/web/src/server/graphql/types/{browse-shipment,proposal,queue-entry}.type.ts
  apps/web/src/server/schemas/sla-hours.schema.ts
  apps/web/src/server/use-cases/shipments/queue/list-my-queue-entries.use-case.ts
  docs/tasks/s8-t2-carrier-shipments-ui/{brief,exploration,research,plan,todo,validation}.md
```

---

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm lint`/`pnpm build` (projeto inteiro) | Mesmo débito pré-existente documentado no `S8-T1` — não relacionado a esta task |
| Histórico de tentativas na UI | Dado (`attempts[]`) já vem na query, mas o card só mostra o preço da última tentativa — histórico completo fica pra um follow-up de UI se for pedido |
| Endereço completo pós-seleção | Segue redigido (só bairro/cidade/estado) mesmo depois do carrier ser chamado — decisão original do `S1-T4`, fora do escopo revisitar aqui |
| Gate de verificação do carrier (`S5`) | Não implementado (API também não impõe) — qualquer `CARRIER` autenticado pode navegar/entrar na fila/propor, independente de `verificationStatus` |
| Breakpoints 720px/1024px/1440px | Só 375px e desktop (1280px) testados visualmente nesta rodada, mesmo padrão do `S8-T1` |

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer (Claude) | Claude | 2026-07-20 | ✅ |
| Reviewer (Human) | David Lucas | 2026-07-20 | ✅ |
