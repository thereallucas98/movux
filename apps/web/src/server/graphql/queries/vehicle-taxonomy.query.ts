import { builder } from '../builder'
import { gqlError } from '../errors'
import {
  VehicleBrandType,
  VehicleCategoryType,
  VehicleModelOptionType,
} from '../types/vehicle-taxonomy.type'

// Leitura pura, sem use-case — mesmo padrão de `neighborhoods.query.ts`.
// Pública de propósito (sem checagem de ctx.principal): consumida pelo
// picker de exigência do frete e cadastro de veículo (autenticados), mas
// também pelo filtro da busca pública de transportadores (S9-T3,
// `/buscar-transportadores`, sem sessão) — nenhum dado sensível aqui, só
// nome de categoria/capacidade.
builder.queryField('vehicleCategories', (t) =>
  t.field({
    type: [VehicleCategoryType],
    resolve: async (_root, _args, ctx) => {
      return ctx.repos.vehicleTaxonomyRepo.listCategories()
    },
  }),
)

// Marca/modelo (catálogo real, importado da FIPE) — carregado sob demanda
// por categoria/marca em cascata no form de cadastro de veículo, diferente
// de vehicleCategories (que já vem com specs aninhados de uma vez, volume
// pequeno). Marca/modelo pode ter milhares de linhas, não carrega tudo.
builder.queryField('vehicleBrands', (t) =>
  t.field({
    type: [VehicleBrandType],
    args: { categoryId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')

      const category = await ctx.repos.vehicleTaxonomyRepo.findCategoryById(
        String(args.categoryId),
      )
      if (!category) throw gqlError('NOT_FOUND')

      return ctx.repos.vehicleTaxonomyRepo.listBrandsByFipeVehicleType(
        category.fipeVehicleType,
      )
    },
  }),
)

builder.queryField('vehicleModels', (t) =>
  t.field({
    type: [VehicleModelOptionType],
    args: { brandId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      return ctx.repos.vehicleTaxonomyRepo.listModelsByBrand(
        String(args.brandId),
      )
    },
  }),
)
