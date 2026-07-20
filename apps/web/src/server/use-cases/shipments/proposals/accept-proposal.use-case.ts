import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentEventRepository } from '../../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { sweepExpiredProposals } from './sweep-expired-proposals'

export type AcceptProposalResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface AcceptProposalRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
  shipmentEventRepo: ShipmentEventRepository
}

export async function acceptProposal(
  repos: AcceptProposalRepos,
  userId: string,
  shipmentId: string,
  proposalId: string,
): Promise<AcceptProposalResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const shipment = await repos.shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'PROPOSALS_RECEIVED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await sweepExpiredProposals(repos.proposalRepo, repos.queueRepo, shipmentId)

  const proposal = await repos.proposalRepo.findByIdForShipment(proposalId, shipmentId)
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (proposal.status !== 'ACTIVE') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const acceptedAttempt = proposal.attempts.find(
    (attempt) => attempt.attemptNumber === proposal.currentAttempt,
  )
  if (!acceptedAttempt) {
    return { success: false, code: 'NOT_FOUND' }
  }

  await repos.proposalRepo.respondToAttempt(proposal.id, proposal.currentAttempt, 'ACCEPTED')
  await repos.proposalRepo.updateStatus(proposal.id, 'ACCEPTED')
  await repos.shipmentRepo.markCarrierSelected(shipmentId, acceptedAttempt.priceInCents)
  await repos.shipmentEventRepo.create(shipmentId, 'CARRIER_SELECTED', userId)

  const others = await repos.proposalRepo.findOtherActiveByShipment(shipmentId, proposal.id)
  for (const other of others) {
    await repos.proposalRepo.respondToAttempt(other.id, other.currentAttempt, 'REJECTED')
    await repos.proposalRepo.updateStatus(other.id, 'REJECTED')
  }

  await repos.queueRepo.exhaustOthers(shipmentId, proposal.queueEntryId)

  return { success: true }
}
