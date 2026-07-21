import type { PrismaClient, VehicleType } from '~/generated/prisma/client'

export interface VehicleRepository {
  findActiveTypeByOwnerId(ownerId: string): Promise<VehicleType | null>
}

export function createVehicleRepository(
  prisma: PrismaClient,
): VehicleRepository {
  return {
    async findActiveTypeByOwnerId(ownerId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { ownerId, isActive: true },
        select: { type: true },
      })
      return vehicle?.type ?? null
    },
  }
}
