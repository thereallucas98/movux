import {
  getShipment,
  getShipmentForCarrier,
  listShipmentsForCustomer,
} from '~/server/use-cases'
import { builder } from '../builder'
import { ShipmentStatusEnum } from '../enums/shipment.enum'
import { gqlError, gqlErrorFromResult } from '../errors'
import {
  ShipmentConnectionType,
  ShipmentType,
  toGraphQLShipment,
} from '../types/shipment.type'

builder.queryField('myShipments', (t) =>
  t.field({
    type: ShipmentConnectionType,
    args: {
      status: t.arg({ type: ShipmentStatusEnum }),
      cursor: t.arg.id(),
      limit: t.arg.int(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')

      const result = await listShipmentsForCustomer(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
        },
        ctx.principal.userId,
        {
          status: args.status ?? undefined,
          cursor: args.cursor ? String(args.cursor) : undefined,
          limit: args.limit ?? undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return {
        // list rows don't carry addresses (shipmentRepo.listForCustomer has no `include`) —
        // same "fill the required list field" pattern as scheduleShifts/expectedComposition
        data: result.data.map((shipment) =>
          toGraphQLShipment({ ...shipment, addresses: [] }),
        ),
        nextCursor: result.nextCursor,
      }
    },
  }),
)

builder.queryField('shipment', (t) =>
  t.field({
    type: ShipmentType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')

      const result = await getShipment(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
        },
        ctx.principal.userId,
        String(args.id),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return toGraphQLShipment(result.shipment)
    },
  }),
)

builder.queryField('shipmentForCarrier', (t) =>
  t.field({
    type: ShipmentType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await getShipmentForCarrier(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          proposalRepo: ctx.repos.proposalRepo,
        },
        ctx.principal.userId,
        String(args.id),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return toGraphQLShipment(result.shipment)
    },
  }),
)
