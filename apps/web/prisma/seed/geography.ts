import { prisma } from '~/lib/db'
import type { NeighborhoodClassification } from '~/generated/prisma/client'

const STATE = { name: 'Paraíba', uf: 'PB', ibgeCode: '25' }
const CITY = { name: 'João Pessoa', ibgeCode: '2507507' }

interface NeighborhoodSeed {
  name: string
  classification: NeighborhoodClassification
}

interface ClusterSeed {
  slug: string
  name: string
  neighborhoods: NeighborhoodSeed[]
}

const CLUSTERS: ClusterSeed[] = [
  {
    slug: 'orla-norte',
    name: 'Orla Norte',
    neighborhoods: [
      { name: 'Manaíra', classification: 'UPSCALE' },
      { name: 'Tambaú', classification: 'UPSCALE' },
      { name: 'Bessa', classification: 'UPSCALE' },
    ],
  },
  {
    slug: 'orla-sul',
    name: 'Orla Sul',
    neighborhoods: [
      { name: 'Cabo Branco', classification: 'UPSCALE' },
      { name: 'Miramar', classification: 'UPSCALE' },
      { name: 'Jardim Oceania', classification: 'UPSCALE' },
    ],
  },
  {
    slug: 'centro-expandido',
    name: 'Centro Expandido',
    neighborhoods: [
      { name: 'Centro', classification: 'MIDDLE' },
      { name: 'Torre', classification: 'MIDDLE' },
      { name: 'Tambauzinho', classification: 'MIDDLE' },
      { name: 'Jaguaribe', classification: 'MIDDLE' },
      { name: 'Bairro dos Estados', classification: 'MIDDLE' },
    ],
  },
  {
    slug: 'zona-sul',
    name: 'Zona Sul',
    neighborhoods: [
      { name: 'Bancários', classification: 'MIDDLE' },
      { name: 'José Américo', classification: 'MIDDLE' },
      { name: 'Água Fria', classification: 'MIDDLE' },
    ],
  },
  {
    slug: 'zona-norte',
    name: 'Zona Norte',
    neighborhoods: [
      { name: 'Mangabeira', classification: 'POPULAR' },
      { name: 'Cristo Redentor', classification: 'POPULAR' },
      { name: 'Padre Zé', classification: 'POPULAR' },
    ],
  },
]

async function main() {
  const state = await prisma.state.upsert({
    where: { uf: STATE.uf },
    create: STATE,
    update: STATE,
  })

  const city = await prisma.city.upsert({
    where: { ibgeCode: CITY.ibgeCode },
    create: { ...CITY, stateId: state.id },
    update: { ...CITY, stateId: state.id },
  })

  for (const clusterSeed of CLUSTERS) {
    const cluster = await prisma.neighborhoodCluster.upsert({
      where: { cityId_slug: { cityId: city.id, slug: clusterSeed.slug } },
      create: { cityId: city.id, slug: clusterSeed.slug, name: clusterSeed.name },
      update: { name: clusterSeed.name },
    })

    for (const neighborhoodSeed of clusterSeed.neighborhoods) {
      const neighborhood = await prisma.neighborhood.upsert({
        where: { cityId_name: { cityId: city.id, name: neighborhoodSeed.name } },
        create: { cityId: city.id, ...neighborhoodSeed },
        update: { classification: neighborhoodSeed.classification },
      })

      await prisma.clusterNeighborhood.upsert({
        where: {
          clusterId_neighborhoodId: {
            clusterId: cluster.id,
            neighborhoodId: neighborhood.id,
          },
        },
        create: { clusterId: cluster.id, neighborhoodId: neighborhood.id },
        update: {},
      })
    }
  }

  const counts = {
    states: await prisma.state.count(),
    cities: await prisma.city.count(),
    neighborhoods: await prisma.neighborhood.count(),
    clusters: await prisma.neighborhoodCluster.count(),
  }
  console.log('[seed:geography] done', counts)
}

main()
  .catch((error) => {
    console.error('[seed:geography] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
