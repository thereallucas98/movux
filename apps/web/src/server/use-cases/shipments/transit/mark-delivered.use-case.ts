import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSelectedCarrier } from './resolve-selected-carrier'

export type MarkDeliveredResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface MarkDeliveredRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
}

export async function markDelivered(
  repos: MarkDeliveredRepos,
  userId: string,
  shipmentId: string,
): Promise<MarkDeliveredResult> {
  const carrier = await resolveSelectedCarrier(repos, userId, shipmentId)
  if (!carrier) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (carrier.status !== 'IN_TRANSIT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.shipmentRepo.updateStatus(shipmentId, 'DELIVERED')

  return { success: true }
}
