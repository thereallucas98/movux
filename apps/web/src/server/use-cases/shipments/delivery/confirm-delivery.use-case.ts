import type { DeliveryConfirmation } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../../repositories/customer-profile.repository'
import type { DeliveryConfirmationRepository } from '../../../repositories/delivery-confirmation.repository'
import type { ShipmentRepository } from '../../../repositories/shipment.repository'
import { sweepAutoConfirmDelivery } from './sweep-auto-confirm-delivery'

export type ConfirmDeliveryResult =
  | { success: true; confirmation: DeliveryConfirmation }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'ALREADY_CONFIRMED' }

interface ConfirmDeliveryRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  deliveryConfirmationRepo: DeliveryConfirmationRepository
}

export async function confirmDelivery(
  repos: ConfirmDeliveryRepos,
  userId: string,
  shipmentId: string,
  confirmed: boolean,
  issueDescription: string | undefined,
): Promise<ConfirmDeliveryResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const shipment = await repos.shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'DELIVERED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await sweepAutoConfirmDelivery(repos.deliveryConfirmationRepo, shipmentId, {
    status: shipment.status,
    deliveredAt: shipment.deliveredAt,
    customerId: customerProfile.id,
  })

  const existing = await repos.deliveryConfirmationRepo.findByShipment(shipmentId)
  if (existing) {
    return { success: false, code: 'ALREADY_CONFIRMED' }
  }

  const confirmation = await repos.deliveryConfirmationRepo.create(
    shipmentId,
    customerProfile.id,
    confirmed,
    issueDescription,
  )

  return { success: true, confirmation }
}
