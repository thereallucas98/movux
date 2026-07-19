import type {
  ProposalRepository,
  ProposalWithAttempts,
} from '../../../repositories/proposal.repository'

export type GetMyProposalResult =
  | { success: true; proposal: ProposalWithAttempts }
  | { success: false; code: 'NOT_FOUND' }

export async function getMyProposal(
  proposalRepo: ProposalRepository,
  carrierId: string,
  shipmentId: string,
): Promise<GetMyProposalResult> {
  const proposal = await proposalRepo.findByShipmentAndCarrier(shipmentId, carrierId)
  if (!proposal) {
    return { success: false, code: 'NOT_FOUND' }
  }
  return { success: true, proposal }
}
