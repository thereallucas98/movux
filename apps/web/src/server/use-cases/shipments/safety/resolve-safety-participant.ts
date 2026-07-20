import type { ReviewerRole, ShipmentStatus } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'

interface ResolveSafetyParticipantRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
}

export async function resolveSafetyParticipant(
  repos: ResolveSafetyParticipantRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
): Promise<{ status: ShipmentStatus; role: ReviewerRole } | null> {
  if (principalRole === 'CUSTOMER') {
    const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
    if (!customerProfile) return null

    const shipment = await repos.shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)
    if (!shipment) return null

    return { status: shipment.status, role: 'CUSTOMER' }
  }

  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) return null

  const accepted = await repos.proposalRepo.findAcceptedByShipment(shipmentId)
  if (!accepted || accepted.carrierId !== userId) return null

  return { status: shipment.status, role: 'CARRIER' }
}
