import type { NotificationLogRepository } from '../../../repositories/notification-log.repository'
import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type {
  ProposalRepository,
  ProposalWithAttempts,
} from '../../../repositories/proposal.repository'
import type { UserRepository } from '../../../repositories/user.repository'
import { sweepExpiredProposals } from './sweep-expired-proposals'

const MAX_ATTEMPTS = 5

export interface AddProposalAttemptInput {
  priceInCents: number
  message?: string
}

export type AddProposalAttemptResult =
  | { success: true; proposal: ProposalWithAttempts }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'TOO_MANY_ATTEMPTS' }

interface AddProposalAttemptRepos {
  proposalRepo: ProposalRepository
  queueRepo: ProposalQueueRepository
  userRepo: UserRepository
  notificationLogRepo: NotificationLogRepository
}

export async function addProposalAttempt(
  repos: AddProposalAttemptRepos,
  carrierId: string,
  shipmentId: string,
  input: AddProposalAttemptInput,
): Promise<AddProposalAttemptResult> {
  await sweepExpiredProposals(
    repos.proposalRepo,
    repos.queueRepo,
    repos.userRepo,
    repos.notificationLogRepo,
    shipmentId,
  )

  const proposal = await repos.proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (proposal.status !== 'ACTIVE') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }
  if (proposal.currentAttempt >= MAX_ATTEMPTS) {
    return { success: false, code: 'TOO_MANY_ATTEMPTS' }
  }

  const attemptNumber = proposal.currentAttempt + 1
  const expiresAt = new Date(Date.now() + proposal.agreedSlaHours * 60 * 60 * 1000)

  const updated = await repos.proposalRepo.addAttempt(
    proposal.id,
    attemptNumber,
    input.priceInCents,
    expiresAt,
    input.message,
  )

  return { success: true, proposal: updated }
}
