import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentEventRepository } from '../../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSelectedCarrier } from './resolve-selected-carrier'

export type MarkDeliveredResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface MarkDeliveredRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  shipmentEventRepo: ShipmentEventRepository
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

  await repos.shipmentRepo.markDelivered(shipmentId)
  await repos.shipmentEventRepo.create(shipmentId, 'DELIVERED', userId)

  return { success: true }
}
