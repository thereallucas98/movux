import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSelectedCarrier } from './resolve-selected-carrier'

export type MarkInTransitResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface MarkInTransitRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
}

export async function markInTransit(
  repos: MarkInTransitRepos,
  userId: string,
  shipmentId: string,
): Promise<MarkInTransitResult> {
  const carrier = await resolveSelectedCarrier(repos, userId, shipmentId)
  if (!carrier) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (carrier.status !== 'COLLECTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.shipmentRepo.markInTransit(shipmentId)

  return { success: true }
}
