# S8-T5 — Plan

## 1. Repo — `server/repositories/shipment.repository.ts` (modificado)

Novo método na interface `ShipmentRepository` + implementação, sem scoping de owner (paralelo a `findByIdForOwner`, mesmo shape de retorno `ShipmentWithDetails`):
```ts
// na interface
findById(id: string): Promise<ShipmentWithDetails | null>

// na implementação
async findById(id) {
  return prisma.shipment.findUnique({
    where: { id },
    include: { addresses: true, modifiers: true },
  })
},
```

## 2. Use-case — `server/use-cases/shipments/get-shipment-for-carrier.use-case.ts` (novo)

```ts
import type { ProposalQueueRepository } from '../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../repositories/proposal.repository'
import type { ShipmentRepository, ShipmentWithDetails } from '../../repositories/shipment.repository'

export type GetShipmentForCarrierResult =
  | { success: true; shipment: ShipmentWithDetails }
  | { success: false; code: 'NOT_FOUND' }

interface GetShipmentForCarrierRepos {
  shipmentRepo: ShipmentRepository
  queueRepo: ProposalQueueRepository
  proposalRepo: ProposalRepository
}

export async function getShipmentForCarrier(
  repos: GetShipmentForCarrierRepos,
  carrierId: string,
  shipmentId: string,
): Promise<GetShipmentForCarrierResult> {
  const shipment = await repos.shipmentRepo.findById(shipmentId)
  if (!shipment) return { success: false, code: 'NOT_FOUND' }

  if (shipment.status === 'OPEN') {
    return { success: true, shipment }
  }

  const [queueEntry, proposal] = await Promise.all([
    repos.queueRepo.findByShipmentAndCarrier(shipmentId, carrierId),
    repos.proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId),
  ])
  if (!queueEntry && !proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }

  return { success: true, shipment }
}
```
Mesmo formato de discriminated union dos outros use-cases (`success: true/false` + `code`), único código de erro (`NOT_FOUND`), sem diferenciar "não existe" de "não é seu" (decisão da Research).

## 3. Resolver — `server/graphql/queries/shipments.query.ts` (modificado)

Novo `queryField`, mesmo arquivo dos outros dois de `Shipment`, checagem de role igual à de `browseShipments`:
```ts
import { getShipment, getShipmentForCarrier, listShipmentsForCustomer } from '~/server/use-cases'
// ...
builder.queryField('shipmentForCarrier', (t) =>
  t.field({
    type: ShipmentType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await getShipmentForCarrier(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          proposalRepo: ctx.repos.proposalRepo,
        },
        ctx.principal.userId,
        String(args.id),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return toGraphQLShipment(result.shipment)
    },
  }),
)
```
Exportar `getShipmentForCarrier` em `server/use-cases/index.ts` (mesmo padrão dos outros use-cases de shipment).

## 4. Codegen

Rodar `pnpm codegen` depois do passo 3 pra gerar `ShipmentForCarrierDocument`/`ShipmentForCarrierQuery`/`ShipmentForCarrierQueryVariables` em `graphql/generated/types` — sem escrever `.graphql` novo à mão além do operation file (`graphql/operations/shipment-for-carrier.graphql`, mesmo padrão dos outros).

## 5. Hook — `graphql/hooks/use-shipment-for-carrier.ts` (novo)

Cópia do padrão de `use-shipment.ts` (S8-T4), já com `meta: { silent: true }` desde o início (aprendizado do S8-T4 — o componente vai tratar o próprio erro):
```ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { ShipmentForCarrierDocument, type ShipmentForCarrierQuery, type ShipmentForCarrierQueryVariables } from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useShipmentForCarrier(id: string) {
  return useQuery({
    queryKey: ['shipment-for-carrier', id],
    queryFn: async () => {
      const result = await graphqlClient.request<ShipmentForCarrierQuery, ShipmentForCarrierQueryVariables>(
        ShipmentForCarrierDocument, { id },
      )
      return result.shipmentForCarrier ?? null
    },
    enabled: Boolean(id),
    meta: { silent: true },
  })
}
```

## 6. Card de detalhe — `components/features/shipments/carrier-shipment-detail-view.tsx` (novo)

Mesma estrutura do `ShipmentDetailView` do customer (header + card "Informações gerais"), **sem** o card de "Resumo de preço" fixo (o preço/ação já é o `ShipmentActionButton`) — substitui por um card "Ação" que embute `<ShipmentActionButton shipmentId={shipmentId} />`. Reaproveita `ShipmentTypeIcon`, `SHIPMENT_TYPE_LABELS`, `TIME_WINDOW_LABELS`, `formatPriceInCents` (preço sugerido, mostrado só como referência dentro do card de info).

## 7. Página — `app/carrier/shipments/[shipmentId]/page.tsx` (novo)

Idêntico ao padrão do S8-T4 (server component fino, `params` como `Promise`), link de volta pra `/carrier/shipments`.

## 8. Card clicável + ícone — `components/features/shipments/browse-shipment-card.tsx` (modificado)

- `ShipmentTypeIcon` no `CardHeader`, ao lado do tipo
- `Card` vira wrapper com `onClick={() => router.push(...)}` (`useRouter` de `next/navigation`, mesmo padrão da tabela desktop do S8-T4) + `cursor-pointer hover:border-primary`
- `CardFooter` (onde mora `ShipmentActionButton`) ganha `onClick={(e) => e.stopPropagation()}` pra não disparar a navegação do card ao interagir com o botão/dialog

## 9. Card clicável + ícone — `components/features/proposals/my-proposals-list.tsx` (modificado)

Mesmo tratamento do passo 8: `ShipmentTypeIcon` no header, `Card` clicável (`router.push` pro `entry.shipment.id`), `CardFooter` com `stopPropagation`.

## 10. Documentação

Sem novo padrão visual (reaproveita 100% do que o S8-T4 já documentou) — não precisa mexer em `docs/DESIGN-SYSTEM.md`.

---

## Ordem de execução (sub-steps)

1. `shipment.repository.ts` — método `findById`
2. `get-shipment-for-carrier.use-case.ts` (depende de 1) + export em `use-cases/index.ts`
3. `shipments.query.ts` — resolver `shipmentForCarrier` (depende de 2)
4. `graphql/operations/shipment-for-carrier.graphql` + `pnpm codegen` (depende de 3)
5. `use-shipment-for-carrier.ts` (depende de 4)
6. `carrier-shipment-detail-view.tsx` (depende de 5)
7. `app/carrier/shipments/[shipmentId]/page.tsx` (depende de 6)
8. `browse-shipment-card.tsx` — ícone + clicável + stopPropagation
9. `my-proposals-list.tsx` — ícone + clicável + stopPropagation
10. Lint/typecheck escopo isolado + QA manual (browse, propostas, detalhe nos dois casos de permissão, dashboard, stopPropagation, 375px/desktop, 2 contas carrier pra confirmar isolamento)

## Test Strategy (detalhe)

- **Backend**: testar `shipmentForCarrier` via GraphiQL/navegador com 3 cenários — (a) frete `OPEN` de outro customer, carrier nunca interagiu → sucesso; (b) frete `CARRIER_SELECTED` onde o carrier logado é o selecionado (tem proposta) → sucesso; (c) frete não-`OPEN` sem fila/proposta do carrier logado (usar 2 contas carrier) → `NOT_FOUND`.
- **UI**: click no card fora do botão → navega; click no botão de ação → abre dialog, não navega; detalhe mostra ação correta pro estado real; responsivo 375px/desktop; dashboard do carrier já reflete ícone sem trabalho extra (verificar, não implementar).
