import type {
  VehicleRepository,
  VehicleWithSpec,
} from '../../repositories/vehicle.repository'
import type { VehicleTaxonomyRepository } from '../../repositories/vehicle-taxonomy.repository'

export interface UpdateVehicleInput {
  plate?: string
  modelId?: string
  year?: number
  specId?: string
}

export type UpdateVehicleResult =
  | { success: true; vehicle: VehicleWithSpec }
  | {
      success: false
      code:
        | 'NOT_FOUND'
        | 'FORBIDDEN'
        | 'INVALID_SPEC'
        | 'INVALID_MODEL'
        | 'DUPLICATE_PLATE'
    }

interface UpdateVehicleRepos {
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

export async function updateVehicle(
  repos: UpdateVehicleRepos,
  ownerId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<UpdateVehicleResult> {
  const existing = await repos.vehicleRepo.findById(vehicleId)
  if (!existing) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (existing.ownerId !== ownerId) {
    return { success: false, code: 'FORBIDDEN' }
  }

  if (input.specId) {
    const spec = await repos.vehicleTaxonomyRepo.findSpecById(input.specId)
    if (!spec) {
      return { success: false, code: 'INVALID_SPEC' }
    }
  }

  if (input.modelId) {
    const model = await repos.vehicleTaxonomyRepo.findModelById(input.modelId)
    if (!model) {
      return { success: false, code: 'INVALID_MODEL' }
    }
  }

  try {
    const vehicle = await repos.vehicleRepo.update(vehicleId, input)
    return { success: true, vehicle }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return { success: false, code: 'DUPLICATE_PLATE' }
    }
    throw error
  }
}
