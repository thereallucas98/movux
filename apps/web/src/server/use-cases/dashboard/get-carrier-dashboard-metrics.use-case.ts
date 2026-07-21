import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'

export interface CarrierDashboardMetrics {
  activeShipments: number
  totalShipments: number
  totalEarnedInCents: number
  avgRating: number | null
}

export type GetCarrierDashboardMetricsResult =
  | { success: true; metrics: CarrierDashboardMetrics }
  | { success: false; code: 'NOT_FOUND' }

interface GetCarrierDashboardMetricsRepos {
  carrierProfileRepo: CarrierProfileRepository
  shipmentRepo: ShipmentRepository
}

// carrierId aqui é o User.id direto (Proposal.carrierId referencia User, sem
// indireção de profile) — mesmo padrão já usado por myQueueEntry/myProposal
// (S8-T5), diferente do customer (que passa por CustomerProfile.id).
export async function getCarrierDashboardMetrics(
  repos: GetCarrierDashboardMetricsRepos,
  userId: string,
): Promise<GetCarrierDashboardMetricsResult> {
  const profileMetrics =
    await repos.carrierProfileRepo.findMetricsByUserId(userId)
  if (!profileMetrics) return { success: false, code: 'NOT_FOUND' }

  const [activeShipments, totalShipments, totalEarnedInCents] =
    await Promise.all([
      repos.shipmentRepo.countActiveByCarrier(userId),
      repos.shipmentRepo.countByCarrier(userId),
      repos.shipmentRepo.sumFinalPriceByCarrier(userId, [
        'DELIVERED',
        'REVIEWED',
      ]),
    ])

  return {
    success: true,
    metrics: {
      activeShipments,
      totalShipments,
      totalEarnedInCents,
      avgRating: profileMetrics.avgRating,
    },
  }
}
