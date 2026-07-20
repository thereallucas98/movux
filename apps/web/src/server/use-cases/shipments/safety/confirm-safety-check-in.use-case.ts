import type { SafetyCheckIn } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { SafetyCheckInRepository } from '../../../repositories/safety-check-in.repository'
import type { ShipmentEventRepository } from '../../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSafetyParticipant } from './resolve-safety-participant'

export type ConfirmSafetyCheckInResult =
  | { success: true; checkIn: SafetyCheckIn }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'ALREADY_CONFIRMED' }

interface ConfirmSafetyCheckInRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  safetyCheckInRepo: SafetyCheckInRepository
  shipmentEventRepo: ShipmentEventRepository
}

export async function confirmSafetyCheckIn(
  repos: ConfirmSafetyCheckInRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
  ipAddress: string | null,
): Promise<ConfirmSafetyCheckInResult> {
  const participant = await resolveSafetyParticipant(repos, userId, principalRole, shipmentId)
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (participant.status !== 'CARRIER_SELECTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const existing = await repos.safetyCheckInRepo.findByShipmentAndRole(
    shipmentId,
    participant.role,
  )
  if (existing) {
    return { success: false, code: 'ALREADY_CONFIRMED' }
  }

  const checkIn = await repos.safetyCheckInRepo.create(
    shipmentId,
    userId,
    participant.role,
    ipAddress,
  )

  const allCheckIns = await repos.safetyCheckInRepo.findByShipment(shipmentId)
  const hasCustomer = allCheckIns.some((c) => c.role === 'CUSTOMER')
  const hasCarrier = allCheckIns.some((c) => c.role === 'CARRIER')
  if (hasCustomer && hasCarrier) {
    await repos.shipmentEventRepo.create(shipmentId, 'SAFETY_CONFIRMED', null)
  }

  return { success: true, checkIn }
}
