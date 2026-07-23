import type { PrismaClient } from '~/generated/prisma/client'

export interface VehicleWithSpec {
  id: string
  plate: string
  year: number
  isActive: boolean
  ownerId: string | null
  spec: {
    id: string
    name: string
    maxWeightKg: number
    maxVolumeM3: number
    category: { id: string; name: string }
  }
  model: {
    id: string
    name: string
    brand: { id: string; name: string }
  }
}

export interface CreateVehicleData {
  plate: string
  modelId: string
  year: number
  specId: string
}

export interface UpdateVehicleData {
  plate?: string
  modelId?: string
  year?: number
  specId?: string
}

export interface VehicleRepository {
  listByOwnerId(ownerId: string): Promise<VehicleWithSpec[]>
  countActiveByOwnerId(ownerId: string): Promise<number>
  findById(id: string): Promise<VehicleWithSpec | null>
  // Achado #17 da QA momento-zero — placa só é única entre veículos ATIVOS
  // (índice parcial `vehicle_plate_active_unique_idx` no banco); esse método
  // é o reforço em camada de app antes do insert.
  existsActiveByPlate(plate: string): Promise<boolean>
  create(ownerId: string, data: CreateVehicleData): Promise<VehicleWithSpec>
  update(id: string, data: UpdateVehicleData): Promise<VehicleWithSpec>
  deactivate(id: string): Promise<void>
  // Busca pública (S9-T3) — granularidade de categoria, não spec exato,
  // mesmo nível do antigo findActiveTypeByOwnerId que substitui.
  findActiveCategoryByOwnerId(
    ownerId: string,
  ): Promise<{ id: string; name: string } | null>
}

const VEHICLE_INCLUDE = {
  spec: {
    include: { category: { select: { id: true, name: true } } },
  },
  model: {
    include: { brand: { select: { id: true, name: true } } },
  },
} as const

function toVehicleWithSpec(vehicle: {
  id: string
  plate: string
  year: number
  isActive: boolean
  ownerId: string | null
  spec: {
    id: string
    name: string
    maxWeightKg: unknown
    maxVolumeM3: unknown
    category: { id: string; name: string }
  }
  model: {
    id: string
    name: string
    brand: { id: string; name: string }
  }
}): VehicleWithSpec {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    year: vehicle.year,
    isActive: vehicle.isActive,
    ownerId: vehicle.ownerId,
    spec: {
      id: vehicle.spec.id,
      name: vehicle.spec.name,
      maxWeightKg: Number(vehicle.spec.maxWeightKg),
      maxVolumeM3: Number(vehicle.spec.maxVolumeM3),
      category: vehicle.spec.category,
    },
    model: vehicle.model,
  }
}

export function createVehicleRepository(
  prisma: PrismaClient,
): VehicleRepository {
  return {
    async listByOwnerId(ownerId) {
      const vehicles = await prisma.vehicle.findMany({
        where: { ownerId, isActive: true },
        include: VEHICLE_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
      return vehicles.map(toVehicleWithSpec)
    },

    async countActiveByOwnerId(ownerId) {
      return prisma.vehicle.count({ where: { ownerId, isActive: true } })
    },

    async existsActiveByPlate(plate) {
      const count = await prisma.vehicle.count({
        where: { plate, isActive: true },
      })
      return count > 0
    },

    async findById(id) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: VEHICLE_INCLUDE,
      })
      return vehicle ? toVehicleWithSpec(vehicle) : null
    },

    async create(ownerId, data) {
      const vehicle = await prisma.vehicle.create({
        data: { ownerId, ...data },
        include: VEHICLE_INCLUDE,
      })
      return toVehicleWithSpec(vehicle)
    },

    async update(id, data) {
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data,
        include: VEHICLE_INCLUDE,
      })
      return toVehicleWithSpec(vehicle)
    },

    async deactivate(id) {
      await prisma.vehicle.update({
        where: { id },
        data: { isActive: false },
      })
    },

    async findActiveCategoryByOwnerId(ownerId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { ownerId, isActive: true },
        select: {
          spec: { select: { category: { select: { id: true, name: true } } } },
        },
      })
      return vehicle?.spec.category ?? null
    },
  }
}
