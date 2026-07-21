import { builder } from '../builder'
import { ShipmentEventTypeEnum } from '../enums/shipment-event.enum'

export const ShipmentEventType = builder.simpleObject('ShipmentEvent', {
  fields: (t) => ({
    id: t.id(),
    eventType: t.field({ type: ShipmentEventTypeEnum }),
    description: t.string(),
    occurredAt: t.field({ type: 'DateTime' }),
  }),
})
