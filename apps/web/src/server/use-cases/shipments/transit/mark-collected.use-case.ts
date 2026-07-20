import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { SafetyCheckInRepository } from '../../../repositories/safety-check-in.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSelectedCarrier } from './resolve-selected-carrier'

export type MarkCollectedResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'SAFETY_NOT_CONFIRMED' }

interface MarkCollectedRepos {
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  safetyCheckInRepo: SafetyCheckInRepository
}

export async function markCollected(
  repos: MarkCollectedRepos,
  userId: string,
  shipmentId: string,
): Promise<MarkCollectedResult> {
  const carrier = await resolveSelectedCarrier(repos, userId, shipmentId)
  if (!carrier) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (carrier.status !== 'CARRIER_SELECTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const checkIns = await repos.safetyCheckInRepo.findByShipment(shipmentId)
  const hasCustomer = checkIns.some((c) => c.role === 'CUSTOMER')
  const hasCarrier = checkIns.some((c) => c.role === 'CARRIER')
  if (!hasCustomer || !hasCarrier) {
    return { success: false, code: 'SAFETY_NOT_CONFIRMED' }
  }

  await repos.shipmentRepo.markCollected(shipmentId)

  return { success: true }
}
