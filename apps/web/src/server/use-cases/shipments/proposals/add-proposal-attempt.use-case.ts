import type {
  ProposalRepository,
  ProposalWithAttempts,
} from '../../../repositories/proposal.repository'

const MAX_ATTEMPTS = 5

export interface AddProposalAttemptInput {
  priceInCents: number
  message?: string
}

export type AddProposalAttemptResult =
  | { success: true; proposal: ProposalWithAttempts }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'TOO_MANY_ATTEMPTS' }

export async function addProposalAttempt(
  proposalRepo: ProposalRepository,
  carrierId: string,
  shipmentId: string,
  input: AddProposalAttemptInput,
): Promise<AddProposalAttemptResult> {
  const proposal = await proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId)
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

  const updated = await proposalRepo.addAttempt(
    proposal.id,
    attemptNumber,
    input.priceInCents,
    expiresAt,
    input.message,
  )

  return { success: true, proposal: updated }
}
