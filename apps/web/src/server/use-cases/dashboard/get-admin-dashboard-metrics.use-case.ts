import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'
import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'

export interface AdminDashboardMetrics {
  pendingDocuments: number
  flaggedCarriers: number
  verifiedCarriers: number
  activeCarriers: number
}

// Sem lookup de owner — não tem como falhar (mesmo padrão de
// browseOpenShipments: só existe o caso de sucesso).
export interface GetAdminDashboardMetricsResult {
  success: true
  metrics: AdminDashboardMetrics
}

interface GetAdminDashboardMetricsRepos {
  carrierDocumentRepo: CarrierDocumentRepository
  carrierProfileRepo: CarrierProfileRepository
}

export async function getAdminDashboardMetrics(
  repos: GetAdminDashboardMetricsRepos,
): Promise<GetAdminDashboardMetricsResult> {
  const [pendingDocuments, flaggedCarriers, verifiedCarriers, activeCarriers] =
    await Promise.all([
      repos.carrierDocumentRepo.countByStatus('PENDING'),
      repos.carrierProfileRepo.countFlagged(),
      repos.carrierProfileRepo.countByVerificationStatus('APPROVED'),
      repos.carrierProfileRepo.countActive(),
    ])

  return {
    success: true,
    metrics: {
      pendingDocuments,
      flaggedCarriers,
      verifiedCarriers,
      activeCarriers,
    },
  }
}
