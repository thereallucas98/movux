import type { CarrierProfileRepository } from '../../../repositories/carrier-profile.repository'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ReviewTagRepository } from '../../../repositories/review-tag.repository'
import type {
  ReviewRepository,
  ReviewWithTags,
} from '../../../repositories/review.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSafetyParticipant } from '../safety/resolve-safety-participant'

export interface SubmitReviewInput {
  rating: number
  tagIds?: string[]
}

export type SubmitReviewResult =
  | { success: true; review: ReviewWithTags }
  | {
      success: false
      code:
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'ALREADY_REVIEWED'
        | 'VALIDATION_ERROR'
    }

interface SubmitReviewRepos {
  customerProfileRepo: CustomerProfileRepository
  carrierProfileRepo: CarrierProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  reviewRepo: ReviewRepository
  reviewTagRepo: ReviewTagRepository
}

export async function submitReview(
  repos: SubmitReviewRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
  input: SubmitReviewInput,
): Promise<SubmitReviewResult> {
  const participant = await resolveSafetyParticipant(
    repos,
    userId,
    principalRole,
    shipmentId,
  )
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (participant.status !== 'DELIVERED' && participant.status !== 'REVIEWED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const existing = await repos.reviewRepo.findByShipmentAndRole(
    shipmentId,
    participant.role,
  )
  if (existing) {
    return { success: false, code: 'ALREADY_REVIEWED' }
  }

  let revieweeId: string
  if (participant.role === 'CUSTOMER') {
    const accepted = await repos.proposalRepo.findAcceptedByShipment(shipmentId)
    if (!accepted) {
      return { success: false, code: 'NOT_FOUND' }
    }
    revieweeId = accepted.carrierId
  } else {
    const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
    if (!shipment) {
      return { success: false, code: 'NOT_FOUND' }
    }
    const customer = await repos.customerProfileRepo.findUserIdById(
      shipment.customerId,
    )
    if (!customer) {
      return { success: false, code: 'NOT_FOUND' }
    }
    revieweeId = customer.userId
  }

  const tagIds = input.tagIds ?? []
  if (tagIds.length > 0) {
    const targetRole = participant.role === 'CUSTOMER' ? 'CARRIER' : 'CUSTOMER'
    const tags = await repos.reviewTagRepo.findByIds(tagIds)
    if (
      tags.length !== tagIds.length ||
      tags.some((tag) => tag.targetRole !== targetRole)
    ) {
      return { success: false, code: 'VALIDATION_ERROR' }
    }
  }

  const review = await repos.reviewRepo.create({
    shipmentId,
    reviewerId: userId,
    revieweeId,
    reviewerRole: participant.role,
    rating: input.rating,
    tagIds,
  })

  const avg = await repos.reviewRepo.getAverageRatingByReviewee(revieweeId)
  if (avg !== null) {
    const rounded = Math.round(avg * 100) / 100
    if (participant.role === 'CUSTOMER') {
      await repos.carrierProfileRepo.updateRating(revieweeId, rounded)
    } else {
      await repos.customerProfileRepo.updateRating(revieweeId, rounded)
    }
  }

  const allReviews = await repos.reviewRepo.findByShipment(shipmentId)
  const hasCustomer = allReviews.some((r) => r.reviewerRole === 'CUSTOMER')
  const hasCarrier = allReviews.some((r) => r.reviewerRole === 'CARRIER')
  if (hasCustomer && hasCarrier) {
    await repos.shipmentRepo.updateStatus(shipmentId, 'REVIEWED')
  }

  return { success: true, review }
}
