import type {
  VehicleRepository,
  VehicleWithSpec,
} from '../../repositories/vehicle.repository'
import type { VehicleTaxonomyRepository } from '../../repositories/vehicle-taxonomy.repository'

export interface CreateVehicleInput {
  plate: string
  modelId: string
  year: number
  specId: string
}

export type CreateVehicleResult =
  | { success: true; vehicle: VehicleWithSpec }
  | {
      success: false
      code:
        | 'INVALID_SPEC'
        | 'INVALID_MODEL'
        | 'DUPLICATE_PLATE'
        | 'VEHICLE_LIMIT_REACHED'
    }

// Achado #2 da QA momento-zero: limite fixo por enquanto — quando o S10-T2
// (algoritmo de match) existir, a validação de capacidade/categoria do
// veículo contra a exigência do frete entra em outro lugar (na proposta),
// não aqui no cadastro.
export const MAX_ACTIVE_VEHICLES_PER_CARRIER = 2

interface CreateVehicleRepos {
  vehicleRepo: VehicleRepository
  vehicleTaxonomyRepo: VehicleTaxonomyRepository
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

export async function createVehicle(
  repos: CreateVehicleRepos,
  ownerId: string,
  input: CreateVehicleInput,
): Promise<CreateVehicleResult> {
  const spec = await repos.vehicleTaxonomyRepo.findSpecById(input.specId)
  if (!spec) {
    return { success: false, code: 'INVALID_SPEC' }
  }

  const model = await repos.vehicleTaxonomyRepo.findModelById(input.modelId)
  if (!model) {
    return { success: false, code: 'INVALID_MODEL' }
  }

  const activeCount = await repos.vehicleRepo.countActiveByOwnerId(ownerId)
  if (activeCount >= MAX_ACTIVE_VEHICLES_PER_CARRIER) {
    return { success: false, code: 'VEHICLE_LIMIT_REACHED' }
  }

  const plateInUse = await repos.vehicleRepo.existsActiveByPlate(input.plate)
  if (plateInUse) {
    return { success: false, code: 'DUPLICATE_PLATE' }
  }

  try {
    const vehicle = await repos.vehicleRepo.create(ownerId, input)
    return { success: true, vehicle }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return { success: false, code: 'DUPLICATE_PLATE' }
    }
    throw error
  }
}
