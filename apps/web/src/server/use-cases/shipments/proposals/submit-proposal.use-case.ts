import type { ProposalQueueRepository } from '../../../repositories/proposal-queue.repository'
import type {
  ProposalRepository,
  ProposalWithAttempts,
} from '../../../repositories/proposal.repository'
import type { ShipmentEventRepository } from '../../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { refillCalledGroup } from '../queue/refill-called-group'
import { sweepExpiredProposals } from './sweep-expired-proposals'

export interface SubmitProposalInput {
  priceInCents: number
  carrierSlaHours: number
  message?: string
}

export type SubmitProposalResult =
  | { success: true; proposal: ProposalWithAttempts }
  | {
      success: false
      code: 'NOT_FOUND' | 'NOT_CALLED' | 'ALREADY_PROPOSED' | 'INVALID_STATE_TRANSITION'
    }

interface SubmitProposalRepos {
  shipmentRepo: ShipmentRepository
  queueRepo: ProposalQueueRepository
  proposalRepo: ProposalRepository
  shipmentEventRepo: ShipmentEventRepository
}

export async function submitProposal(
  repos: SubmitProposalRepos,
  carrierId: string,
  shipmentId: string,
  input: SubmitProposalInput,
): Promise<SubmitProposalResult> {
  await sweepExpiredProposals(repos.proposalRepo, repos.queueRepo, shipmentId)

  const shipment = await repos.shipmentRepo.findForProposal(shipmentId)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'OPEN' && shipment.status !== 'PROPOSALS_RECEIVED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const queueEntry = await repos.queueRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!queueEntry || queueEntry.status !== 'CALLED') {
    return { success: false, code: 'NOT_CALLED' }
  }

  const existing = await repos.proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (existing) {
    return { success: false, code: 'ALREADY_PROPOSED' }
  }

  const agreedSlaHours = Math.ceil((shipment.customerSlaHours + input.carrierSlaHours) / 2)
  const expiresAt = new Date(Date.now() + agreedSlaHours * 60 * 60 * 1000)

  const proposal = await repos.proposalRepo.create({
    shipmentId,
    carrierId,
    queueEntryId: queueEntry.id,
    customerSlaHours: shipment.customerSlaHours,
    carrierSlaHours: input.carrierSlaHours,
    agreedSlaHours,
    expiresAt,
    priceInCents: input.priceInCents,
    message: input.message,
  })

  await repos.queueRepo.updateStatus(queueEntry.id, 'ACTIVE')
  await refillCalledGroup(repos.queueRepo, shipmentId)

  if (shipment.status === 'OPEN') {
    await repos.shipmentRepo.updateStatus(shipmentId, 'PROPOSALS_RECEIVED')
  }

  await repos.shipmentEventRepo.create(shipmentId, 'PROPOSAL_RECEIVED', carrierId, {
    proposalId: proposal.id,
  })

  return { success: true, proposal }
}
