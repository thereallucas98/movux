# S8-T7 — Exploration

**Date**: 2026-07-21
**Status**: Complete

---

## Estado atual dos 3 dashboards

| Rota | Renderiza hoje |
|---|---|
| `/customer/dashboard` | Título + botão "Criar frete" + `<ShipmentsList limit={5}/>` |
| `/carrier/dashboard` | Título + botão "Buscar fretes" + `<BrowseShipmentsList limit={3}/>` + `<MyProposalsList limit={3}/>` |
| `/admin/dashboard` | Título + botão "Ver verificações" + `<DocumentList limit={3}/>` |

Nenhum tem número agregado hoje — só preview de lista.

## Dados prontos (sem agregação nova)

- `CustomerProfile.avgRating` / `CustomerProfile.totalShipments` (`prisma/schema.prisma:327-332`) — pré-computados, atualizados por `CustomerProfileRepository.updateRating()` (chamado em `submit-review.use-case.ts`).
- `CarrierProfile.avgRating` / `CarrierProfile.totalShipments` / `isFlagged` / `isActive` / `verificationStatus` (`prisma/schema.prisma:342-356`) — idem, `CarrierProfileRepository.updateRating()` também seta `isFlagged`/`isActive` conforme threshold.

**Gap encontrado**: nenhum dos dois repositories expõe hoje um método pra *ler* esses campos por `userId` — `CustomerProfileRepository.findByUserId()` existe mas só retorna `{ id: true }` (usado por `getShipment` use-case pra resolver o `customerProfile.id`, não pra métricas). `CarrierProfileRepository` só tem `updateRating`/`markVerified` (nenhum método de leitura). Precisa de um método novo em cada um, sem alterar a assinatura dos existentes (evita ripple em quem já usa `findByUserId`).

## Dados que precisam de agregação nova

- **`Shipment` não tem `carrierId` direto** (`prisma/schema.prisma:611+`) — o carrier vencedor só é rastreável via `Proposal.status='ACCEPTED'` + `Proposal.carrierId` (`prisma/schema.prisma:733-756`, índice `@@index([carrierId, status])` já existe). Métricas de carrier ("fretes ativos", "total ganho") precisam de filtro por relação: `shipment.aggregate({ where: { proposals: { some: { carrierId, status: 'ACCEPTED' } } } } })` — suportado nativamente pelo Prisma, sem SQL raw.
- **Nenhum repository tem método de contagem/soma pro domínio de fretes/documentos/carriers** — confirmado via busca por `count`/`aggregate`/`groupBy` em `shipment.repository.ts`, `carrier-document.repository.ts`, `carrier-profile.repository.ts`, `proposal.repository.ts`: nenhum ocorre. As únicas agregações Prisma reais do projeto pertencem ao domínio workforce (`candidate.repository.ts`, `assignment.repository.ts` etc.) ou a `review.repository.ts:60` (`getAverageRatingByReviewee`, usado só internamente pelo recálculo de rating).
- **Nenhuma query GraphQL de contagem/estatística existe hoje pro domínio de fretes** — as únicas do schema (`candidateCountForShift`, `myUnreadNotificationCount`) são do domínio workforce, não reaproveitáveis.

## Repositories a modificar — assinaturas existentes (contexto pra não colidir)

- `ShipmentRepository` (`shipment.repository.ts:93-133`): `createDraft`, `findByIdForOwner`, `findById` (novo do S8-T5), `findStatusForOwner`, `findStatusById`, `findForProposal`, `updateStatus`, `markCarrierSelected`, `markCollected`, `markInTransit`, `markDelivered`, `listForCustomer`, `listOpenForBrowse`. Nenhum de contagem/soma.
- `CarrierDocumentRepository` (`carrier-document.repository.ts:35-51`): `create`, `findByCarrier`, `findById`, `updateStatus`, `findApprovedTypesByCarrier`, `findByStatus`, `recordExternalValidation`. Nenhum de contagem.
- `CarrierProfileRepository` (`carrier-profile.repository.ts:3-6`): só `updateRating`, `markVerified`.
- `CustomerProfileRepository` (`customer-profile.repository.ts:3-7`): `findByUserId` (retorna só `{id}`), `findUserIdById`, `updateRating`.

## Integration points

- `ctx.repos` (`server/graphql/context.ts:67,68,71,72,75,76`) já expõe `shipmentRepo`, `customerProfileRepo`, `proposalRepo`, `carrierProfileRepo`, `carrierDocumentRepo` — todos os repos necessários já estão disponíveis no contexto GraphQL, nenhum precisa ser adicionado ali.
- `formatPriceInCents` (`lib/format-price.ts`) — reaproveitado pra "Total gasto"/"Total ganho".
- Paleta de cor por categoria (`globals.css`) e padrão de ícone circular (`shipment-type-icon.tsx`, `document-type-icon.tsx`) — modelo direto pro `MetricCard`.

## Riscos confirmados

- Filtro por relação (`proposals: { some: {...} }`) é um padrão novo neste projeto (nenhum repository faz isso hoje) — mas é uma feature nativa e documentada do Prisma, não SQL raw nem workaround; o índice `@@index([carrierId, status])` em `Proposal` já existe e cobre a query.
- `avgRating` é `Decimal? @db.Decimal(3,2)` (nullable) — precisa tratamento explícito de `null` → "—" no `MetricCard`, tanto pro use-case (não forçar `0`) quanto pro componente.
