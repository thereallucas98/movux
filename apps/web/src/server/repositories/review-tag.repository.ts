import type { PrismaClient, ReviewerRole } from '~/generated/prisma/client'

export interface ReviewTagRepository {
  findByIds(
    tagIds: string[],
  ): Promise<{ id: string; targetRole: ReviewerRole }[]>
  findActiveByTargetRole(
    targetRole: ReviewerRole,
  ): Promise<{ id: string; code: string; label: string }[]>
}

export function createReviewTagRepository(
  prisma: PrismaClient,
): ReviewTagRepository {
  return {
    async findByIds(tagIds) {
      return prisma.reviewTag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true, targetRole: true },
      })
    },

    async findActiveByTargetRole(targetRole) {
      return prisma.reviewTag.findMany({
        where: { targetRole, isActive: true },
        select: { id: true, code: true, label: true },
        orderBy: { label: 'asc' },
      })
    },
  }
}
