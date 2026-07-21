import type {
  PrismaClient,
  VerificationStatus,
} from '~/generated/prisma/client'

export interface CarrierProfileRepository {
  updateRating(userId: string, avgRating: number): Promise<void>
  markVerified(userId: string, verifiedBy: string): Promise<void>
  findMetricsByUserId(
    userId: string,
  ): Promise<{ avgRating: number | null; totalShipments: number } | null>
  countFlagged(): Promise<number>
  countActive(): Promise<number>
  countByVerificationStatus(status: VerificationStatus): Promise<number>
}

export function createCarrierProfileRepository(
  prisma: PrismaClient,
): CarrierProfileRepository {
  return {
    async updateRating(userId, avgRating) {
      await prisma.carrierProfile.update({
        where: { userId },
        data: {
          avgRating,
          isFlagged: avgRating < 4.0,
          ...(avgRating < 3.5 ? { isActive: false } : {}),
        },
      })
    },

    async markVerified(userId, verifiedBy) {
      await prisma.carrierProfile.update({
        where: { userId },
        data: {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
          verifiedBy,
        },
      })
    },

    async findMetricsByUserId(userId) {
      const profile = await prisma.carrierProfile.findUnique({
        where: { userId },
        select: { avgRating: true, totalShipments: true },
      })
      if (!profile) return null
      return {
        avgRating: profile.avgRating ? Number(profile.avgRating) : null,
        totalShipments: profile.totalShipments,
      }
    },

    async countFlagged() {
      return prisma.carrierProfile.count({ where: { isFlagged: true } })
    },

    async countActive() {
      return prisma.carrierProfile.count({ where: { isActive: true } })
    },

    async countByVerificationStatus(status) {
      return prisma.carrierProfile.count({
        where: { verificationStatus: status },
      })
    },
  }
}
