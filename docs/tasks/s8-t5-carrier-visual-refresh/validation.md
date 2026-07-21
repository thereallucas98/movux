# S8-T5 — Validation

**Status:** ✅ concluído — com ressalvas de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `/carrier/shipments` (browse) | Cards com ícone circular por tipo, mesma paleta do S8-T4 | ✅ |
| 2 | `/carrier/proposals` | Idem, ícone por tipo em cada card | ✅ |
| 3 | Clique num card do browse (fora do botão) | Navega pra `/carrier/shipments/[shipmentId]` | ✅ |
| 4 | Clique num card de propostas (fora do botão) | Idem | ✅ |
| 5 | Clique no botão de ação dentro do card (browse) | Dispara a mutação (`joinQueue`) sem navegar | ✅ — testado com "Entrar na fila", card atualizou estado (`Enviar proposta`/`Sair da fila`) sem sair da lista |
| 6 | Clique no botão que abre dialog (propostas) | Abre `ProposalFormDialog` sem navegar | ✅ |
| 7 | Página de detalhe — frete `OPEN`/`PROPOSALS_RECEIVED` sem envolvimento prévio | Mostra dados reais + ação "Entrar na fila" | ✅ |
| 8 | Página de detalhe — frete com fila/proposta do carrier logado (estado read-only) | Mostra label correto (ex.: "Você desistiu da proposta") | ✅ |
| 9 | Página de detalhe — frete não-browsable sem envolvimento do carrier logado (testado com 2ª conta carrier nova, frete `DELIVERED`) | `EmptyState` "Frete não encontrado", sem vazar dado | ✅ (bug real encontrado e corrigido — ver Desvios) |
| 10 | Página de detalhe — `shipmentId` inexistente | Mesmo tratamento | ✅ |
| 11 | Dashboard do carrier (`/carrier/dashboard`) | Reflete ícone automaticamente (reaproveita os mesmos componentes de lista) | ✅ sem trabalho extra |
| 12 | Responsivo 375px | Cards, bottom tab bar, detalhe sem scroll horizontal | ✅ |
| 13 | Responsivo desktop (1280px) | Sidebar, grid de cards, detalhe | ✅ |
| 14 | Console do navegador | Sem erros do app em nenhum dos fluxos testados | ✅ |

## Typecheck / Lint / Build

- **Lint isolado** (`shipment.repository.ts`, `get-shipment-for-carrier.use-case.ts`, `use-cases/index.ts`, `shipments.query.ts`, `use-shipment-for-carrier.ts`, `carrier-shipment-detail-view.tsx`, `carrier/shipments/[shipmentId]/page.tsx`, `browse-shipment-card.tsx`, `my-proposals-list.tsx`): limpo (0 erros/warnings).
- **`pnpm typecheck` isolado**: sem erros nos arquivos acima.
- **`pnpm lint` / `pnpm build` (projeto inteiro)**: **não passam** — mesmo débito pré-existente da migração Turnora→Movux já registrado nos `validation.md` do S8-T1 e S8-T4 (`workspace/select/route.ts` + domínio `tenants`/`workspaces`/`shifts` não migrado). Confirmado via `git status`/`git log` que nenhum desses arquivos foi tocado nesta task.

## Desvios encontrados durante execução

1. **Regra de visibilidade do detalhe incompleta (bug real, encontrado na QA)**: `get-shipment-for-carrier.use-case.ts` originalmente só liberava o detalhe pra `status === 'OPEN'`. Testando o fluxo real de browse, descobri que `shipmentRepo.listOpenForBrowse` (já existente, não mexi) libera entrada na fila pra `status IN ('OPEN', 'PROPOSALS_RECEIVED')` — a fila continua aceitando novos carriers mesmo depois do primeiro grupo já ter recebido chamada (regra do S8-T2/S2-T1, "hybrid call group"). Resultado: um card clicável do browse com botão "Entrar na fila" ativo levava pra uma página de detalhe que dizia "Frete não encontrado" — inconsistência visível na própria tela. Corrigido alinhando o use-case ao mesmo conjunto de status (`BROWSABLE_STATUSES = ['OPEN', 'PROPOSALS_RECEIVED']`), revalidado depois: (a) esse cenário passou a funcionar, (b) o isolamento pra fretes fora desse conjunto sem fila/proposta do carrier continua bloqueado (retestado com frete `DELIVERED` + 2ª conta carrier limpa).
2. **Conta de teste nova criada**: `s8t5.qa.b@carrier.dev` (senha `senha1234`), registrada via UI só pra QA do isolamento entre 2 carriers — sem envolvimento com nenhum frete até o momento do teste, cenário limpo intencional.

Nenhum desvio de arquitetura do Plan original — backend seguiu 100% o padrão `Route/Resolver → UseCase(repos) → Repository (Prisma)`, sem biblioteca nova.

## Acceptance criteria (brief.md)

- [x] AC1: `/carrier/shipments` mostra ícone por tipo em cada card
- [x] AC2: `/carrier/proposals` mostra ícone por tipo em cada card
- [x] AC3: Card clicável navega pro detalhe; botão de ação não navega
- [x] AC4: Detalhe mostra dados reais + `ShipmentActionButton` funcional, refletindo estado real
- [x] AC5: Acesso negado não vaza dado (testado, corrigido, revalidado)
- [x] AC6: `pnpm lint`/`pnpm typecheck` passam no escopo isolado
- [x] AC7: Responsivo 375px e desktop confirmados
- [x] AC8: Dashboard reflete o visual automaticamente

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build` quebrado | Mesmo débito pré-existente já registrado no S8-T1/S8-T4 (`workspace/select/route.ts` + domínio Turnora não migrado). |
| Admin (verificação de documentos) | Próxima rodada do redesign visual, domínio diferente (documentos, não fretes) — decisão de escopo já registrada no brief. |
| UI de transit-status pro carrier (coletar/em trânsito/entregar) | Gap pré-existente, não introduzido nem fechado por esta task — fora do escopo. |
| Toast global de erro genérico | Mesmo item já registrado no S8-T4 — `use-shipment-for-carrier.ts` já nasceu com `meta: { silent: true }`, aprendizado aplicado desde o início desta rodada. |
