import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import { refillCalledGroup } from '../queue/refill-called-group'

export type WithdrawProposalResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface WithdrawProposalRepos {
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
}

export async function withdrawProposal(
  repos: WithdrawProposalRepos,
  carrierId: string,
  shipmentId: string,
): Promise<WithdrawProposalResult> {
  const proposal = await repos.proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (proposal.status !== 'ACTIVE') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.proposalRepo.updateStatus(proposal.id, 'WITHDRAWN')
  await repos.queueRepo.updateStatus(proposal.queueEntryId, 'WITHDRAWN')
  await refillCalledGroup(repos.queueRepo, shipmentId)

  return { success: true }
}
