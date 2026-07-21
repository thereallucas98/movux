# S8-T5 — Research

**Date**: 2026-07-21
**Status**: Complete

---

## Decision Log

| Decisão | Escolha | Motivo |
|---|---|---|
| Visibilidade da nova query de detalhe | `OPEN` OU carrier logado tem fila/proposta pro `shipmentId` (decidido em chat antes do brief) | Cobre `/carrier/shipments` (browse) e `/carrier/proposals` (qualquer status) com a mesma query; reaproveita permissão já existente e validada (`findByShipmentAndCarrier` em 2 repos) |
| Código de erro pra acesso negado | Só `NOT_FOUND` (sem `FORBIDDEN` diferenciado) | Nenhum use-case em `server/use-cases/shipments/` usa `FORBIDDEN` hoje — convenção da casa é não diferenciar "não existe" de "não é seu", evitando confirmar pra um carrier que um `shipmentId` de outro fluxo existe. Mesmo padrão do `getShipment` do customer (S8-T4), que também só tem `NOT_FOUND`. |
| Card clicável + botão de ação no mesmo card | `stopPropagation` no wrapper do botão de ação; o resto do card vira área clicável (`onClick`/`Link`) | Único jeito de ter as duas interações (navegar pro detalhe / agir direto do card) sem ambiguidade; mesmo padrão que browsers/apps usam pra "card com ação embutida" |
| Ação na página de detalhe | Reaproveita `ShipmentActionButton` tal como está, sem nenhuma alteração de lógica | `resolveCardAction` já cobre todos os estados (inclusive terminais, com `readOnlyLabel`) — não depende de onde é renderizado, só do `shipmentId` |
| Nome da query GraphQL nova | `shipmentForCarrier(id: ID!): Shipment` | Segue o padrão de nomes existentes (`myShipments`, `browseShipments`, `myProposal`) — o sufixo deixa explícito que a regra de visibilidade é diferente da `shipment` (customer-only) |
| Onde adicionar a query nova | Mesmo arquivo `shipments.query.ts` (junto de `shipment`/`myShipments`) | Mesmo domínio (`Shipment`), evita fragmentar queries do mesmo tipo em arquivos separados sem necessidade |
| Reaproveitar `ShipmentType` (GraphQL type) pro retorno | Sim, sem alteração | `toGraphQLShipment` já existe e serve — o novo use-case retorna o mesmo formato de shipment com `addresses`, não precisa de um tipo GraphQL novo |

## Edge cases cobertos

- Carrier vê frete `OPEN` que nunca interagiu → detalhe abre, ação = "Entrar na fila" (`resolveCardAction` com `queueStatus: null`)
- Carrier vê frete que já não é mais `OPEN` (ex.: `CARRIER_SELECTED`) mas tem proposta aceita → detalhe abre (tem `proposal`), ação = read-only "Proposta aceita"
- Carrier tenta ver frete de outro carrier, não-`OPEN`, sem fila/proposta própria → `NOT_FOUND`, sem vazar existência
- `shipmentId` que não existe → mesmo `NOT_FOUND`
- Customer tentando acessar `shipmentForCarrier` (role errada) → `FORBIDDEN` (checagem de role no resolver, mesmo padrão de `browseShipments`/`myProposal`)

## Arquitetura (sem mudança em relação ao brief)

Segue 100% o padrão já estabelecido: `Route/Resolver → UseCase(repos, principal, input) → Repository (Prisma)`. Nenhuma biblioteca nova, nenhum padrão novo de estado (React Query + hook client, mesmo formato do `useShipment` do S8-T4).

Nenhuma decisão pendente — pronto pra Plan.
