import { prisma } from '~/lib/db'
import type { ModifierCode, ModifierValueType, ShipmentType } from '~/generated/prisma/client'

const SHIPMENT_TYPES: ShipmentType[] = ['RESIDENTIAL_MOVING', 'DELIVERY']

const TIER_PRICE_IN_CENTS: Record<ShipmentType, { sameCluster: number; crossCluster: number }> = {
  RESIDENTIAL_MOVING: { sameCluster: 15000, crossCluster: 25000 },
  DELIVERY: { sameCluster: 2500, crossCluster: 4000 },
  COMMERCIAL_FREIGHT: { sameCluster: 0, crossCluster: 0 },
  OTHER: { sameCluster: 0, crossCluster: 0 },
}

interface ModifierSeed {
  code: ModifierCode
  name: string
  valueType: ModifierValueType
  valueInCents: number
}

const MODIFIERS: ModifierSeed[] = [
  { code: 'FLOOR', name: 'Andar sem elevador (por andar)', valueType: 'FIXED', valueInCents: 1500 },
  { code: 'HELPER', name: 'Ajudante extra', valueType: 'FIXED', valueInCents: 4000 },
  { code: 'DISASSEMBLY', name: 'Desmontagem de móveis', valueType: 'FIXED', valueInCents: 3000 },
  { code: 'PACKING', name: 'Embalagem', valueType: 'FIXED', valueInCents: 5000 },
  { code: 'DIFFICULT_ACCESS', name: 'Acesso difícil', valueType: 'PERCENTAGE', valueInCents: 1500 },
  { code: 'NIGHT_WEEKEND', name: 'Horário noturno / fim de semana', valueType: 'PERCENTAGE', valueInCents: 2000 },
]

async function seedTemplatesAndSnapshots() {
  const clusters = await prisma.neighborhoodCluster.findMany({ select: { id: true } })
  if (clusters.length === 0) {
    throw new Error('No neighborhoodCluster found — run geography seed first')
  }

  let templateCount = 0

  for (const origin of clusters) {
    for (const destination of clusters) {
      for (const shipmentType of SHIPMENT_TYPES) {
        const tier = TIER_PRICE_IN_CENTS[shipmentType]
        const basePriceInCents =
          origin.id === destination.id ? tier.sameCluster : tier.crossCluster

        const template = await prisma.pricingTemplate.upsert({
          where: {
            originClusterId_destinationClusterId_shipmentType_vehicleType: {
              originClusterId: origin.id,
              destinationClusterId: destination.id,
              shipmentType,
              vehicleType: 'ANY',
            },
          },
          create: {
            originClusterId: origin.id,
            destinationClusterId: destination.id,
            shipmentType,
            vehicleType: 'ANY',
            basePriceInCents,
          },
          update: { basePriceInCents },
        })

        await prisma.pricingSnapshot.upsert({
          where: { templateId: template.id },
          create: {
            templateId: template.id,
            basePriceInCents,
            sampleSize: 0,
            lastTrigger: 'MANUAL',
          },
          update: { basePriceInCents },
        })

        templateCount += 1
      }
    }
  }

  return templateCount
}

async function seedModifiers() {
  let modifierCount = 0

  for (const modifier of MODIFIERS) {
    const existing = await prisma.pricingModifier.findFirst({
      where: { code: modifier.code, cityId: null },
    })

    if (existing) {
      await prisma.pricingModifier.update({
        where: { id: existing.id },
        data: { name: modifier.name, valueType: modifier.valueType, valueInCents: modifier.valueInCents },
      })
    } else {
      await prisma.pricingModifier.create({
        data: { ...modifier, cityId: null },
      })
    }

    modifierCount += 1
  }

  return modifierCount
}

async function main() {
  const templateCount = await seedTemplatesAndSnapshots()
  const modifierCount = await seedModifiers()

  console.log('[seed:pricing] done', { templates: templateCount, modifiers: modifierCount })
}

main()
  .catch((error) => {
    console.error('[seed:pricing] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
