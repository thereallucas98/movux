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
  findContactInfoByUserId(
    userId: string,
  ): Promise<{ phone: string; avgRating: number | null } | null>
  countFlagged(): Promise<number>
  countActive(): Promise<number>
  countByVerificationStatus(status: VerificationStatus): Promise<number>
  findEligiblePublicProfiles(
    userIds: string[],
  ): Promise<
    Array<{ userId: string; fullName: string; avgRating: number | null }>
  >
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

    async findContactInfoByUserId(userId) {
      const profile = await prisma.carrierProfile.findUnique({
        where: { userId },
        select: { phone: true, avgRating: true },
      })
      if (!profile) return null
      return {
        phone: profile.phone,
        avgRating: profile.avgRating ? Number(profile.avgRating) : null,
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

    // Busca pública (S9-T3) — só carriers aprovados/ativos/não sinalizados
    // entram na vitrine; totalShipments do CarrierProfile fica de fora
    // deliberadamente (campo nunca atualizado, sempre 0 — ver comentário em
    // shipment.repository.ts) e é recalculado pelo use-case via shipmentRepo.
    async findEligiblePublicProfiles(userIds) {
      if (userIds.length === 0) return []
      const profiles = await prisma.carrierProfile.findMany({
        where: {
          userId: { in: userIds },
          verificationStatus: 'APPROVED',
          isActive: true,
          isFlagged: false,
        },
        include: { user: { select: { fullName: true } } },
      })
      return profiles.map((profile) => ({
        userId: profile.userId,
        fullName: profile.user.fullName,
        avgRating: profile.avgRating ? Number(profile.avgRating) : null,
      }))
    },
  }
}
