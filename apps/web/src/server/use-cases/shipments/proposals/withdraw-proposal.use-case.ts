import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { refillCalledGroup } from '../queue/refill-called-group'
import { sweepExpiredProposals } from './sweep-expired-proposals'

export type WithdrawProposalResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface WithdrawProposalRepos {
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function withdrawProposal(
  repos: WithdrawProposalRepos,
  carrierId: string,
  shipmentId: string,
): Promise<WithdrawProposalResult> {
  await sweepExpiredProposals(
    repos.proposalRepo,
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const proposal = await repos.proposalRepo.findByShipmentAndCarrier(
    shipmentId,
    carrierId,
  )
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (proposal.status !== 'ACTIVE') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.proposalRepo.updateStatus(proposal.id, 'WITHDRAWN')
  await repos.queueRepo.updateStatus(proposal.queueEntryId, 'WITHDRAWN')
  await refillCalledGroup(
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  return { success: true }
}
