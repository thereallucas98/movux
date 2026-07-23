import { createShipment, publishShipment } from '~/server/use-cases'
import { builder } from '../builder'
import { ShipmentTypeEnum, TimeWindowEnum } from '../enums/shipment.enum'
import { gqlError, gqlErrorFromResult } from '../errors'
import { ShipmentType, toGraphQLShipment } from '../types/shipment.type'

const ShipmentAddressInput = builder.inputType('ShipmentAddressInput', {
  fields: (t) => ({
    street: t.string({ required: true }),
    number: t.string({ required: true }),
    complement: t.string(),
    neighborhoodId: t.id({ required: true }),
    cityId: t.id({ required: true }),
    state: t.string({ required: true }),
    zipCode: t.string({ required: true }),
  }),
})

const CreateShipmentInput = builder.inputType('CreateShipmentInput', {
  fields: (t) => ({
    type: t.field({ type: ShipmentTypeEnum, required: true }),
    description: t.string({ required: true }),
    estimatedWeightKg: t.float(),
    estimatedVolumeM3: t.float(),
    requiredCategoryId: t.id(),
    scheduledDate: t.string({ required: true }),
    timeWindow: t.field({ type: TimeWindowEnum, required: true }),
    specificTime: t.string(),
    customerSlaHours: t.int({ required: true }),
    origin: t.field({ type: ShipmentAddressInput, required: true }),
    destination: t.field({ type: ShipmentAddressInput, required: true }),
  }),
})

builder.mutationField('createShipment', (t) =>
  t.field({
    type: ShipmentType,
    args: {
      input: t.arg({ type: CreateShipmentInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')

      const { input } = args
      const result = await createShipment(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          pricingRepo: ctx.repos.pricingRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
        },
        ctx.principal.userId,
        {
          type: input.type,
          description: input.description,
          estimatedWeightKg: input.estimatedWeightKg ?? undefined,
          estimatedVolumeM3: input.estimatedVolumeM3 ?? undefined,
          requiredCategoryId: input.requiredCategoryId
            ? String(input.requiredCategoryId)
            : undefined,
          scheduledDate: input.scheduledDate,
          timeWindow: input.timeWindow,
          specificTime: input.specificTime ?? undefined,
          customerSlaHours: input.customerSlaHours,
          origin: {
            street: input.origin.street,
            number: input.origin.number,
            complement: input.origin.complement ?? undefined,
            neighborhoodId: String(input.origin.neighborhoodId),
            cityId: String(input.origin.cityId),
            state: input.origin.state,
            zipCode: input.origin.zipCode,
          },
          destination: {
            street: input.destination.street,
            number: input.destination.number,
            complement: input.destination.complement ?? undefined,
            neighborhoodId: String(input.destination.neighborhoodId),
            cityId: String(input.destination.cityId),
            state: input.destination.state,
            zipCode: input.destination.zipCode,
          },
          // modifiers fora do v1 (decisão da Research)
          modifiers: [],
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return toGraphQLShipment(result.shipment)
    },
  }),
)

builder.mutationField('publishShipment', (t) =>
  t.field({
    type: 'Boolean',
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')

      const result = await publishShipment(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)
