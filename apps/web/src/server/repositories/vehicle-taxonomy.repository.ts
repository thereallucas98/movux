import type { PrismaClient } from '~/generated/prisma/client'

export interface VehicleCategoryWithSpecs {
  id: string
  name: string
  description: string | null
  fipeVehicleType: string
  specs: Array<{
    id: string
    name: string
    maxWeightKg: number
    maxVolumeM3: number
  }>
}

export interface VehicleTaxonomyRepository {
  listCategories(): Promise<VehicleCategoryWithSpecs[]>
  findSpecById(id: string): Promise<{ id: string; categoryId: string } | null>
  findCategoryById(
    id: string,
  ): Promise<{ id: string; fipeVehicleType: string } | null>
  // Marca/modelo (catálogo real, importado da FIPE — ver
  // prisma/seed/vehicle-brands-models.ts), ortogonal a categoria/spec.
  listBrandsByFipeVehicleType(
    fipeVehicleType: string,
  ): Promise<Array<{ id: string; name: string }>>
  listModelsByBrand(
    brandId: string,
  ): Promise<Array<{ id: string; name: string }>>
  findModelById(id: string): Promise<{ id: string; brandId: string } | null>
}

export function createVehicleTaxonomyRepository(
  prisma: PrismaClient,
): VehicleTaxonomyRepository {
  return {
    async listCategories() {
      const categories = await prisma.vehicleCategory.findMany({
        where: { isActive: true },
        include: { specs: { where: { isActive: true } } },
        orderBy: { name: 'asc' },
      })
      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        fipeVehicleType: category.fipeVehicleType,
        specs: category.specs.map((spec) => ({
          id: spec.id,
          name: spec.name,
          maxWeightKg: Number(spec.maxWeightKg),
          maxVolumeM3: Number(spec.maxVolumeM3),
        })),
      }))
    },

    async findSpecById(id) {
      return prisma.vehicleSpec.findUnique({
        where: { id },
        select: { id: true, categoryId: true },
      })
    },

    async findCategoryById(id) {
      return prisma.vehicleCategory.findUnique({
        where: { id },
        select: { id: true, fipeVehicleType: true },
      })
    },

    async listBrandsByFipeVehicleType(fipeVehicleType) {
      return prisma.vehicleBrand.findMany({
        where: { fipeVehicleType, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    },

    async listModelsByBrand(brandId) {
      return prisma.vehicleModel.findMany({
        where: { brandId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    },

    async findModelById(id) {
      return prisma.vehicleModel.findUnique({
        where: { id },
        select: { id: true, brandId: true },
      })
    },
  }
}
