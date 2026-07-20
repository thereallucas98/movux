import type { PrismaClient, ReviewerRole } from '~/generated/prisma/client'

export interface ReviewTagRepository {
  findByIds(tagIds: string[]): Promise<{ id: string; targetRole: ReviewerRole }[]>
}

export function createReviewTagRepository(prisma: PrismaClient): ReviewTagRepository {
  return {
    async findByIds(tagIds) {
      return prisma.reviewTag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true, targetRole: true },
      })
    },
  }
}
