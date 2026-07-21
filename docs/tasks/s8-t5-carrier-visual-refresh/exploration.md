# S8-T5 — Exploration

**Date**: 2026-07-21
**Status**: Complete

---

## Estado atual do fluxo do carrier

### Rotas (`app/carrier/`)
| Rota | Componente | Estado hoje |
|---|---|---|
| `/carrier/dashboard` | `BrowseShipmentsList limit={3}` + `MyProposalsList limit={3}` | Sem ícone, preview de 3 itens de cada lista |
| `/carrier/shipments` | `BrowseShipmentsList` → grid de `BrowseShipmentCard` | Sem ícone, card não clicável, filtro cidade/tipo via `AdaptiveSelect` |
| `/carrier/proposals` | `MyProposalsList` | Sem ícone, card não clicável |
| `/carrier/shipments/[shipmentId]` | **não existe** | — |

### Componentes de card (o que muda)
- **`browse-shipment-card.tsx`**: `Card` com `CardHeader` (tipo + preço), `CardContent` (descrição, origem→destino, data/janela), `CardFooter` (`ShipmentActionButton`). Sem ícone. Não é link/clicável.
- **`my-proposals-list.tsx`**: mesma estrutura de `Card`, com `QueueStatusBadge` + `ProposalStatusBadge` no header, `ShipmentActionButton` no footer. Sem ícone. Não é link/clicável.
- **`shipment-type-icon.tsx`** (do S8-T4): já existe, mapeia `ShipmentType` → ícone+cor. Reaproveitável direto, mesmo enum.

### Ação inline (`ShipmentActionButton` + `resolve-card-action.ts`)
- `resolveCardAction({queueStatus, proposalStatus, currentAttempt})` é a única fonte de verdade de qual ação mostrar — cobre 9+ combinações de estado, incluindo estados terminais (`actions: [], readOnlyLabel: 'Proposta aceita'` etc.).
- Já é seguro embutir esse componente em qualquer lugar (card ou página de detalhe) — não faz suposição de onde está renderizado.
- Usa 2 hooks próprios (`useQueueEntry`, `useMyProposal`), cada um resolvendo o estado do carrier logado pra aquele `shipmentId` — não depende de nenhum dado vindo de fora do componente.

---

## Backend: o que existe e o que falta

### `shipment(id!)` não serve pro carrier
`get-shipment.use-case.ts`:
```ts
const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
if (!customerProfile) return { success: false, code: 'NOT_FOUND' }
const shipment = await repos.shipmentRepo.findByIdForOwner(shipmentId, customerProfile.id)
```
Carrier nunca tem `customerProfile` → sempre `NOT_FOUND`. Confirma que a query `shipment` do S8-T4 é exclusiva do fluxo customer.

### Repositórios já prontos pra checagem de permissão do carrier
- `proposalQueueRepository.findByShipmentAndCarrier(shipmentId, carrierId)` — `prisma.proposalQueueEntry.findUnique({ where: { shipmentId_carrierId: {...} }})`
- `proposalRepository.findByShipmentAndCarrier(shipmentId, carrierId)`
- Ambos já usados pelas queries `myQueueEntry`/`myProposal` (`proposal.query.ts`), que passam `ctx.principal.userId` **direto** como `carrierId` — confirmado no schema: o campo `carrierId` nesses modelos armazena o `User.id`, sem indireção via um "CarrierProfile" (diferente do customer, que tem `customerProfileRepo.findByUserId`).

### O que falta
- **Repo**: nenhum método busca 1 `Shipment` por id com `addresses` sem escopo de owner. Os existentes: `findByIdForOwner` (escopado a customer), `findStatusForOwner`/`findStatusById` (sem addresses), `findForProposal` (sem addresses, campos mínimos). Precisa de um método novo.
- **Use-case**: nenhum combina "está `OPEN`" OU "carrier logado tem fila/proposta" — precisa ser escrito.
- **GraphQL**: nenhuma query expõe isso — precisa de campo novo em `shipments.query.ts` (ou arquivo próprio). O tipo de retorno (`ShipmentType` em `types/shipment.type.ts`, com `toGraphQLShipment`) já existe e é reaproveitável sem alteração.
- **Erros**: `NOT_FOUND`/`FORBIDDEN` já existem em `ErrorCode`/`gqlErrorFromResult` — nenhum código novo necessário.

---

## Integration points

- `ShipmentTypeIcon` (S8-T4) — reaproveitado sem alteração, mesmo `ShipmentType` enum tanto pro browse quanto pras propostas.
- `SHIPMENT_TYPE_LABELS`/`TIME_WINDOW_LABELS` (`shipment-labels.ts`) — reaproveitados no detalhe, mesmo padrão do `ShipmentDetailView` do customer.
- `formatPriceInCents` — reaproveitado.
- Nav (`sidebar.tsx`/`bottom-tabs.tsx`) — `getActiveNavHref` (fix do S8-T4) já cobre esse caso: `/carrier/shipments/[id]` vai casar com o item `/carrier/shipments` como prefixo mais específico, mesmo comportamento correto validado pro customer. Nenhuma mudança necessária aqui.

## Riscos confirmados na exploração

1. **Card clicável vs. botão de ação dentro do card**: hoje `ShipmentActionButton` abre `Dialog`/`AdaptiveDialog` (`ProposalFormDialog`, `WithdrawConfirmDialog`) a partir de um clique de botão dentro do `CardFooter`. Se o card virar um `Link`/`onClick` de navegação, o clique no botão vai borbulhar e disparar os dois comportamentos ao mesmo tempo — precisa de `stopPropagation` explícito no wrapper do botão/trigger.
2. **Checagem de permissão nova**: replica exatamente a mesma lógica já usada e validada por `myQueueEntry`/`myProposal` (`findByShipmentAndCarrier`) — risco de vazamento de dado é baixo porque não é uma regra nova, é a mesma regra existente aplicada num terceiro lugar (a query de detalhe, além das duas de estado que já a usavam).
