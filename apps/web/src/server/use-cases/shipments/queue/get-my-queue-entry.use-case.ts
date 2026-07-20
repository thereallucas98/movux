import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository, QueueEntry } from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { sweepExpiredProposals } from '../proposals/sweep-expired-proposals'

export type GetMyQueueEntryResult =
  | { success: true; entry: QueueEntry }
  | { success: false; code: 'NOT_FOUND' }

interface GetMyQueueEntryRepos {
  queueRepo: ProposalQueueRepository
  proposalRepo: ProposalRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function getMyQueueEntry(
  repos: GetMyQueueEntryRepos,
  carrierId: string,
  shipmentId: string,
): Promise<GetMyQueueEntryResult> {
  await sweepExpiredProposals(
    repos.proposalRepo,
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const entry = await repos.queueRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!entry) {
    return { success: false, code: 'NOT_FOUND' }
  }
  return { success: true, entry }
}
