import { browseOpenShipments } from '~/server/use-cases'
import { builder } from '../builder'
import { ShipmentTypeEnum } from '../enums/shipment.enum'
import { gqlError } from '../errors'
import {
  BrowseShipmentConnectionType,
  toGraphQLBrowseShipment,
} from '../types/browse-shipment.type'

builder.queryField('browseShipments', (t) =>
  t.field({
    type: BrowseShipmentConnectionType,
    args: {
      cityId: t.arg.id(),
      type: t.arg({ type: ShipmentTypeEnum }),
      cursor: t.arg.id(),
      limit: t.arg.int(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await browseOpenShipments(ctx.repos.shipmentRepo, {
        cityId: args.cityId ? String(args.cityId) : undefined,
        type: args.type ?? undefined,
        cursor: args.cursor ? String(args.cursor) : undefined,
        limit: args.limit ?? undefined,
      })

      return {
        data: result.data.map(toGraphQLBrowseShipment),
        nextCursor: result.nextCursor,
      }
    },
  }),
)
