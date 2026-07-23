import { getCarrierPortfolio, searchPublicCarriers } from '~/server/use-cases'
import { builder } from '../builder'

export const PublicCarrierResultType = builder.simpleObject(
  'PublicCarrierResult',
  {
    fields: (t) => ({
      userId: t.string(),
      firstName: t.string(),
      vehicleCategoryName: t.string({ nullable: true }),
      avgRating: t.float({ nullable: true }),
      totalShipments: t.int(),
    }),
  },
)

export const CarrierPortfolioVehicleType = builder.simpleObject(
  'CarrierPortfolioVehicle',
  {
    fields: (t) => ({
      id: t.string(),
      categoryName: t.string(),
      brandName: t.string(),
      modelName: t.string(),
      year: t.int(),
    }),
  },
)

export const CarrierPortfolioType = builder.simpleObject('CarrierPortfolio', {
  fields: (t) => ({
    fullName: t.string(),
    bio: t.string({ nullable: true }),
    avgRating: t.float({ nullable: true }),
    totalShipments: t.int(),
    topTagLabel: t.string({ nullable: true }),
    vehicles: t.field({ type: [CarrierPortfolioVehicleType] }),
  }),
})

builder.queryField('publicCarrierSearch', (t) =>
  t.field({
    type: [PublicCarrierResultType],
    args: {
      cityId: t.arg.id({ required: true }),
      vehicleCategoryId: t.arg.id({ required: false }),
    },
    // Sem checagem de ctx.principal — rota pública deliberada (S9-T3), único
    // resolver do schema que não exige sessão.
    resolve: async (_root, args, ctx) => {
      const result = await searchPublicCarriers(
        {
          proposalRepo: ctx.repos.proposalRepo,
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          vehicleRepo: ctx.repos.vehicleRepo,
        },
        {
          cityId: String(args.cityId),
          vehicleCategoryId: args.vehicleCategoryId
            ? String(args.vehicleCategoryId)
            : undefined,
        },
      )
      return result.data
    },
  }),
)

builder.queryField('publicCarrierPortfolio', (t) =>
  t.field({
    type: CarrierPortfolioType,
    nullable: true,
    args: {
      userId: t.arg.id({ required: true }),
    },
    // Sem checagem de ctx.principal — mesma rota pública deliberada do
    // publicCarrierSearch (S9-T3); a elegibilidade é garantida pelo próprio
    // use-case (findPublicProfileByUserId já filtra APPROVED/isActive/
    // !isFlagged).
    resolve: async (_root, args, ctx) => {
      const result = await getCarrierPortfolio(
        {
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          vehicleRepo: ctx.repos.vehicleRepo,
          reviewRepo: ctx.repos.reviewRepo,
        },
        { userId: String(args.userId) },
      )
      return result.success ? result.data : null
    },
  }),
)
