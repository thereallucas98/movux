import { builder } from '../builder'
import { ShipmentTypeEnum, TimeWindowEnum } from '../enums/shipment.enum'

export const BrowseAddressType = builder.simpleObject('BrowseAddress', {
  fields: (t) => ({
    type: t.string(),
    neighborhoodName: t.string(),
    cityId: t.id(),
    state: t.string(),
  }),
})

export const BrowseShipmentType = builder.simpleObject('BrowseShipment', {
  fields: (t) => ({
    id: t.id(),
    type: t.field({ type: ShipmentTypeEnum }),
    description: t.string(),
    estimatedWeightKg: t.float({ nullable: true }),
    estimatedVolumeM3: t.float({ nullable: true }),
    requiredCategoryId: t.id({ nullable: true }),
    scheduledDate: t.field({ type: 'DateTime' }),
    timeWindow: t.field({ type: TimeWindowEnum }),
    specificTime: t.field({ type: 'DateTime', nullable: true }),
    suggestedPriceInCents: t.int(),
    customerSlaHours: t.int(),
    createdAt: t.field({ type: 'DateTime' }),
    addresses: t.field({ type: [BrowseAddressType] }),
  }),
})

export const BrowseShipmentConnectionType = builder.simpleObject(
  'BrowseShipmentConnection',
  {
    fields: (t) => ({
      data: t.field({ type: [BrowseShipmentType] }),
      nextCursor: t.id({ nullable: true }),
    }),
  },
)

/**
 * SimpleObjectsPlugin fields have no `resolve` — Decimal (Prisma) must be
 * converted to a plain number before the object reaches the builder.
 */
export function toGraphQLBrowseShipment<
  T extends { estimatedWeightKg: unknown; estimatedVolumeM3: unknown },
>(
  item: T,
): Omit<T, 'estimatedWeightKg' | 'estimatedVolumeM3'> & {
  estimatedWeightKg: number | null
  estimatedVolumeM3: number | null
} {
  return {
    ...item,
    estimatedWeightKg:
      item.estimatedWeightKg === null || item.estimatedWeightKg === undefined
        ? null
        : Number(item.estimatedWeightKg),
    estimatedVolumeM3:
      item.estimatedVolumeM3 === null || item.estimatedVolumeM3 === undefined
        ? null
        : Number(item.estimatedVolumeM3),
  }
}
