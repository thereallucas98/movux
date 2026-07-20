import type { DeliveryConfirmation } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { DeliveryConfirmationRepository } from '../../../repositories/delivery-confirmation.repository'
import type { ProposalRepository } from '../../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { resolveSafetyParticipant } from '../safety/resolve-safety-participant'
import { sweepAutoConfirmDelivery } from './sweep-auto-confirm-delivery'

export type GetDeliveryConfirmationStatusResult =
  | { success: true; confirmation: DeliveryConfirmation | null }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface GetDeliveryConfirmationStatusRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  proposalRepo: ProposalRepository
  deliveryConfirmationRepo: DeliveryConfirmationRepository
}

export async function getDeliveryConfirmationStatus(
  repos: GetDeliveryConfirmationStatusRepos,
  userId: string,
  principalRole: 'CUSTOMER' | 'CARRIER',
  shipmentId: string,
): Promise<GetDeliveryConfirmationStatusResult> {
  const participant = await resolveSafetyParticipant(repos, userId, principalRole, shipmentId)
  if (!participant) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (participant.status !== 'DELIVERED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const shipment = await repos.shipmentRepo.findStatusById(shipmentId)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }

  await sweepAutoConfirmDelivery(repos.deliveryConfirmationRepo, shipmentId, {
    status: shipment.status,
    deliveredAt: shipment.deliveredAt,
    customerId: shipment.customerId,
  })

  const confirmation = await repos.deliveryConfirmationRepo.findByShipment(shipmentId)

  return { success: true, confirmation }
}
