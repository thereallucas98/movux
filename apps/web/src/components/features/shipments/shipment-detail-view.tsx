'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { useShipment } from '~/graphql/hooks/use-shipment'
import { formatPriceInCents } from '~/lib/format-price'
import { ShipmentStatusBadge } from './shipment-status-badge'
import { SHIPMENT_TYPE_LABELS, TIME_WINDOW_LABELS } from './shipment-labels'
import { ShipmentTypeIcon } from './shipment-type-icon'

// scheduledDate é uma data pura (@db.Date) — mesmo padrão UTC-anchored já
// usado em shipments-list.tsx.
function formatScheduledDate(isoString: string): string {
  return formatInTimeZone(new Date(isoString), 'UTC', 'dd/MM/yyyy', {
    locale: ptBR,
  })
}

export function ShipmentDetailView({ shipmentId }: { shipmentId: string }) {
  const { data: shipment, isLoading, isError } = useShipment(shipmentId)

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
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">
          {shipment.type ? SHIPMENT_TYPE_LABELS[shipment.type] : 'Frete'}
        </h1>
        {shipment.status && <ShipmentStatusBadge status={shipment.status} />}
      </div>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de preço</CardTitle>
        </CardHeader>
        <CardContent>
          {shipment.finalPriceInCents ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm line-through">
                {formatPriceInCents(shipment.suggestedPriceInCents ?? 0)}
              </p>
              <p className="text-2xl font-bold">
                {formatPriceInCents(shipment.finalPriceInCents)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Preço estimado
              </p>
              <p className="text-2xl font-bold">
                {formatPriceInCents(shipment.suggestedPriceInCents ?? 0)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
