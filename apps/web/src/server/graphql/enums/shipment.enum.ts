import { builder } from '../builder'

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

export const VehicleTypeEnum = builder.enumType('VehicleType', {
  values: ['ANY', 'MOTORCYCLE', 'VAN', 'TRUCK_SMALL', 'TRUCK_LARGE'] as const,
})

export const TimeWindowEnum = builder.enumType('TimeWindow', {
  values: ['MORNING', 'AFTERNOON', 'EVENING', 'SPECIFIC'] as const,
})
