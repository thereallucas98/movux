import { searchPublicCarriers } from '~/server/use-cases'
import { builder } from '../builder'
import { VehicleTypeEnum } from '../enums/shipment.enum'

export const PublicCarrierResultType = builder.simpleObject(
  'PublicCarrierResult',
  {
    fields: (t) => ({
      firstName: t.string(),
      vehicleType: t.field({ type: VehicleTypeEnum, nullable: true }),
      avgRating: t.float({ nullable: true }),
      totalShipments: t.int(),
    }),
  },
)

builder.queryField('publicCarrierSearch', (t) =>
  t.field({
    type: [PublicCarrierResultType],
    args: {
      cityId: t.arg.id({ required: true }),
      vehicleType: t.arg({ type: VehicleTypeEnum, required: false }),
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
          vehicleType: args.vehicleType ?? undefined,
        },
      )
      return result.data
    },
  }),
)
