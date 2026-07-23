// Reference data (S10-T1) — categoria/especificação real de veículo,
// substitui o antigo enum VehicleType em Vehicle.type/Shipment.
// vehicleTypeRequired. Capacidades são referência de mercado, ajustáveis
// via seed sem migration.
import { prisma } from '~/lib/db'

interface SpecFixture {
  name: string
  maxWeightKg: number
  maxVolumeM3: number
}

interface CategoryFixture {
  name: string
  description: string
  // Tipo de veículo da API da FIPE — usado pra filtrar VehicleBrand por
  // categoria (ver vehicle-brands-models.ts).
  fipeVehicleType: 'cars' | 'motorcycles' | 'trucks'
  specs: SpecFixture[]
}

const CATEGORIES: CategoryFixture[] = [
  {
    name: 'Moto',
    description: 'Entregas pequenas e documentos',
    fipeVehicleType: 'motorcycles',
    specs: [{ name: 'Moto', maxWeightKg: 20, maxVolumeM3: 0.1 }],
  },
  {
    name: 'Van',
    description: 'Mudanças pequenas e entregas de volume médio',
    fipeVehicleType: 'cars',
    specs: [{ name: 'Van', maxWeightKg: 800, maxVolumeM3: 6 }],
  },
  {
    name: 'Caminhão',
    description: 'Mudanças residenciais/comerciais e fretes de maior porte',
    fipeVehicleType: 'trucks',
    specs: [
      { name: 'Caminhão 3/4', maxWeightKg: 3500, maxVolumeM3: 12 },
      { name: 'Caminhão Toco', maxWeightKg: 6000, maxVolumeM3: 20 },
      { name: 'Caminhão Truck', maxWeightKg: 14000, maxVolumeM3: 40 },
    ],
  },
]

async function main() {
  for (const category of CATEGORIES) {
    const created = await prisma.vehicleCategory.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        fipeVehicleType: category.fipeVehicleType,
      },
      create: {
        name: category.name,
        description: category.description,
        fipeVehicleType: category.fipeVehicleType,
      },
    })

    for (const spec of category.specs) {
      await prisma.vehicleSpec.upsert({
        where: { categoryId_name: { categoryId: created.id, name: spec.name } },
        update: { maxWeightKg: spec.maxWeightKg, maxVolumeM3: spec.maxVolumeM3 },
        create: {
          categoryId: created.id,
          name: spec.name,
          maxWeightKg: spec.maxWeightKg,
          maxVolumeM3: spec.maxVolumeM3,
        },
      })
    }

    console.log(`✔ Categoria "${category.name}" com ${category.specs.length} especificação(ões)`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
