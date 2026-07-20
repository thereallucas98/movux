import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ReviewRepository, ReviewWithTags } from '../../../repositories/review.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSafetyParticipant } from '../safety/resolve-safety-participant'

export type ListReviewsForShipmentResult =
  | { success: true; reviews: ReviewWithTags[] }
  | { success: false; code: 'NOT_FOUND' }

interface ListReviewsForShipmentRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  reviewRepo: ReviewRepository
}

export async function listReviewsForShipment(
  repos: ListReviewsForShipmentRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
): Promise<ListReviewsForShipmentResult> {
  const participant = await resolveSafetyParticipant(repos, userId, principalRole, shipmentId)
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const reviews = await repos.reviewRepo.findByShipment(shipmentId)

  return { success: true, reviews }
}
