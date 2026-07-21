import type { PrismaClient } from '~/generated/prisma/client'

export interface NeighborhoodListItem {
  id: string
  name: string
  cityId: string
  cityName: string
  stateUf: string
}

export interface CityListItem {
  id: string
  name: string
  stateUf: string
}

export interface GeographyRepository {
  listNeighborhoods(): Promise<NeighborhoodListItem[]>
  listCities(): Promise<CityListItem[]>
}

export function createGeographyRepository(
  prisma: PrismaClient,
): GeographyRepository {
  return {
    async listNeighborhoods() {
      const rows = await prisma.neighborhood.findMany({
        select: {
          id: true,
          name: true,
          cityId: true,
          city: { select: { name: true, state: { select: { uf: true } } } },
        },
        orderBy: { name: 'asc' },
      })

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        cityId: row.cityId,
        cityName: row.city.name,
        stateUf: row.city.state.uf,
      }))
    },

    // Busca pública (S9-T3) — cidade/UF são dado geográfico não-sensível,
    // mesma categoria de exposição já usada em listNeighborhoods().
    async listCities() {
      const rows = await prisma.city.findMany({
        select: { id: true, name: true, state: { select: { uf: true } } },
        orderBy: { name: 'asc' },
      })
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        stateUf: row.state.uf,
      }))
    },
  }
}
