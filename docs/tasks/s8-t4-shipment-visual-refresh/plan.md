# S8-T4 — Plan

## 1. Hook — `graphql/hooks/use-shipment.ts` (novo)

Cópia do padrão de `use-my-shipments.ts`, sem filtro, `id` obrigatório (a query `Shipment($id: ID!)` e o documento gerado já existem desde o `S8-T1`, só nunca tiveram hook):
```ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { ShipmentDocument, type ShipmentQuery, type ShipmentQueryVariables } from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useShipment(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: async () => {
      const result = await graphqlClient.request<ShipmentQuery, ShipmentQueryVariables>(
        ShipmentDocument, { id: shipmentId! },
      )
      return result.shipment ?? null
    },
    enabled: Boolean(shipmentId),
  })
}
```

## 2. Ícone por tipo — `components/features/shipments/shipment-type-icon.tsx` (novo)

```tsx
import { Home, MoreHorizontal, Package, Truck } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ShipmentType } from '~/graphql/generated/types'
import { cn } from '~/lib/utils'

const TYPE_META: Record<ShipmentType, { icon: ComponentType<{ className?: string }>; classes: string }> = {
  RESIDENTIAL_MOVING: { icon: Home, classes: 'bg-blue-light text-blue-dark' },
  COMMERCIAL_FREIGHT: { icon: Truck, classes: 'bg-purple-light text-purple-dark' },
  DELIVERY: { icon: Package, classes: 'bg-orange-light text-orange-dark' },
  OTHER: { icon: MoreHorizontal, classes: 'bg-pink-light text-pink-dark' },
}

export function ShipmentTypeIcon({ type, className }: { type: ShipmentType; className?: string }) {
  const { icon: Icon, classes } = TYPE_META[type]
  return (
    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', classes, className)}>
      <Icon className="size-5" />
    </div>
  )
}
```
Classes escritas por extenso (não montadas com template string) — Tailwind precisa ver a classe literal no código pra não purgar.

## 3. Painel de filtro — `components/features/shipments/shipment-filter-sheet.tsx` (novo)

`AdaptiveDialog` com lista de `checkbox + ShipmentStatusBadge`, estado `pending` só commitado no "Aplicar" (mesmo padrão de `pending` do `AdaptiveDatePicker`):
```tsx
'use client'
import { useEffect, useState } from 'react'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import type { ShipmentStatus } from '~/graphql/generated/types'
import { ShipmentStatusBadge } from './shipment-status-badge'

const FILTERABLE_STATUSES: ShipmentStatus[] = [
  'DRAFT', 'OPEN', 'PROPOSALS_RECEIVED', 'CARRIER_SELECTED', 'COLLECTED',
  'IN_TRANSIT', 'DELIVERED', 'REVIEWED', 'CANCELLED', 'EXPIRED',
]

interface ShipmentFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ShipmentStatus | undefined
  onApply: (status: ShipmentStatus | undefined) => void
}

export function ShipmentFilterSheet({ open, onOpenChange, value, onApply }: ShipmentFilterSheetProps) {
  const [pending, setPending] = useState<ShipmentStatus | undefined>(value)

  useEffect(() => { if (open) setPending(value) }, [open, value])

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Filtrar por status"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button type="button" onClick={() => { onApply(pending); onOpenChange(false) }}>
            Aplicar
          </Button>
          <Button type="button" variant="ghost" onClick={() => { onApply(undefined); onOpenChange(false) }}>
            Limpar filtro
          </Button>
        </div>
      }
    >
      <div className="space-y-1">
        {FILTERABLE_STATUSES.map((status) => (
          <label key={status} className="hover:bg-muted flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2">
            <input
              type="checkbox"
              checked={pending === status}
              onChange={() => setPending(pending === status ? undefined : status)}
              className="accent-primary size-4"
            />
            <ShipmentStatusBadge status={status} />
          </label>
        ))}
      </div>
    </AdaptiveDialog>
  )
}
```

## 4. Card de detalhe — `components/features/shipments/shipment-detail-view.tsx` (novo)

Componente client, dono do próprio fetch (`useShipment(shipmentId)`) — página fica fina. Estrutura: header (ícone+título+`ShipmentStatusBadge`) fora dos cards, depois 2 `Card`: "Informações gerais" (descrição, origem, destino, data+janela) e "Resumo de preço" (sugerido riscado + final quando existir, senão só sugerido). Reaproveita `formatScheduledDate` (mesmo padrão UTC-anchored de `shipments-list.tsx`) e `formatPriceInCents`. Trata `isLoading`/`isError`/`!shipment` com `Skeleton`/`EmptyState` já existentes.

## 5. Página — `app/customer/shipments/[shipmentId]/page.tsx` (novo)

Server component fino (Next 16 `params` como `Promise`), só lê `shipmentId` e monta o link de voltar + `<ShipmentDetailView shipmentId={shipmentId} />`:
```tsx
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ShipmentDetailView } from '~/components/features/shipments/shipment-detail-view'

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>
}) {
  const { shipmentId } = await params
  return (
    <div className="space-y-4">
      <Link href="/customer/shipments" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <ShipmentDetailView shipmentId={shipmentId} />
    </div>
  )
}
```

## 6. Lista — `components/features/shipments/shipments-list.tsx` (modificado)

- Adiciona estado `status` (local, `useState<ShipmentStatus | undefined>`) + botão de filtro (ícone) ao lado da lista, abrindo `ShipmentFilterSheet`
- Passa `status` pro `useMyShipments({ status, limit })` (hook já aceita, só nunca foi usado)
- Cada linha/card ganha `<ShipmentTypeIcon type={shipment.type} />` à esquerda do título
- Cada linha/card vira um `Link` pra `/customer/shipments/${shipment.id}` (mobile: `Card` inteiro clicável; desktop: `TableRow` com `onClick`/link wrapper)

## 7. Documentação — `docs/DESIGN-SYSTEM.md`

Registrar os 2 padrões novos validados nesta rodada: "ícone circular por categoria" (paleta `{cor}-light`/`{cor}-dark`, um card = uma cor) e "painel de filtro" (checkbox+pílula, seleção única quando a API só aceita 1 valor, rodapé Aplicar/Limpar).

## Ordem de execução (sub-steps)

1. `use-shipment.ts` (hook, depende só do que já existe)
2. `shipment-type-icon.tsx` (sem dependência)
3. `shipment-filter-sheet.tsx` (depende de `ShipmentStatusBadge`, já existe)
4. `shipment-detail-view.tsx` (depende de 1 e 2)
5. `app/customer/shipments/[shipmentId]/page.tsx` (depende de 4)
6. `shipments-list.tsx` (depende de 2 e 3)
7. `docs/DESIGN-SYSTEM.md`
8. Lint/typecheck escopo isolado + QA manual no navegador (lista, filtro, detalhe, responsivo)
