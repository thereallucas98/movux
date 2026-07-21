import type { VehicleType } from '~/generated/prisma/client'
import type { CarrierProfileRepository } from '../../repositories/carrier-profile.repository'
import type { ProposalRepository } from '../../repositories/proposal.repository'
import type { ShipmentRepository } from '../../repositories/shipment.repository'
import type { VehicleRepository } from '../../repositories/vehicle.repository'

export interface SearchPublicCarriersInput {
  cityId: string
  vehicleType?: VehicleType
}

export interface PublicCarrierResult {
  firstName: string
  vehicleType: VehicleType | null
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
// nenhum campo de PII sai daqui (só firstName/vehicleType/avgRating/
// totalShipments, nunca o User/CarrierProfile inteiro).
export async function searchPublicCarriers(
  repos: SearchPublicCarriersRepos,
  input: SearchPublicCarriersInput,
): Promise<{ success: true; data: PublicCarrierResult[] }> {
  const acceptedCarrierIds =
    await repos.proposalRepo.findDistinctCarrierIdsAcceptedInCity(
      input.cityId,
    )
  if (acceptedCarrierIds.length === 0) return { success: true, data: [] }

  const eligibleProfiles =
    await repos.carrierProfileRepo.findEligiblePublicProfiles(
      acceptedCarrierIds,
    )

  const results = await Promise.all(
    eligibleProfiles.map(async (profile) => {
      const [totalShipments, vehicleType] = await Promise.all([
        repos.shipmentRepo.countByCarrier(profile.userId),
        repos.vehicleRepo.findActiveTypeByOwnerId(profile.userId),
      ])
      return {
        firstName: profile.fullName.split(' ')[0],
        vehicleType,
        avgRating: profile.avgRating,
        totalShipments,
      }
    }),
  )

  const filtered = input.vehicleType
    ? results.filter((r) => r.vehicleType === input.vehicleType)
    : results

  return { success: true, data: filtered }
}
