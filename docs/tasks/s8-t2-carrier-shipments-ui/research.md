# Carrier — Fretes e Propostas (UI) — RESEARCH

**Date**: 2026-07-20
**Phase**: RESEARCH
**Status**: COMPLETE

---

## Context

A Exploration confirmou que browse, fila e proposta (por `shipmentId` conhecido) têm 100% da regra de negócio pronta em use-cases isolados. Mas não existe, em nenhuma camada (REST ou use-case), uma forma de listar **todas** as entradas de fila/proposta de um carrier de uma vez — que é exatamente o que `/carrier/proposals` (AC3 do brief) precisa. Essa lacuna foi decidida em chat (ver Decision Log).

---

## Goals

- Decidir a forma de alimentar a lista agregada de `/carrier/proposals` (decisão em chat)
- Fechar o desenho exato das queries/mutations GraphQL (nomes, args, tipos de retorno)
- Mapear a matriz completa de estados (fila × proposta) pras ações que cada card deve oferecer
- Registrar os edge cases que a UI precisa tratar

---

## Technical Analysis

### Nova peça de backend: `myProposals` (lista agregada paginada)

`ProposalQueueEntry` é sempre criado primeiro (join na fila) e tem, no schema Prisma, uma relação 1:1 opcional com `Proposal` (`ProposalQueueEntry.proposal Proposal?`, `Proposal.queueEntryId String @unique`). Isso significa que **uma única query** ancorada em `proposalQueueEntry` — com `include: { proposal: { include: { attempts } } }` — já traz tudo que a tela precisa, sem juntar duas listas manualmente.

**Novo repo method** (`proposal-queue.repository.ts`):
```ts
listByCarrier(
  carrierId: string,
  filter: { cursor?: string; limit?: number },
): Promise<{ data: CarrierQueueEntryWithProposal[]; nextCursor: string | null }>
```
Implementação espelha `shipmentRepository.listForCustomer` (mesmo padrão de cursor já usado no projeto): `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`, `take: limit + 1`, `cursor: { id }, skip: 1` quando houver cursor, `hasMore`/`nextCursor` pela sobra do `+1`.

Cada linha também precisa dos dados do shipment pra renderizar o card (tipo, descrição, data, preço) — resolvido com `include: { shipment: { select: BROWSE_SELECT } }` (reaproveita o mesmo select já usado em `listOpenForBrowse`, incluindo `addresses` redigidos — carrier não vê endereço completo aqui também, mesma regra do `S1-T4`).

**Novo use-case** (`use-cases/shipments/queue/list-my-queue-entries.use-case.ts`):
```ts
listMyQueueEntries(queueRepo: ProposalQueueRepository, carrierId: string, filter): Promise<{ success: true; data: ...; nextCursor }>
```
Só chama o repo — não tem regra de negócio própria (sempre sucesso, sem código de erro; paginação simples). Padrão idêntico ao `browseOpenShipments` (que também é um wrapper fino de 1 repo call).

### GraphQL — queries e mutations finais

| Nome | Tipo | Args | Retorno | Espelha |
|---|---|---|---|---|
| `browseShipments` | query | `cityId?, type?, cursor?, limit?` | `BrowseShipmentConnection` | `S1-T4` |
| `myQueueEntry` | query | `shipmentId!` | `QueueEntry` (nullable) | `GET queue/me` |
| `myProposal` | query | `shipmentId!` | `Proposal` (nullable) | `GET proposal` |
| `myProposals` | query | `cursor?, limit?` | `CarrierQueueEntryConnection` | novo (decisão desta Research) |
| `joinProposalQueue` | mutation | `shipmentId!` | `QueueEntry` | `POST queue/join` |
| `withdrawFromQueue` | mutation | `shipmentId!` | `Boolean` | `POST queue/withdraw` |
| `submitProposal` | mutation | `shipmentId!, input!` | `Proposal` | `POST proposal` |
| `addProposalAttempt` | mutation | `shipmentId!, input!` | `Proposal` | `POST proposal/attempts` |
| `withdrawProposal` | mutation | `shipmentId!` | `Boolean` | `POST proposal/withdraw` |

`myQueueEntry`/`myProposal` (por `shipmentId`) continuam existindo **além** de `myProposals` (lista) — não são redundantes: os primeiros alimentam o card de browse (carrier já está vendo aquele shipment específico, não precisa da lista inteira); o segundo alimenta a tela dedicada. Mesma dualidade que `shipment`/`myShipments` já tem no domínio customer.

Todo resolver de mutation/query carrier-only abre com o mesmo guard, replicando a REST route (use-cases não validam role sozinhos — achado da Exploration):
```ts
if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')
```

### Matriz de estado → ação do card (`resolveCardAction`)

Função pura (`components/features/proposals/resolve-card-action.ts`), único lugar que decide qual ação mostrar — evita a lógica se espalhar por card (risco já registrado no brief):

| `QueueEntry.status` | `Proposal.status` | `currentAttempt` | Ação(ões) no card |
|---|---|---|---|
| `WAITING` | — (sem proposta) | — | "Sair da fila" |
| `CALLED` | — (sem proposta) | — | "Enviar proposta" + "Sair da fila" |
| `ACTIVE` | `ACTIVE` | `< 5` | "Nova proposta" (contra-oferta) + "Desistir" |
| `ACTIVE` | `ACTIVE` | `= 5` | "Desistir" (contra-oferta esgotada) |
| `EXHAUSTED` | qualquer/nenhuma | — | Somente leitura — "Vaga encerrada" |
| `WITHDRAWN` | qualquer/nenhuma | — | Somente leitura — "Você saiu da fila/desistiu" |
| qualquer | `ACCEPTED` | — | Somente leitura — "Proposta aceita" (badge de sucesso) |
| qualquer | `REJECTED` | — | Somente leitura — "Proposta recusada" |
| qualquer | `EXPIRED` | — | Somente leitura — "Proposta expirada" |

---

## Edge Cases

- **`sweepExpiredProposals` roda dentro de quase todo use-case de fila/proposta** (efeito colateral síncrono já existente) — uma query `myQueueEntry`/`myProposal`/`myProposals` pode mudar o status só de ser lida (proposta vencida vira `EXPIRED` na consulta). A UI não precisa saber disso — só reflete o status retornado, mas vale não cachear agressivamente (React Query padrão, sem `staleTime` customizado, mesmo comportamento do `S8-T1`).
- **`browseShipments` mostra um shipment em que o carrier já está na fila** — o card de browse precisa saber disso (senão mostraria "Entrar na fila" pra quem já entrou). Resolvido com `myQueueEntry(shipmentId)` por card visível — aceitável porque a lista de browse é paginada (≤20 por página, não é N ilimitado).
- **Contra-oferta na 5ª tentativa** — botão precisa desaparecer/desabilitar assim que `currentAttempt = 5`, não só depois do 409 — já coberto pela matriz acima.
- **`withdrawFromQueue`/`withdrawProposal` são destrutivos** (não dá pra voltar atrás — precisa entrar na fila de novo do zero, e o backend não impede reentrada com `join` de novo se o shipment ainda estiver `OPEN`/`PROPOSALS_RECEIVED`) — ambas as ações pedem confirmação (`AdaptiveDialog` com texto de aviso), mesmo padrão de ação destrutiva usado em outras partes do design system.
- **Erro `ALREADY_IN_QUEUE`/`NOT_CALLED`/`ALREADY_PROPOSED`** não deveriam acontecer pela UI normal (botões já refletem o estado atual), mas podem ocorrer em corrida (dois tabs abertas, fila avançou entre o carrier ver a tela e clicar) — tratados como qualquer erro de mutation: toast PT-BR + refetch da query relacionada pra sincronizar o estado real.

---

## Decision Log

| Decisão | Escolha | Razão |
|---|---|---|
| Como alimentar `/carrier/proposals` | Novo use-case + repo method `listByCarrier`, paginado por cursor (mesmo padrão de `listForCustomer`/`listOpenForBrowse`) | Escolhido em chat (opção "Ideal") — mantém o AC3 do brief e já nasce com o mesmo padrão de paginação do resto do projeto, sem retrabalho se o volume crescer |
| `myQueueEntry`/`myProposal` por `shipmentId` vs só a lista agregada | Manter os dois | Não são redundantes — um alimenta o card de browse (shipment já conhecido), o outro a tela dedicada; mesma dualidade que `shipment`/`myShipments` já tem |
| Onde decidir a ação de cada card | Função pura única (`resolveCardAction`), não lógica espalhada por componente | Mitigação de risco já prevista no brief; a matriz tem 9 combinações de estado, lógica inline por card ficaria propensa a inconsistência |
| Validar role `CARRIER` nos resolvers | Check explícito `ctx.principal.role !== 'CARRIER'` em cada query/mutation nova | Os use-cases de fila/proposta não validam role sozinhos (diferente de `createShipment`) — sem o check, qualquer usuário autenticado poderia entrar na fila/propor. Replica exatamente o que toda REST route já faz |

---

## Blockers

✅ Nenhum — decisão pendente (lista agregada) resolvida em chat, todo o resto já estava mapeado na Exploration.

---

## Next Steps

1. Plan + Todo: sub-steps ordenados (context.ts → enums → types → novo repo method/use-case → queries/mutations → codegen → hooks → componentes → páginas)
2. Execution
