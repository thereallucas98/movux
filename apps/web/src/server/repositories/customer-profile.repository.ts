import type { PrismaClient } from '~/generated/prisma/client'

export interface CustomerProfileRepository {
  findByUserId(userId: string): Promise<{ id: string } | null>
  findUserIdById(id: string): Promise<{ userId: string } | null>
  updateRating(userId: string, avgRating: number): Promise<void>
  findMetricsByUserId(
    userId: string,
  ): Promise<{ avgRating: number | null; totalShipments: number } | null>
}

export function createCustomerProfileRepository(
  prisma: PrismaClient,
): CustomerProfileRepository {
  return {
    async findByUserId(userId) {
      return prisma.customerProfile.findUnique({
        where: { userId },
        select: { id: true },
      })
    },

    async findUserIdById(id) {
      return prisma.customerProfile.findUnique({
        where: { id },
        select: { userId: true },
      })
    },

    async updateRating(userId, avgRating) {
      await prisma.customerProfile.update({
        where: { userId },
        data: { avgRating },
      })
    },

    async findMetricsByUserId(userId) {
      const profile = await prisma.customerProfile.findUnique({
        where: { userId },
        select: { avgRating: true, totalShipments: true },
      })
      if (!profile) return null
      return {
        avgRating: profile.avgRating ? Number(profile.avgRating) : null,
        totalShipments: profile.totalShipments,
      }
    },
  }
}
