import { builder } from '../builder'

export const ShipmentEventTypeEnum = builder.enumType('ShipmentEventType', {
  values: [
    'PUBLISHED',
    'CARRIER_CALLED',
    'PROPOSAL_RECEIVED',
    'PROPOSAL_REJECTED',
    'CARRIER_SELECTED',
    'SAFETY_CONFIRMED',
    'COLLECTED',
    'IN_TRANSIT',
    'DELIVERED',
    'WINDOW_ALERT',
    'CANCELLED',
    'EXPIRED',
  ] as const,
})
