import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'
import type { ProposalRepository } from '../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'
import type { VehicleRepository } from '../../repositories/vehicle.repository'

export interface SearchPublicCarriersInput {
  cityId: string
  vehicleCategoryId?: string
}

export interface PublicCarrierResult {
  userId: string
  firstName: string
  vehicleCategoryName: string | null
  avgRating: number | null
  totalShipments: number
}

interface SearchPublicCarriersRepos {
  proposalRepo: ProposalRepository
  carrierProfileRepo: CarrierProfileRepository
  shipmentRepo: ShipmentRepository
  vehicleRepo: VehicleRepository
}

// Rota pública (S9-T3) — sem `principal` na assinatura porque não existe;
// nenhum campo de PII sai daqui (só firstName/categoria de veículo/avgRating/
// totalShipments, nunca o User/CarrierProfile inteiro). `userId` também sai
// (não é PII, já é a chave natural usada em toda consulta carrier-scoped) —
// necessário pra linkar o card ao portfólio público (achado #15).
export async function searchPublicCarriers(
  repos: SearchPublicCarriersRepos,
  input: SearchPublicCarriersInput,
): Promise<{ success: true; data: PublicCarrierResult[] }> {
  const acceptedCarrierIds =
    await repos.proposalRepo.findDistinctCarrierIdsAcceptedInCity(input.cityId)
  if (acceptedCarrierIds.length === 0) return { success: true, data: [] }

  const eligibleProfiles =
    await repos.carrierProfileRepo.findEligiblePublicProfiles(
      acceptedCarrierIds,
    )

  const results = await Promise.all(
    eligibleProfiles.map(async (profile) => {
      const [totalShipments, category] = await Promise.all([
        repos.shipmentRepo.countByCarrier(profile.userId),
        repos.vehicleRepo.findActiveCategoryByOwnerId(profile.userId),
      ])
      return {
        userId: profile.userId,
        firstName: profile.fullName.split(' ')[0],
        vehicleCategoryId: category?.id ?? null,
        vehicleCategoryName: category?.name ?? null,
        avgRating: profile.avgRating,
        totalShipments,
      }
    }),
  )

  const filtered = input.vehicleCategoryId
    ? results.filter((r) => r.vehicleCategoryId === input.vehicleCategoryId)
    : results

  return {
    success: true,
    data: filtered.map(
      ({ vehicleCategoryId: _vehicleCategoryId, ...rest }) => rest,
    ),
  }
}
