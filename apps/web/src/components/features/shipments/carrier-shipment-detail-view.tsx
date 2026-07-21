'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { ShipmentActionButton } from '~/components/features/proposals/shipment-action-button'
import { useShipmentForCarrier } from '~/graphql/hooks/use-shipment-for-carrier'
import { formatPriceInCents } from '~/lib/format-price'
import { SHIPMENT_TYPE_LABELS, TIME_WINDOW_LABELS } from './shipment-labels'
import { ShipmentTypeIcon } from './shipment-type-icon'

// scheduledDate é uma data pura (@db.Date) — mesmo padrão UTC-anchored já
// usado em shipment-detail-view.tsx (customer, S8-T4).
function formatScheduledDate(isoString: string): string {
  return formatInTimeZone(new Date(isoString), 'UTC', 'dd/MM/yyyy', {
    locale: ptBR,
  })
}

export function CarrierShipmentDetailView({
  shipmentId,
}: {
  shipmentId: string
}) {
  const {
    data: shipment,
    isLoading,
    isError,
  } = useShipmentForCarrier(shipmentId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (isError || !shipment) {
    return (
      <EmptyState
        title="Frete não encontrado"
        description="Verifique o link ou volte pra lista de fretes."
      />
    )
  }

  const origin = shipment.addresses?.find((a) => a?.type === 'ORIGIN')
  const destination = shipment.addresses?.find((a) => a?.type === 'DESTINATION')

  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">
        {shipment.type ? SHIPMENT_TYPE_LABELS[shipment.type] : 'Frete'}
      </h1>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          {shipment.type && <ShipmentTypeIcon type={shipment.type} />}
          <CardTitle className="text-base">Informações gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{shipment.description}</p>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Origem</p>
            <p>
              {origin ? `${origin.neighborhoodName}, ${origin.state}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Destino</p>
            <p>
              {destination
                ? `${destination.neighborhoodName}, ${destination.state}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Data agendada
            </p>
            <p>
              {shipment.scheduledDate &&
                formatScheduledDate(shipment.scheduledDate)}
              {shipment.timeWindow === 'SPECIFIC' && shipment.specificTime
                ? ` · ${shipment.specificTime}`
                : shipment.timeWindow &&
                  ` · ${TIME_WINDOW_LABELS[shipment.timeWindow]}`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Preço sugerido
            </p>
            <p className="text-lg font-semibold">
              {formatPriceInCents(shipment.suggestedPriceInCents ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ação</CardTitle>
        </CardHeader>
        <CardContent>
          {shipment.id && <ShipmentActionButton shipmentId={shipment.id} />}
        </CardContent>
      </Card>
    </div>
  )
}
