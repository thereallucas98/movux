import { getMyQueueEntry, listMyQueueEntries } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { toGraphQLBrowseShipment } from '../types/browse-shipment.type'
import {
  CarrierQueueEntryConnectionType,
  QueueEntryType,
} from '../types/queue-entry.type'

builder.queryField('myQueueEntry', (t) =>
  t.field({
    type: QueueEntryType,
    nullable: true,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await getMyQueueEntry(
        {
          queueRepo: ctx.repos.proposalQueueRepo,
          proposalRepo: ctx.repos.proposalRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      // NOT_FOUND é estado esperado ("ainda não entrou na fila"), não erro
      if (!result.success) return null

      return result.entry
    },
  }),
)

builder.queryField('myProposals', (t) =>
  t.field({
    type: CarrierQueueEntryConnectionType,
    args: {
      cursor: t.arg.id(),
      limit: t.arg.int(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await listMyQueueEntries(
        ctx.repos.proposalQueueRepo,
        ctx.principal.userId,
        {
          cursor: args.cursor ? String(args.cursor) : undefined,
          limit: args.limit ?? undefined,
        },
      )

      return {
        data: result.data.map((row) => ({
          ...row,
          shipment: toGraphQLBrowseShipment(row.shipment),
        })),
        nextCursor: result.nextCursor,
      }
    },
  }),
)
