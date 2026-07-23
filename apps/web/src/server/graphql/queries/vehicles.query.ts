import { listMyVehicles } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { VehicleType } from '../types/vehicle.type'

builder.queryField('myVehicles', (t) =>
  t.field({
    type: [VehicleType],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      return listMyVehicles(
        { vehicleRepo: ctx.repos.vehicleRepo },
        ctx.principal.userId,
      )
    },
  }),
)
