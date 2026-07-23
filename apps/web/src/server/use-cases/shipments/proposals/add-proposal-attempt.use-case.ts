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
  | {
      success: false
      code:
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'TOO_MANY_ATTEMPTS'
        | 'ATTEMPT_STILL_PENDING'
    }

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
  if (proposal.currentAttempt >= MAX_ATTEMPTS) {
    return { success: false, code: 'TOO_MANY_ATTEMPTS' }
  }

  // Achado #6 da QA momento-zero: carrier não pode mandar outra tentativa
  // enquanto o cliente ainda não respondeu a atual (`PENDING`) — só depois
  // que ele recusar (vira `REJECTED`) ou a tentativa expirar (o sweep acima
  // já teria avançado `status` pra fora de `ACTIVE` nesse caso).
  const currentAttempt = proposal.attempts.find(
    (attempt) => attempt.attemptNumber === proposal.currentAttempt,
  )
  if (currentAttempt?.responseType === 'PENDING') {
    return { success: false, code: 'ATTEMPT_STILL_PENDING' }
  }

  const attemptNumber = proposal.currentAttempt + 1
  const expiresAt = new Date(
    Date.now() + proposal.agreedSlaHours * 60 * 60 * 1000,
  )

  const updated = await repos.proposalRepo.addAttempt(
    proposal.id,
    attemptNumber,
    input.priceInCents,
    expiresAt,
    input.message,
  )

  return { success: true, proposal: updated }
}
