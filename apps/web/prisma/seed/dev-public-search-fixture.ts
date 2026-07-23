// Dev-only fixture: populates a handful of APPROVED/active carriers with
// accepted proposals in João Pessoa, so /buscar-transportadores has real
// results to show locally. Not part of `db:seed` (reference data) — run
// manually: `dotenv -e .env -- tsx prisma/seed/dev-public-search-fixture.ts`.
import { hashPassword } from '~/lib/auth'
import { prisma } from '~/lib/db'

const JOAO_PESSOA_CITY_ID = '63393bc4-2c54-489a-b41a-f03e27230023'
const JOAO_PESSOA_NEIGHBORHOOD_ID = 'e1c2d040-bcb1-47dc-9ecc-4f116e96f21e' // Cabo Branco
const JOAO_PESSOA_NEIGHBORHOOD_NAME = 'Cabo Branco'

interface CarrierFixture {
  fullName: string
  email: string
  avgRating: number | null
  vehicleCategoryName: 'Moto' | 'Van' | 'Caminhão' | null
  vehicleSpecName: string | null
}

const CARRIERS: CarrierFixture[] = [
  { fullName: 'Marcos Vinícius Souza', email: 'marcos.souza.fixture@movux.dev', avgRating: 4.8, vehicleCategoryName: 'Caminhão', vehicleSpecName: 'Caminhão 3/4' },
  { fullName: 'Juliana Ferreira Melo', email: 'juliana.melo.fixture@movux.dev', avgRating: 4.5, vehicleCategoryName: 'Van', vehicleSpecName: 'Van' },
  { fullName: 'Rodrigo Almeida Nunes', email: 'rodrigo.nunes.fixture@movux.dev', avgRating: null, vehicleCategoryName: 'Moto', vehicleSpecName: 'Moto' },
  { fullName: 'Patrícia Gomes Cardoso', email: 'patricia.cardoso.fixture@movux.dev', avgRating: 5.0, vehicleCategoryName: 'Caminhão', vehicleSpecName: 'Caminhão Truck' },
  { fullName: 'Anderson Luiz Ribeiro', email: 'anderson.ribeiro.fixture@movux.dev', avgRating: 4.2, vehicleCategoryName: null, vehicleSpecName: null },
]

async function main() {
  const passwordHash = await hashPassword('Fixture123!')

  const customer = await prisma.user.upsert({
    where: { email: 'cliente.fixture@movux.dev' },
    update: {},
    create: {
      email: 'cliente.fixture@movux.dev',
      fullName: 'Cliente Fixture',
      passwordHash,
      role: 'CUSTOMER',
      emailVerifiedAt: new Date(),
      customerProfile: { create: {} },
    },
    include: { customerProfile: true },
  })

  for (const fixture of CARRIERS) {
    const carrierUser = await prisma.user.upsert({
      where: { email: fixture.email },
      update: {},
      create: {
        email: fixture.email,
        fullName: fixture.fullName,
        passwordHash,
        role: 'CARRIER',
        emailVerifiedAt: new Date(),
        carrierProfile: {
          create: {
            phone: '83999990000',
            verificationStatus: 'APPROVED',
            verifiedAt: new Date(),
            avgRating: fixture.avgRating,
            isActive: true,
            isFlagged: false,
          },
        },
      },
    })

    let requiredCategoryId: string | null = null
    if (fixture.vehicleCategoryName && fixture.vehicleSpecName) {
      const spec = await prisma.vehicleSpec.findFirstOrThrow({
        where: { name: fixture.vehicleSpecName, category: { name: fixture.vehicleCategoryName } },
        select: { id: true, categoryId: true, category: { select: { fipeVehicleType: true } } },
      })
      requiredCategoryId = spec.categoryId

      // Marca/modelo fixture próprios — não depende do import da FIPE
      // (prisma/seed/vehicle-brands-models.ts) ter rodado antes.
      const fixtureBrand = await prisma.vehicleBrand.upsert({
        where: {
          fipeVehicleType_name: {
            fipeVehicleType: spec.category.fipeVehicleType,
            name: 'Fixture',
          },
        },
        update: {},
        create: { fipeVehicleType: spec.category.fipeVehicleType, name: 'Fixture' },
      })
      const fixtureModel = await prisma.vehicleModel.upsert({
        where: { brandId_name: { brandId: fixtureBrand.id, name: 'Fixture' } },
        update: {},
        create: { brandId: fixtureBrand.id, name: 'Fixture' },
      })

      await prisma.vehicle.create({
        data: {
          ownerId: carrierUser.id,
          specId: spec.id,
          modelId: fixtureModel.id,
          plate: `FIX-${Math.floor(Math.random() * 9000 + 1000)}`,
          year: 2020,
          isActive: true,
        },
      })
    }

    const shipment = await prisma.shipment.create({
      data: {
        customerId: customer.customerProfile!.id,
        status: 'DELIVERED',
        type: 'RESIDENTIAL_MOVING',
        description: `Frete fixture para busca pública — ${fixture.fullName}`,
        requiredCategoryId,
        scheduledDate: new Date(),
        timeWindow: 'MORNING',
        suggestedPriceInCents: 30000,
        finalPriceInCents: 30000,
        customerSlaHours: 24,
        addresses: {
          create: [
            {
              type: 'ORIGIN',
              street: 'Rua Fixture',
              number: '100',
              neighborhoodId: JOAO_PESSOA_NEIGHBORHOOD_ID,
              neighborhoodName: JOAO_PESSOA_NEIGHBORHOOD_NAME,
              cityId: JOAO_PESSOA_CITY_ID,
              state: 'PB',
              zipCode: '58000000',
            },
            {
              type: 'DESTINATION',
              street: 'Rua Fixture Destino',
              number: '200',
              neighborhoodId: JOAO_PESSOA_NEIGHBORHOOD_ID,
              neighborhoodName: JOAO_PESSOA_NEIGHBORHOOD_NAME,
              cityId: JOAO_PESSOA_CITY_ID,
              state: 'PB',
              zipCode: '58000000',
            },
          ],
        },
      },
    })

    const queueEntry = await prisma.proposalQueueEntry.create({
      data: {
        shipmentId: shipment.id,
        carrierId: carrierUser.id,
        status: 'ACTIVE',
        position: 1,
        calledAt: new Date(),
      },
    })

    await prisma.proposal.create({
      data: {
        shipmentId: shipment.id,
        carrierId: carrierUser.id,
        queueEntryId: queueEntry.id,
        status: 'ACCEPTED',
        customerSlaHours: 24,
        carrierSlaHours: 24,
        agreedSlaHours: 24,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    console.log(`✔ ${fixture.fullName} — pronto (frete #${shipment.id.slice(0, 8)})`)
  }

  console.log('\nBusca pública populada. Teste em http://localhost:3001/buscar-transportadores (cidade: João Pessoa).')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
