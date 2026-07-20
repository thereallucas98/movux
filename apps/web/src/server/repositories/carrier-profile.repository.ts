import type { PrismaClient } from '~/generated/prisma/client'

export interface CarrierProfileRepository {
  updateRating(userId: string, avgRating: number): Promise<void>
  markVerified(userId: string, verifiedBy: string): Promise<void>
}

export function createCarrierProfileRepository(prisma: PrismaClient): CarrierProfileRepository {
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
        data: { verificationStatus: 'APPROVED', verifiedAt: new Date(), verifiedBy },
      })
    },
  }
}
