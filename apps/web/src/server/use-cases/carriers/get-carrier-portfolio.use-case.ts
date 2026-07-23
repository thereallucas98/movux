import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'
import type { ReviewRepository } from '../../repositories/review.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'
import type { VehicleRepository } from '../../repositories/vehicle.repository'

export interface GetCarrierPortfolioInput {
  userId: string
}

export interface CarrierPortfolioVehicle {
  id: string
  categoryName: string
  brandName: string
  modelName: string
  year: number
}

export interface CarrierPortfolioResult {
  fullName: string
  bio: string | null
  avgRating: number | null
  totalShipments: number
  // Achado #10 da QA momento-zero — badge de tag mais votada, derivado da
  // frequência das tags recebidas (não da média numérica).
  topTagLabel: string | null
  vehicles: CarrierPortfolioVehicle[]
}

interface GetCarrierPortfolioRepos {
  carrierProfileRepo: CarrierProfileRepository
  shipmentRepo: ShipmentRepository
  vehicleRepo: VehicleRepository
  reviewRepo: ReviewRepository
}

export type GetCarrierPortfolioResult =
  | { success: true; data: CarrierPortfolioResult }
  | { success: false; code: 'NOT_FOUND' }

// Rota pública (achado #15) — mesmo guard de elegibilidade da busca pública
// (findPublicProfileByUserId já filtra APPROVED/isActive/!isFlagged), então
// um carrier não elegível retorna NOT_FOUND mesmo que o id exista no banco.
// Placa do veículo fica de fora do payload (PII), só categoria/marca/modelo/
// ano — mesmo nível de detalhe já usado no card da busca.
export async function getCarrierPortfolio(
  repos: GetCarrierPortfolioRepos,
  input: GetCarrierPortfolioInput,
): Promise<GetCarrierPortfolioResult> {
  const profile = await repos.carrierProfileRepo.findPublicProfileByUserId(
    input.userId,
  )
  if (!profile) return { success: false, code: 'NOT_FOUND' }

  const [totalShipments, vehicles, topTag] = await Promise.all([
    repos.shipmentRepo.countByCarrier(profile.userId),
    repos.vehicleRepo.listByOwnerId(profile.userId),
    repos.reviewRepo.findTopTagByReviewee(profile.userId),
  ])

  return {
    success: true,
    data: {
      fullName: profile.fullName,
      bio: profile.bio,
      avgRating: profile.avgRating,
      totalShipments,
      topTagLabel: topTag?.label ?? null,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        categoryName: vehicle.spec.category.name,
        brandName: vehicle.model.brand.name,
        modelName: vehicle.model.name,
        year: vehicle.year,
      })),
    },
  }
}
