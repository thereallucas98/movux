import { builder } from '../builder'
import {
  ShipmentStatusEnum,
  ShipmentTypeEnum,
  TimeWindowEnum,
  VehicleTypeEnum,
} from '../enums/shipment.enum'

export const ShipmentAddressType = builder.simpleObject('ShipmentAddress', {
  fields: (t) => ({
    id: t.id(),
    type: t.string(),
    street: t.string(),
    number: t.string(),
    complement: t.string({ nullable: true }),
    neighborhoodId: t.id(),
    neighborhoodName: t.string(),
    cityId: t.id(),
    state: t.string(),
    zipCode: t.string(),
  }),
})

export const ShipmentType = builder.simpleObject('Shipment', {
  fields: (t) => ({
    id: t.id(),
    status: t.field({ type: ShipmentStatusEnum }),
    type: t.field({ type: ShipmentTypeEnum }),
    description: t.string(),
    estimatedWeightKg: t.float({ nullable: true }),
    estimatedVolumeM3: t.float({ nullable: true }),
    vehicleTypeRequired: t.field({ type: VehicleTypeEnum }),
    scheduledDate: t.field({ type: 'DateTime' }),
    timeWindow: t.field({ type: TimeWindowEnum }),
    specificTime: t.field({ type: 'DateTime', nullable: true }),
    customerSlaHours: t.int(),
    suggestedPriceInCents: t.int(),
    finalPriceInCents: t.int({ nullable: true }),
    addresses: t.field({ type: [ShipmentAddressType] }),
    createdAt: t.field({ type: 'DateTime' }),
  }),
})

export const ShipmentConnectionType = builder.simpleObject(
  'ShipmentConnection',
  {
    fields: (t) => ({
      data: t.field({ type: [ShipmentType] }),
      nextCursor: t.id({ nullable: true }),
    }),
  },
)

/**
 * SimpleObjectsPlugin fields have no `resolve` — Decimal (Prisma) must be
 * converted to a plain number before the object reaches the builder.
 */
export function toGraphQLShipment<
  T extends { estimatedWeightKg: unknown; estimatedVolumeM3: unknown },
>(
  shipment: T,
): Omit<T, 'estimatedWeightKg' | 'estimatedVolumeM3'> & {
  estimatedWeightKg: number | null
  estimatedVolumeM3: number | null
} {
  return {
    ...shipment,
    estimatedWeightKg:
      shipment.estimatedWeightKg === null ||
      shipment.estimatedWeightKg === undefined
        ? null
        : Number(shipment.estimatedWeightKg),
    estimatedVolumeM3:
      shipment.estimatedVolumeM3 === null ||
      shipment.estimatedVolumeM3 === undefined
        ? null
        : Number(shipment.estimatedVolumeM3),
  }
}
