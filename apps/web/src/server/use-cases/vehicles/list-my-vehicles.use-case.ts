import type {
  VehicleRepository,
  VehicleWithSpec,
} from '../../repositories/vehicle.repository'

interface ListMyVehiclesRepos {
  vehicleRepo: VehicleRepository
}

export async function listMyVehicles(
  repos: ListMyVehiclesRepos,
  ownerId: string,
): Promise<VehicleWithSpec[]> {
  return repos.vehicleRepo.listByOwnerId(ownerId)
}
