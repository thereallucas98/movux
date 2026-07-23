import type {
  ModifierCode,
  ModifierValueType,
  PrismaClient,
  ShipmentType,
} from '~/generated/prisma/client'

export interface PricingRepository {
  resolveNeighborhood(
    neighborhoodId: string,
  ): Promise<{ name: string; clusterId: string } | null>
  findSnapshotForCorridor(
    originClusterId: string,
    destinationClusterId: string,
    shipmentType: ShipmentType,
  ): Promise<{ basePriceInCents: number } | null>
  findModifiersByCodes(codes: ModifierCode[]): Promise<
    Array<{
      code: ModifierCode
      valueType: ModifierValueType
      valueInCents: number
    }>
  >
}

export function createPricingRepository(
  prisma: PrismaClient,
): PricingRepository {
  return {
    async resolveNeighborhood(neighborhoodId) {
      const neighborhood = await prisma.neighborhood.findUnique({
        where: { id: neighborhoodId },
        select: {
          name: true,
          clusterMemberships: { take: 1, select: { clusterId: true } },
        },
      })
      const clusterId = neighborhood?.clusterMemberships[0]?.clusterId
      if (!neighborhood || !clusterId) return null
      return { name: neighborhood.name, clusterId }
    },

    async findSnapshotForCorridor(
      originClusterId,
      destinationClusterId,
      shipmentType,
    ) {
      const template = await prisma.pricingTemplate.findUnique({
        where: {
          originClusterId_destinationClusterId_shipmentType_vehicleType: {
            originClusterId,
            destinationClusterId,
            shipmentType,
            vehicleType: 'ANY',
          },
        },
        select: { pricingSnapshot: { select: { basePriceInCents: true } } },
      })
      return template?.pricingSnapshot ?? null
    },

    async findModifiersByCodes(codes) {
      if (codes.length === 0) return []
      return prisma.pricingModifier.findMany({
        where: { code: { in: codes }, cityId: null },
        select: { code: true, valueType: true, valueInCents: true },
      })
    },
  }
}
