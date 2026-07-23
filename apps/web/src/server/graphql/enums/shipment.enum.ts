import { builder } from '../builder'

export const EtaStageEnum = builder.enumType('EtaStage', {
  values: ['COLLECTION', 'DELIVERY'] as const,
})

export const ShipmentStatusEnum = builder.enumType('ShipmentStatus', {
  values: [
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
  ] as const,
})

export const ShipmentTypeEnum = builder.enumType('ShipmentType', {
  values: [
    'RESIDENTIAL_MOVING',
    'COMMERCIAL_FREIGHT',
    'DELIVERY',
    'OTHER',
  ] as const,
})

export const TimeWindowEnum = builder.enumType('TimeWindow', {
  values: ['MORNING', 'AFTERNOON', 'EVENING', 'SPECIFIC'] as const,
})
