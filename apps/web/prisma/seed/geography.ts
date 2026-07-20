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

/**
 * All 64 official IBGE neighborhoods of João Pessoa, grouped into the 5
 * pricing clusters. Cluster assignment for the neighborhoods added after the
 * initial 17-neighborhood MVP seed is based on general geographic/economic
 * knowledge of the city, not precise zoning data — good enough for pricing
 * corridors, refine later if a bad corridor price surfaces in QA.
 */
const CLUSTERS: ClusterSeed[] = [
  {
    slug: 'orla-norte',
    name: 'Orla Norte',
    neighborhoods: [
      { name: 'Manaíra', classification: 'UPSCALE' },
      { name: 'Tambaú', classification: 'UPSCALE' },
      { name: 'Bessa', classification: 'UPSCALE' },
      { name: 'Aeroclube', classification: 'UPSCALE' },
      { name: 'Anatólia', classification: 'UPSCALE' },
      { name: 'Cidade dos Colibris', classification: 'MIDDLE' },
      { name: 'Costa e Silva', classification: 'MIDDLE' },
    ],
  },
  {
    slug: 'orla-sul',
    name: 'Orla Sul',
    neighborhoods: [
      { name: 'Cabo Branco', classification: 'UPSCALE' },
      { name: 'Miramar', classification: 'UPSCALE' },
      { name: 'Jardim Oceania', classification: 'UPSCALE' },
      { name: 'Altiplano', classification: 'UPSCALE' },
      { name: 'Brisamar', classification: 'UPSCALE' },
      { name: 'Ponta do Seixas', classification: 'UPSCALE' },
      { name: 'Costa do Sol', classification: 'MIDDLE' },
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
      { name: 'Estados', classification: 'MIDDLE' },
      { name: 'Castelo Branco', classification: 'MIDDLE' },
      { name: 'Expedicionários', classification: 'MIDDLE' },
      { name: 'Funcionários', classification: 'MIDDLE' },
      { name: 'Grotão', classification: 'MIDDLE' },
      { name: 'Jardim Cidade Universitária', classification: 'MIDDLE' },
      { name: 'João Agripino', classification: 'MIDDLE' },
      { name: 'Pedro Gondim', classification: 'MIDDLE' },
      { name: 'Penha', classification: 'MIDDLE' },
      { name: 'São José', classification: 'MIDDLE' },
      { name: 'Tambiá', classification: 'MIDDLE' },
      { name: 'Treze de Maio', classification: 'MIDDLE' },
      { name: 'Trincheiras', classification: 'MIDDLE' },
      { name: 'Varadouro', classification: 'MIDDLE' },
    ],
  },
  {
    slug: 'zona-sul',
    name: 'Zona Sul',
    neighborhoods: [
      { name: 'Bancários', classification: 'MIDDLE' },
      { name: 'José Américo', classification: 'MIDDLE' },
      { name: 'Água Fria', classification: 'MIDDLE' },
      { name: 'Portal do Sol', classification: 'MIDDLE' },
      { name: 'Valentina de Figueiredo', classification: 'MIDDLE' },
    ],
  },
  {
    slug: 'zona-norte',
    name: 'Zona Norte',
    neighborhoods: [
      { name: 'Mangabeira', classification: 'POPULAR' },
      { name: 'Cristo Redentor', classification: 'POPULAR' },
      { name: 'Padre Zé', classification: 'POPULAR' },
      { name: 'Alto do Céu', classification: 'POPULAR' },
      { name: 'Alto do Mateus', classification: 'POPULAR' },
      { name: 'Barra de Gramame', classification: 'POPULAR' },
      { name: 'Cruz das Armas', classification: 'POPULAR' },
      { name: 'Cuiá', classification: 'POPULAR' },
      { name: 'Distrito Industrial', classification: 'POPULAR' },
      { name: 'Ernâni Sátiro', classification: 'POPULAR' },
      { name: 'Ernesto Geisel', classification: 'POPULAR' },
      { name: 'Gramame', classification: 'POPULAR' },
      { name: 'Ilha do Bispo', classification: 'POPULAR' },
      { name: 'Indústrias', classification: 'POPULAR' },
      { name: 'Ipês', classification: 'POPULAR' },
      { name: 'Jardim São Paulo', classification: 'POPULAR' },
      { name: 'Jardim Veneza', classification: 'POPULAR' },
      { name: 'João Paulo II', classification: 'MIDDLE' },
      { name: 'Mandacaru', classification: 'POPULAR' },
      { name: 'Muçumagro', classification: 'POPULAR' },
      { name: 'Mumbaba', classification: 'POPULAR' },
      { name: 'Mussuré', classification: 'POPULAR' },
      { name: 'Oitizeiro', classification: 'POPULAR' },
      { name: 'Paratibe', classification: 'POPULAR' },
      { name: 'Planalto da Boa Esperança', classification: 'POPULAR' },
      { name: 'Róger', classification: 'POPULAR' },
      { name: 'Varjão', classification: 'POPULAR' },
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

  // One-time rename: the original MVP seed used "Bairro dos Estados"; the
  // IBGE/ViaCEP-consistent name is "Estados" — rename in place instead of
  // upserting under the new name, which would leave the old row orphaned.
  await prisma.neighborhood.updateMany({
    where: { cityId: city.id, name: 'Bairro dos Estados' },
    data: { name: 'Estados' },
  })

  for (const clusterSeed of CLUSTERS) {
    const cluster = await prisma.neighborhoodCluster.upsert({
      where: { cityId_slug: { cityId: city.id, slug: clusterSeed.slug } },
      create: {
        cityId: city.id,
        slug: clusterSeed.slug,
        name: clusterSeed.name,
      },
      update: { name: clusterSeed.name },
    })

    for (const neighborhoodSeed of clusterSeed.neighborhoods) {
      const neighborhood = await prisma.neighborhood.upsert({
        where: {
          cityId_name: { cityId: city.id, name: neighborhoodSeed.name },
        },
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
