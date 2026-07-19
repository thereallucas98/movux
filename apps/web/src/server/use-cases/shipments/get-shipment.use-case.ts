import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { ShipmentRepository, ShipmentWithDetails } from '../../repositories/shipment.repository'

export type GetShipmentResult =
  | { success: true; shipment: ShipmentWithDetails }
  | { success: false; code: 'NOT_FOUND' }

interface GetShipmentRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
}

export async function getShipment(
  repos: GetShipmentRepos,
  userId: string,
  shipmentId: string,
): Promise<GetShipmentResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const shipment = await repos.shipmentRepo.findByIdForOwner(shipmentId, customerProfile.id)
  if (!shipment) {
    return { success: false, code: 'NOT_FOUND' }
  }

  return { success: true, shipment }
}
