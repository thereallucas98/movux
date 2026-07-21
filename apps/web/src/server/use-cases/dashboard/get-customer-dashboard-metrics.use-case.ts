import type { CustomerProfileRepository } from '../../repositories/customer-profile.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'

export interface CustomerDashboardMetrics {
  activeShipments: number
  totalShipments: number
  totalSpentInCents: number
  avgRating: number | null
}

export type GetCustomerDashboardMetricsResult =
  | { success: true; metrics: CustomerDashboardMetrics }
  | { success: false; code: 'NOT_FOUND' }

interface GetCustomerDashboardMetricsRepos {
  customerProfileRepo: CustomerProfileRepository
  shipmentRepo: ShipmentRepository
}

export async function getCustomerDashboardMetrics(
  repos: GetCustomerDashboardMetricsRepos,
  userId: string,
): Promise<GetCustomerDashboardMetricsResult> {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) return { success: false, code: 'NOT_FOUND' }

  const [profileMetrics, activeShipments, totalShipments, totalSpentInCents] =
    await Promise.all([
      repos.customerProfileRepo.findMetricsByUserId(userId),
      repos.shipmentRepo.countActiveByCustomer(customerProfile.id),
      repos.shipmentRepo.countByCustomer(customerProfile.id),
      repos.shipmentRepo.sumFinalPriceByCustomer(customerProfile.id, [
        'DELIVERED',
        'REVIEWED',
      ]),
    ])

  return {
    success: true,
    metrics: {
      activeShipments,
      totalShipments,
      totalSpentInCents,
      avgRating: profileMetrics?.avgRating ?? null,
    },
  }
}
