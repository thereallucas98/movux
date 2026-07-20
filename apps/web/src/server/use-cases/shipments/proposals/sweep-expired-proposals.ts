import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { refillCalledGroup } from '../queue/refill-called-group'

/**
 * Lazy expiration — no background job exists yet. Called at the start of
 * every proposal/queue read-or-write use-case for a shipment, so stale
 * ACTIVE proposals never linger past their expiresAt for long. Uniformly
 * moves the queue entry to EXHAUSTED (same terminal state as a 5th rejected
 * attempt) — there's no "automatic next attempt", since a new attempt
 * requires the carrier's own price input.
 */
export async function sweepExpiredProposals(
  proposalRepo: ProposalRepository,
  queueRepo: ProposalQueueRepository,
  userRepo: UserRepository,
  notificationLogRepo: NotificationLogRepository,
  shipmentId: string,
): Promise<void> {
  const expired = await proposalRepo.findExpiredActiveByShipment(shipmentId)
  if (expired.length === 0) return

  for (const proposal of expired) {
    await proposalRepo.updateStatus(proposal.id, 'EXPIRED')
    await queueRepo.updateStatus(proposal.queueEntryId, 'EXHAUSTED')
  }

  await refillCalledGroup(queueRepo, userRepo, notificationLogRepo, shipmentId)
}
