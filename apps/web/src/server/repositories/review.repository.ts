import type {
  PrismaClient,
  Review,
  ReviewerRole,
  ReviewTagSelection,
} from '~/generated/prisma/client'

export type ReviewWithTags = Review & { tagSelections: ReviewTagSelection[] }

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
}

export function createReviewRepository(prisma: PrismaClient): ReviewRepository {
  return {
    async findByShipment(shipmentId) {
      return prisma.review.findMany({
        where: { shipmentId },
        include: { tagSelections: true },
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
        include: { tagSelections: true },
      })
    },

    async getAverageRatingByReviewee(revieweeId) {
      const result = await prisma.review.aggregate({
        where: { revieweeId },
        _avg: { rating: true },
      })
      return result._avg.rating
    },
  }
}
