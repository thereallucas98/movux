'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { ShipmentActionButton } from '~/components/features/proposals/shipment-action-button'
import type { BrowseShipmentsQuery } from '~/graphql/generated/types'
import { formatPriceInCents } from '~/lib/format-price'
import { SHIPMENT_TYPE_LABELS, TIME_WINDOW_LABELS } from './shipment-labels'
import { ShipmentTypeIcon } from './shipment-type-icon'

type BrowseShipmentItem = NonNullable<
  NonNullable<BrowseShipmentsQuery['browseShipments']>['data']
>[number]

// scheduledDate é uma data pura (@db.Date), sempre serializada como meia-noite
// UTC — formatar com o fuso local (ex.: -03:00) volta um dia. Lê os
// componentes da data em UTC, não no fuso do navegador (mesmo padrão da
// lista do customer, S8-T1).
function formatScheduledDate(isoString: string): string {
  return formatInTimeZone(new Date(isoString), 'UTC', 'dd/MM/yyyy', {
    locale: ptBR,
  })
}

export function BrowseShipmentCard({
  shipment,
}: {
  shipment: BrowseShipmentItem
}) {
  const router = useRouter()
  const origin = shipment.addresses?.find((a) => a?.type === 'ORIGIN')
  const destination = shipment.addresses?.find((a) => a?.type === 'DESTINATION')

  return (
    <Card
      className="hover:border-primary cursor-pointer transition-colors"
      onClick={() =>
        shipment.id && router.push(`/carrier/shipments/${shipment.id}`)
      }
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {shipment.type && <ShipmentTypeIcon type={shipment.type} />}
          <CardTitle className="text-base">
            {shipment.type ? SHIPMENT_TYPE_LABELS[shipment.type] : '—'}
          </CardTitle>
        </div>
        <span className="font-semibold">
          {formatPriceInCents(shipment.suggestedPriceInCents ?? 0)}
        </span>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{shipment.description}</p>
        <p>
          {origin?.neighborhoodName ?? '—'} →{' '}
          {destination?.neighborhoodName ?? '—'}
        </p>
        <p>
          {shipment.scheduledDate &&
            formatScheduledDate(shipment.scheduledDate)}
          {shipment.timeWindow &&
            ` · ${TIME_WINDOW_LABELS[shipment.timeWindow]}`}
        </p>
      </CardContent>
      {shipment.id && (
        <CardFooter onClick={(e) => e.stopPropagation()}>
          <ShipmentActionButton shipmentId={shipment.id} />
        </CardFooter>
      )}
    </Card>
  )
}
