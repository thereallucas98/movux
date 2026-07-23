import {
  createVehicle,
  deactivateVehicle,
  updateVehicle,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { VehicleType } from '../types/vehicle.type'

const VehicleInput = builder.inputType('VehicleInput', {
  fields: (t) => ({
    plate: t.string({ required: true }),
    modelId: t.id({ required: true }),
    year: t.int({ required: true }),
    specId: t.id({ required: true }),
  }),
})

const UpdateVehicleInput = builder.inputType('UpdateVehicleInput', {
  fields: (t) => ({
    plate: t.string(),
    modelId: t.id(),
    year: t.int(),
    specId: t.id(),
  }),
})

builder.mutationField('createVehicle', (t) =>
  t.field({
    type: VehicleType,
    args: { input: t.arg({ type: VehicleInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const { input } = args
      const result = await createVehicle(
        {
          vehicleRepo: ctx.repos.vehicleRepo,
          vehicleTaxonomyRepo: ctx.repos.vehicleTaxonomyRepo,
        },
        ctx.principal.userId,
        {
          plate: input.plate,
          modelId: String(input.modelId),
          year: input.year,
          specId: String(input.specId),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.vehicle
    },
  }),
)

builder.mutationField('updateVehicle', (t) =>
  t.field({
    type: VehicleType,
    args: {
      vehicleId: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateVehicleInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const { input } = args
      const result = await updateVehicle(
        {
          vehicleRepo: ctx.repos.vehicleRepo,
          vehicleTaxonomyRepo: ctx.repos.vehicleTaxonomyRepo,
        },
        ctx.principal.userId,
        String(args.vehicleId),
        {
          plate: input.plate ?? undefined,
          modelId: input.modelId ? String(input.modelId) : undefined,
          year: input.year ?? undefined,
          specId: input.specId ? String(input.specId) : undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.vehicle
    },
  }),
)

builder.mutationField('deactivateVehicle', (t) =>
  t.field({
    type: 'Boolean',
    args: { vehicleId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await deactivateVehicle(
        { vehicleRepo: ctx.repos.vehicleRepo },
        ctx.principal.userId,
        String(args.vehicleId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)
