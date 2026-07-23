import type { VehicleRepository } from '../../repositories/vehicle.repository'

export type DeactivateVehicleResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'FORBIDDEN' }

interface DeactivateVehicleRepos {
  vehicleRepo: VehicleRepository
}

export async function deactivateVehicle(
  repos: DeactivateVehicleRepos,
  ownerId: string,
  vehicleId: string,
): Promise<DeactivateVehicleResult> {
  const existing = await repos.vehicleRepo.findById(vehicleId)
  if (!existing) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (existing.ownerId !== ownerId) {
    return { success: false, code: 'FORBIDDEN' }
  }

  await repos.vehicleRepo.deactivate(vehicleId)
  return { success: true }
}
