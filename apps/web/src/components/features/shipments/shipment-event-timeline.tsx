'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useShipmentEvents } from '~/graphql/hooks/use-shipment-events'

function formatEventTimestamp(isoString: string): string {
  return formatInTimeZone(new Date(isoString), 'UTC', "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  })
}

/**
 * Histórico do frete (item #2 do review Metrobi, D-008). Mesma lista/texto
 * pros dois lados — sem filtro por papel, sem ícone por tipo de evento.
 */
export function ShipmentEventTimeline({ shipmentId }: { shipmentId: string }) {
  const { data: events = [] } = useShipmentEvents(shipmentId)

  if (events.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {events.map((event) =>
            event ? (
              <li
                key={event.id}
                className="border-border border-l-2 pl-3 text-sm"
              >
                <p>{event.description}</p>
                <p className="text-muted-foreground text-xs">
                  {event.occurredAt && formatEventTimestamp(event.occurredAt)}
                </p>
              </li>
            ) : null,
          )}
        </ol>
      </CardContent>
    </Card>
  )
}
