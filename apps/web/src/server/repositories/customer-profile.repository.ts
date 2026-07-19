import type { PrismaClient } from '~/generated/prisma/client'

export interface CustomerProfileRepository {
  findByUserId(userId: string): Promise<{ id: string } | null>
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
  }
}
