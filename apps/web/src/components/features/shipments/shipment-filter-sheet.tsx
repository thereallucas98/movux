'use client'

import { useEffect, useState } from 'react'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import type { ShipmentStatus } from '~/graphql/generated/types'
import { ShipmentStatusBadge } from './shipment-status-badge'

const FILTERABLE_STATUSES: ShipmentStatus[] = [
  'DRAFT',
  'OPEN',
  'PROPOSALS_RECEIVED',
  'CARRIER_SELECTED',
  'COLLECTED',
  'IN_TRANSIT',
  'DELIVERED',
  'REVIEWED',
  'CANCELLED',
  'EXPIRED',
]

interface ShipmentFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ShipmentStatus | undefined
  onApply: (status: ShipmentStatus | undefined) => void
}

/**
 * Visual de checkbox+pílula por opção (padrão da referência), mas seleção
 * única — `myShipments(status)` só aceita 1 valor. Marcar uma opção
 * desmarca a anterior automaticamente.
 */
export function ShipmentFilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
}: ShipmentFilterSheetProps) {
  const [pending, setPending] = useState<ShipmentStatus | undefined>(value)

  useEffect(() => {
    if (open) setPending(value)
  }, [open, value])

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Filtrar por status"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="button"
            onClick={() => {
              onApply(pending)
              onOpenChange(false)
            }}
          >
            Aplicar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onApply(undefined)
              onOpenChange(false)
            }}
          >
            Limpar filtro
          </Button>
        </div>
      }
    >
      <div className="space-y-1">
        {FILTERABLE_STATUSES.map((status) => (
          <label
            key={status}
            className="hover:bg-muted flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2"
          >
            <input
              type="checkbox"
              checked={pending === status}
              onChange={() =>
                setPending((current) =>
                  current === status ? undefined : status,
                )
              }
              className="accent-primary size-4"
            />
            <ShipmentStatusBadge status={status} />
          </label>
        ))}
      </div>
    </AdaptiveDialog>
  )
}
