# S8-T7 — Validation

**Status:** ✅ concluído — com ressalvas de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `/customer/dashboard` — conta com 1 frete ativo, nenhum entregue | Fretes ativos=1, Total de fretes=1, Total gasto=R$0,00, Avaliação="—" | ✅ |
| 2 | `/carrier/dashboard` — conta sem proposta aceita | Fretes ativos=0, Total de fretes=0, Total ganho=R$0,00 | ✅ (confirmado zero-state correto, sem vazar dado de outro carrier) |
| 3 | `/carrier/dashboard` — conta com 3 fretes entregues (R$200 cada) | Fretes ativos=0, Total de fretes=3, Total ganho=R$600,00 | ✅ números batem exatamente com a lista "Minhas propostas" |
| 4 | `/admin/dashboard` | 4 cards com contagens agregadas da plataforma | ✅ "Documentos pendentes" bate com a lista abaixo (2) |
| 5 | Isolamento entre roles (GraphQL direto) | Admin chamando `carrierDashboardMetrics`/`customerDashboardMetrics` → `FORBIDDEN` | ✅ testado via `fetch('/api/graphql')` na sessão do admin |
| 6 | Responsivo 375px | Grid 2 colunas, sem scroll horizontal | ✅ (bug real encontrado e corrigido — ver Desvios) |
| 7 | Responsivo desktop (1280px) | Grid 4 colunas | ✅ |
| 8 | Console do navegador | Sem erros do app (1 hydration warning é o mesmo falso-positivo de extensão do Chrome já documentado no S8-T4/S8-T6 — `cz-shortcut-listen`) | ✅ |

## Typecheck / Lint / Build

- **Lint isolado** (4 repositories modificados, 3 use-cases novos, 1 query GraphQL, 3 hooks, `MetricCard`, 3 componentes de métrica, 3 páginas): limpo (0 erros/warnings).
- **`pnpm typecheck` isolado**: sem erros.
- **`pnpm lint` / `pnpm build` (projeto inteiro)**: **não passam** — mesmo débito pré-existente já registrado no S8-T1/S8-T4/S8-T5/S8-T6 (migração Turnora→Movux incompleta, `workspace/select/route.ts`). Nenhum arquivo desse débito foi tocado nesta task.

## Desvios encontrados durante execução

1. **"Total de fretes" sempre zerado (bug real, mais sério que os anteriores)**: o plano original lia `CustomerProfile.totalShipments`/`CarrierProfile.totalShipments` — campos pré-computados que existiam desde antes deste projeto (Sprint 4). Na Exploration eu já tinha notado que só `updateRating()` escreve nesses profiles, mas não percebi até a QA que **nenhum use-case do sistema jamais incrementa `totalShipments`** — o recálculo de rating atualiza `avgRating`/`isFlagged`/`isActive`, mas nunca `totalShipments`. O campo fica travado no `@default(0)` pra sempre, pra todo customer e carrier da plataforma, desde a criação da coluna. Se eu tivesse seguido o Plan original, o dashboard inteiro mostraria "Total de fretes: 0" pra todo mundo, sempre — um bug visível e óbvio que teria comprometido a confiança na feature toda. Corrigido substituindo por contagem real (`ShipmentRepository.countByCustomer`/`countByCarrier`, contagem direta na tabela `Shipment`, sem depender do campo morto). Revalidado com dado real de duas contas (zero-state e caso positivo com 3 fretes).
2. **Truncamento de valor no mobile**: `MetricCard` usava `text-2xl` fixo + `truncate`, que cortava "R$ 600,00" em grids de 2 colunas (375px). Corrigido com tamanho de fonte/ícone responsivo (`text-lg` mobile / `text-2xl` desktop, ícone `size-10`/`size-12`).

Nenhum desvio de arquitetura do Plan original (backend segue `Route/Resolver → UseCase(repos) → Repository (Prisma)`, sem lib nova, sem migration).

## Acceptance criteria (brief.md)

- [x] AC1: `/customer/dashboard` mostra 4 cards com números reais
- [x] AC2: `/carrier/dashboard` mostra 4 cards com números reais
- [x] AC3: `/admin/dashboard` mostra 4 cards com números agregados da plataforma
- [x] AC4: Formatação de preço/avaliação nula corretas
- [x] AC5: `pnpm lint`/`pnpm typecheck` passam no escopo isolado
- [x] AC6: Responsivo confirmado em 375px e desktop
- [x] AC7: Isolamento por role confirmado (sem vazamento entre queries)

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build` quebrado | Mesmo débito pré-existente já registrado nas tasks anteriores do Sprint 8 (`workspace/select/route.ts` + domínio Turnora não migrado). |
| `CustomerProfile.totalShipments`/`CarrierProfile.totalShipments` — campo morto | Confirmado nunca escrito por nenhum use-case do sistema (não só desta task). Como o dashboard agora usa contagem real em vez desse campo, não bloqueia mais nada visualmente, mas o campo continua existindo no schema sem uso — candidato a remoção numa limpeza futura de schema, fora do escopo desta task. |
| Labels longos truncando no mobile (admin) | "Documentos pendentes"/"Carriers sinalizados" cortam com "..." em 375px — número (dado principal) continua legível, sem quebra de layout. Não corrigido agora; revisar se algum label ficar mais longo no futuro. |
| Filtro de período | Fora de escopo por decisão explícita (todas as métricas são "total até agora") — considerar se o usuário pedir "este mês" numa rodada futura. |
