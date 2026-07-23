import type { SafetyCheckIn } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { SafetyCheckInRepository } from '../../../repositories/safety-check-in.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSafetyParticipant } from './resolve-safety-participant'

export type GetSafetyCheckInStatusResult =
  | {
      success: true
      customer: SafetyCheckIn | null
      carrier: SafetyCheckIn | null
    }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface GetSafetyCheckInStatusRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  safetyCheckInRepo: SafetyCheckInRepository
}

export async function getSafetyCheckInStatus(
  repos: GetSafetyCheckInStatusRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
): Promise<GetSafetyCheckInStatusResult> {
  const participant = await resolveSafetyParticipant(
    repos,
    userId,
    principalRole,
    shipmentId,
  )
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (participant.status !== 'CARRIER_SELECTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const checkIns = await repos.safetyCheckInRepo.findByShipment(shipmentId)

  return {
    success: true,
    customer: checkIns.find((c) => c.role === 'CUSTOMER') ?? null,
    carrier: checkIns.find((c) => c.role === 'CARRIER') ?? null,
  }
}
