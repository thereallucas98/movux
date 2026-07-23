import type { Shipment, ShipmentStatus } from '~/generated/prisma/client'
import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'

export interface ListShipmentsForCustomerInput {
  status?: ShipmentStatus
  cursor?: string
  limit?: number
}

export type ListShipmentsForCustomerResult =
  | { success: true; data: Shipment[]; nextCursor: string | null }
  | { success: false; code: 'CUSTOMER_PROFILE_NOT_FOUND' }

interface ListShipmentsRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
}

export async function listShipmentsForCustomer(
  repos: ListShipmentsRepos,
  userId: string,
  input: ListShipmentsForCustomerInput,
): Promise<ListShipmentsForCustomerResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) {
    return { success: false, code: 'CUSTOMER_PROFILE_NOT_FOUND' }
  }

  const { data, nextCursor } = await repos.shipmentRepo.listForCustomer(
    customerProfile.id,
    input,
  )
  return { success: true, data, nextCursor }
}
