// Import único do catálogo real de marca/modelo (S10-T1) via API pública da
// FIPE (https://deividfortuna.github.io/fipe/v2/) — evita que o carrier
// digite o mesmo fabricante de formas diferentes. Não é chamado em runtime
// (rate limit da FIPE não permite uso ao vivo por requisição) — roda uma
// vez, os dados ficam em VehicleBrand/VehicleModel.
//
// Idempotente/retomável: marcas cujos modelos já foram importados são
// puladas, então rodar de novo depois de uma interrupção (rate limit, rede)
// só continua de onde parou.
//
// Uso: dotenv -e .env -- tsx prisma/seed/vehicle-brands-models.ts
import { prisma } from '~/lib/db'

const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2'
const REQUEST_DELAY_MS = 1200
const MAX_RETRIES = 5

type FipeVehicleType = 'cars' | 'motorcycles' | 'trucks'

interface FipeBrand {
  code: string
  name: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchFipe<T>(path: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${FIPE_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) return res.json() as Promise<T>

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = 5000 * attempt
      console.log(`  … 429 em ${path}, aguardando ${backoffMs}ms (tentativa ${attempt}/${MAX_RETRIES})`)
      await sleep(backoffMs)
      continue
    }

    throw new Error(`FIPE API ${path} respondeu ${res.status}`)
  }
  throw new Error(`FIPE API ${path} excedeu ${MAX_RETRIES} tentativas`)
}

async function importVehicleType(fipeVehicleType: FipeVehicleType) {
  const brands = await fetchFipe<FipeBrand[]>(`/${fipeVehicleType}/brands`)
  console.log(`${fipeVehicleType}: ${brands.length} marcas encontradas`)

  for (const brand of brands) {
    const brandRow = await prisma.vehicleBrand.upsert({
      where: { fipeVehicleType_name: { fipeVehicleType, name: brand.name } },
      update: {},
      create: { fipeVehicleType, name: brand.name },
    })

    const existingModelsCount = await prisma.vehicleModel.count({
      where: { brandId: brandRow.id },
    })
    if (existingModelsCount > 0) {
      console.log(`  · ${brand.name} — já importado (${existingModelsCount} modelo(s)), pulando`)
      continue
    }

    const models = await fetchFipe<FipeBrand[]>(
      `/${fipeVehicleType}/brands/${brand.code}/models`,
    )

    for (const model of models) {
      await prisma.vehicleModel.upsert({
        where: { brandId_name: { brandId: brandRow.id, name: model.name } },
        update: {},
        create: { brandId: brandRow.id, name: model.name },
      })
    }

    console.log(`  ✔ ${brand.name} — ${models.length} modelo(s)`)
    await sleep(REQUEST_DELAY_MS)
  }
}

async function main() {
  const fipeVehicleTypes: FipeVehicleType[] = ['motorcycles', 'cars', 'trucks']
  for (const fipeVehicleType of fipeVehicleTypes) {
    await importVehicleType(fipeVehicleType)
  }

  console.log('\nCatálogo de marca/modelo importado da FIPE com sucesso.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
