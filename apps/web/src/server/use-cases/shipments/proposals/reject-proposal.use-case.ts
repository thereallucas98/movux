import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentEventRepository } from '../../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { refillCalledGroup } from '../queue/refill-called-group'
import { sweepExpiredProposals } from './sweep-expired-proposals'

const MAX_ATTEMPTS = 5

export type RejectProposalResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface RejectProposalRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
  shipmentEventRepo: ShipmentEventRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function rejectProposal(
  repos: RejectProposalRepos,
  userId: string,
  shipmentId: string,
  proposalId: string,
): Promise<RejectProposalResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const shipment = await repos.shipmentRepo.findStatusForOwner(
    shipmentId,
    customerProfile.id,
  )
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'PROPOSALS_RECEIVED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await sweepExpiredProposals(
    repos.proposalRepo,
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const proposal = await repos.proposalRepo.findByIdForShipment(
    proposalId,
    shipmentId,
  )
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (proposal.status !== 'ACTIVE') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.proposalRepo.respondToAttempt(
    proposal.id,
    proposal.currentAttempt,
    'REJECTED',
  )
  await repos.shipmentEventRepo.create(shipmentId, 'PROPOSAL_REJECTED', userId)

  if (proposal.currentAttempt >= MAX_ATTEMPTS) {
    await repos.proposalRepo.updateStatus(proposal.id, 'REJECTED')
    await repos.queueRepo.updateStatus(proposal.queueEntryId, 'EXHAUSTED')
    await refillCalledGroup(
      repos.queueRepo,
      repos.userRepo,
      repos.notificationLogRepo,
      shipmentId,
    )
  }

  return { success: true }
}
