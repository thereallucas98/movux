import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { ShipmentEventRepository } from '../../repositories/shipment-event.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'

export type PublishShipmentResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface PublishShipmentRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
  shipmentEventRepo: ShipmentEventRepository
}

export async function publishShipment(
  repos: PublishShipmentRepos,
  userId: string,
  shipmentId: string,
): Promise<PublishShipmentResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const shipment = await repos.shipmentRepo.findStatusForOwner(
    shipmentId,
    customerProfile.id,
  )
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (shipment.status !== 'DRAFT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await repos.shipmentRepo.updateStatus(shipmentId, 'OPEN')
  await repos.shipmentEventRepo.create(shipmentId, 'PUBLISHED', userId)

  return { success: true }
}
