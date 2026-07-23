import type {
  PrismaClient,
  Review,
  ReviewerRole,
  ReviewTag,
  ReviewTagSelection,
} from '~/generated/prisma/client'

export type ReviewWithTags = Review & {
  tagSelections: (ReviewTagSelection & { tag: ReviewTag })[]
}

export interface CreateReviewInput {
  shipmentId: string
  reviewerId: string
  revieweeId: string
  reviewerRole: ReviewerRole
  rating: number
  tagIds: string[]
}

export interface ReviewRepository {
  findByShipment(shipmentId: string): Promise<ReviewWithTags[]>
  findByShipmentAndRole(
    shipmentId: string,
    reviewerRole: ReviewerRole,
  ): Promise<Review | null>
  create(data: CreateReviewInput): Promise<ReviewWithTags>
  getAverageRatingByReviewee(revieweeId: string): Promise<number | null>
  // Achado #10 da QA momento-zero — badge de "tag mais votada" no perfil,
  // derivado da frequência das tags recebidas, não da média numérica.
  findTopTagByReviewee(
    revieweeId: string,
  ): Promise<{ code: string; label: string } | null>
}

export function createReviewRepository(prisma: PrismaClient): ReviewRepository {
  return {
    async findByShipment(shipmentId) {
      return prisma.review.findMany({
        where: { shipmentId },
        include: { tagSelections: { include: { tag: true } } },
        orderBy: { createdAt: 'asc' },
      })
    },

    async findByShipmentAndRole(shipmentId, reviewerRole) {
      return prisma.review.findUnique({
        where: { shipmentId_reviewerRole: { shipmentId, reviewerRole } },
      })
    },

    async create(data) {
      return prisma.review.create({
        data: {
          shipmentId: data.shipmentId,
          reviewerId: data.reviewerId,
          revieweeId: data.revieweeId,
          reviewerRole: data.reviewerRole,
          rating: data.rating,
          tagSelections: { create: data.tagIds.map((tagId) => ({ tagId })) },
        },
        include: { tagSelections: { include: { tag: true } } },
      })
    },

    async getAverageRatingByReviewee(revieweeId) {
      const result = await prisma.review.aggregate({
        where: { revieweeId },
        _avg: { rating: true },
      })
      return result._avg.rating
    },

    async findTopTagByReviewee(revieweeId) {
      const grouped = await prisma.reviewTagSelection.groupBy({
        by: ['tagId'],
        where: { review: { revieweeId } },
        _count: { tagId: true },
        orderBy: { _count: { tagId: 'desc' } },
        take: 1,
      })
      if (grouped.length === 0) return null
      const tag = await prisma.reviewTag.findUnique({
        where: { id: grouped[0].tagId },
        select: { code: true, label: true },
      })
      return tag ?? null
    },
  }
}
