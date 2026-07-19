import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type {
  ProposalRepository,
  ProposalWithAttempts,
} from '../../../repositories/proposal.repository'
import { sweepExpiredProposals } from './sweep-expired-proposals'

export type GetMyProposalResult =
  | { success: true; proposal: ProposalWithAttempts }
  | { success: false; code: 'NOT_FOUND' }

interface GetMyProposalRepos {
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
}

export async function getMyProposal(
  repos: GetMyProposalRepos,
  carrierId: string,
  shipmentId: string,
): Promise<GetMyProposalResult> {
  await sweepExpiredProposals(repos.proposalRepo, repos.queueRepo, shipmentId)

  const proposal = await repos.proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  return { success: true, proposal }
}
